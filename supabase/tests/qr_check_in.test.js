// Runs the check-in migration against an in-process Postgres (PGlite), the same
// way pmc-portal-be tests its migrations. Run with: npm run test:sql
import fs from 'node:fs';
import assert from 'node:assert';
import { PGlite } from '@electric-sql/pglite';

const MIGRATION = new URL('../migrations/20261115000000_qr_check_in.sql', import.meta.url);

const PJ = '11111111-1111-1111-1111-111111111111';
const NEXT = '22222222-2222-2222-2222-222222222222';
const ORGANIZER = 'ege@ubcpmc.com';

// A minimal copy of the tables as they are before this migration, plus the
// parts of Supabase the functions rely on (the roles and auth.jwt()).
async function fresh() {
    const db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create function auth.jwt() returns jsonb language sql stable as
        $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      grant usage on schema auth to anon, authenticated;
      create type "ATTENDEE_STATUS" as enum ('APPLIED','ACCEPTED','PROCESSING','REGISTERED','REJECTED','FAILED');
      create table "User" (
        user_id varchar primary key, first_name text not null, last_name text not null, email text not null,
        pronouns text, university text, faculty text, major text, year text);
      create table "Event" (
        event_id uuid primary key, name text not null, location text, start_time timestamptz);
      create table "Attendee" (
        attendee_id uuid primary key default gen_random_uuid(), user_id varchar not null references "User",
        event_id uuid not null references "Event", event_form_answers jsonb, status "ATTENDEE_STATUS");
      create unique index attendee_event_user_key on "Attendee" (event_id, user_id);
    `);
    await db.exec(fs.readFileSync(MIGRATION, 'utf8'));
    await db.exec(`
      insert into "Event" (event_id, name, location, start_time, is_checkin_active) values
        ('${PJ}', 'Project Jackpot', 'UBC', '2026-11-21T17:00:00Z', true),
        ('${NEXT}', 'Next Event', null, null, false);
      insert into "User" (user_id, first_name, last_name, email, year) values
        ('google-oauth2|1', 'Zed', 'Young', 'zed@example.com', '3'),
        ('google-oauth2|2', 'amy', 'Able', 'amy@example.com', null),
        ('auth0|3', 'Paid', 'Late', 'late@example.com', null),
        ('auth0|4', 'No', 'Application', 'none@example.com', null);
      insert into "Attendee" (user_id, event_id, status) values
        ('google-oauth2|1', '${PJ}', 'REGISTERED'), ('google-oauth2|1', '${NEXT}', 'REGISTERED'),
        ('google-oauth2|2', '${PJ}', 'REGISTERED'),
        ('auth0|3', '${PJ}', 'ACCEPTED');`);
    return db;
}

// Calls a function the way the app does: as the authenticated role, with the
// signed-in account's email in the token.
async function call(db, sql, params = [], email = ORGANIZER) {
    await db.exec(`set role authenticated`);
    await db.query(`select set_config('request.jwt.claims', $1, false)`, [
        JSON.stringify({ email }),
    ]);
    try {
        return (await db.query(`select ${sql} as result`, params)).rows[0].result;
    } finally {
        await db.exec(`reset role`);
    }
}
const scan = (db, code, email) => call(db, 'checkin_by_qr($1)', [code], email);
const attendeeId = async (db, userId, eventId = PJ) =>
    (
        await db.query(`select attendee_id from "Attendee" where user_id = $1 and event_id = $2`, [
            userId,
            eventId,
        ])
    ).rows[0].attendee_id;
const fails = async (p, text) => {
    try {
        await p;
    } catch (e) {
        assert.ok(e.message.includes(text), `expected ${text}, got ${e.message}`);
        return;
    }
    assert.fail(`expected ${text}`);
};

const tests = {
    async 'returns the active event, or null when none is on'() {
        const db = await fresh();
        const event = await call(db, 'checkin_active_event()');
        assert.deepEqual(
            [event.eventId, event.name, event.location],
            [PJ, 'Project Jackpot', 'UBC']
        );
        assert.equal(new Date(event.date).toISOString(), '2026-11-21T17:00:00.000Z');
        await db.exec(`update "Event" set is_checkin_active = false`);
        assert.equal(await call(db, 'checkin_active_event()'), null);
    },
    async 'only one event can be active'() {
        const db = await fresh();
        await fails(
            db.exec(`update "Event" set is_checkin_active = true where event_id = '${NEXT}'`),
            'event_one_checkin_active'
        );
    },
    async 'lists only people with a seat, in the app shape'() {
        const db = await fresh();
        const list = await call(db, 'checkin_attendees($1)', [PJ]);
        assert.deepEqual(list.map((a) => a.firstName).sort(), ['Zed', 'amy']);
        assert.deepEqual(
            list.find((a) => a.firstName === 'Zed'),
            {
                attendeeId: await attendeeId(db, 'google-oauth2|1'),
                userId: 'google-oauth2|1',
                eventId: PJ,
                firstName: 'Zed',
                lastName: 'Young',
                email: 'zed@example.com',
                pronouns: null,
                university: null,
                faculty: null,
                major: null,
                year: '3',
                status: 'REGISTERED',
                checkedIn: false,
                checkedInAt: null,
            }
        );
        assert.deepEqual(
            await call(db, 'checkin_attendees($1)', ['33333333-3333-3333-3333-333333333333']),
            []
        );
    },
    async 'a scan checks in once, then says already checked in'() {
        const db = await fresh();
        const first = await scan(db, '  google-oauth2|1\n');
        assert.equal(first.ok, true);
        assert.equal(first.attendee.checkedIn, true);
        assert.ok(first.attendee.checkedInAt);
        const second = await scan(db, 'google-oauth2|1');
        assert.deepEqual(
            [second.ok, second.reason, second.attendee.firstName],
            [false, 'ALREADY_CHECKED_IN', 'Zed']
        );
        const row = (
            await db.query(`select checked_in_by from "Attendee" where attendee_id = $1`, [
                first.attendee.attendeeId,
            ])
        ).rows[0];
        assert.equal(row.checked_in_by, ORGANIZER);
    },
    async 'a check-in never carries over to another event'() {
        const db = await fresh();
        await scan(db, 'google-oauth2|1');
        const other = await call(db, 'checkin_attendees($1)', [NEXT]);
        assert.deepEqual(
            other.map((a) => [a.firstName, a.checkedIn]),
            [['Zed', false]]
        );
        // Switch events: the same code works again, for the new event only
        await db.exec(
            `update "Event" set is_checkin_active = false; update "Event" set is_checkin_active = true where event_id = '${NEXT}'`
        );
        assert.equal((await scan(db, 'google-oauth2|1')).ok, true);
        assert.deepEqual(await scan(db, 'google-oauth2|2'), {
            ok: false,
            reason: 'NOT_REGISTERED',
        });
    },
    async 'scan failures name the reason'() {
        const db = await fresh();
        const unpaid = await scan(db, 'auth0|3');
        assert.deepEqual(
            [unpaid.ok, unpaid.reason, unpaid.attendee.status],
            [false, 'NOT_ACCEPTED', 'ACCEPTED']
        );
        assert.deepEqual(await scan(db, 'auth0|4'), { ok: false, reason: 'NOT_REGISTERED' });
        assert.deepEqual(await scan(db, 'https://example.com'), {
            ok: false,
            reason: 'INVALID_CODE',
        });
        assert.deepEqual(await scan(db, ''), { ok: false, reason: 'INVALID_CODE' });
        await db.exec(`update "Event" set is_checkin_active = false`);
        assert.deepEqual(await scan(db, 'google-oauth2|1'), {
            ok: false,
            reason: 'NO_ACTIVE_EVENT',
        });
        const checkedIn = (
            await db.query(
                `select count(*)::int as n from "Attendee" where checked_in_at is not null`
            )
        ).rows[0].n;
        assert.equal(checkedIn, 0);
    },
    async 'manual check-in follows the same rules'() {
        const db = await fresh();
        const amy = await attendeeId(db, 'google-oauth2|2');
        assert.equal((await call(db, 'checkin_manual($1)', [amy])).ok, true);
        assert.equal((await call(db, 'checkin_manual($1)', [amy])).reason, 'ALREADY_CHECKED_IN');
        assert.equal((await call(db, 'checkin_attendee($1)', [amy])).checkedIn, true);
        assert.equal(
            (await call(db, 'checkin_manual($1)', [await attendeeId(db, 'auth0|3')])).reason,
            'NOT_ACCEPTED'
        );
        // A row for an event that is not the active one
        const other = await attendeeId(db, 'google-oauth2|1', NEXT);
        assert.deepEqual(await call(db, 'checkin_manual($1)', [other]), {
            ok: false,
            reason: 'NOT_REGISTERED',
        });
        assert.equal((await call(db, 'checkin_attendee($1)', [other])).checkedIn, false);
        assert.deepEqual(
            await call(db, 'checkin_manual($1)', ['33333333-3333-3333-3333-333333333333']),
            { ok: false, reason: 'NOT_REGISTERED' }
        );
        assert.equal(
            await call(db, 'checkin_attendee($1)', ['33333333-3333-3333-3333-333333333333']),
            null
        );
    },
    async 'only @ubcpmc.com accounts get in'() {
        const db = await fresh();
        for (const email of ['someone@gmail.com', 'x@ubcpmc.com.evil.com', 'ubcpmc.com', '']) {
            await fails(call(db, 'checkin_active_event()', [], email), 'NOT_AUTHORIZED');
            await fails(call(db, 'checkin_attendees($1)', [PJ], email), 'NOT_AUTHORIZED');
            await fails(scan(db, 'google-oauth2|1', email), 'NOT_AUTHORIZED');
        }
        assert.equal((await scan(db, 'google-oauth2|1', 'Ege@UBCPMC.com')).ok, true);
    },
    async 'signed-out callers, and the helpers, are closed off'() {
        const db = await fresh();
        await db.exec(`set role anon`);
        await fails(db.query(`select checkin_active_event()`), 'permission denied');
        await fails(db.query(`select checkin_by_qr('google-oauth2|1')`), 'permission denied');
        await db.exec(`reset role`);
        const zed = await attendeeId(db, 'google-oauth2|1');
        await db.exec(`set role authenticated`);
        await fails(db.query(`select checkin_apply($1, 'x')`, [zed]), 'permission denied');
        await fails(db.query(`select * from "Attendee"`), 'permission denied');
        await db.exec(`reset role`);
    },
    async 'the migration can be run twice'() {
        const db = await fresh();
        await scan(db, 'google-oauth2|1');
        await db.exec(fs.readFileSync(MIGRATION, 'utf8'));
        assert.equal((await scan(db, 'google-oauth2|1')).reason, 'ALREADY_CHECKED_IN');
    },
};

let failed = 0;
for (const [name, test] of Object.entries(tests)) {
    try {
        await test();
        console.log(`ok    ${name}`);
    } catch (error) {
        failed += 1;
        console.log(`FAIL  ${name}\n      ${error.message}`);
    }
}
console.log(`\n${Object.keys(tests).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
