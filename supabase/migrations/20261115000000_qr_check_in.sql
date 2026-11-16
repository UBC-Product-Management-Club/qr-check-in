-- QR check-in -------------------------------------------------------------------
--
-- Everything the check-in app (qr-check-in) needs, called straight from the
-- browser with the organizer's Supabase session:
--
--   Event      is_checkin_active   the one event the app is checking people into
--   Attendee   checked_in_at       when they were checked in; empty means not yet.
--                                  On the attendee row, so it is per event and
--                                  never carries over to the next one
--              checked_in_by       the organizer's email
--
--   checkin_active_event   the active event, or null
--   checkin_attendees      everyone with a seat at an event, checked in or not
--   checkin_attendee       one attendee, for the profile page
--   checkin_by_qr          check in from a scanned code (the code is User.user_id)
--   checkin_manual         check in from the attendee list
--
-- Who may call them: a signed-in Supabase account with an @ubcpmc.com email.
-- Each function checks that itself and runs as its owner, so the app needs no
-- table grants or row-level security policies of its own.
--
-- Who can be checked in: status REGISTERED only (the seat rule the rest of the
-- portal uses). ACCEPTED means accepted but not paid yet.
--
-- Turn an event on (only one can be on at a time; turn the old one off first):
--   update "Event" set is_checkin_active = true where event_id = '<event id>';
-- Undo a mistaken check-in:
--   update "Attendee" set checked_in_at = null, checked_in_by = null where attendee_id = '<attendee id>';
--
-- Hand-run in the Supabase SQL Editor (staging first). Safe to re-run.
-- -----------------------------------------------------------------------------

alter table "Event"
  add column if not exists is_checkin_active boolean not null default false;

-- At most one event is active
create unique index if not exists event_one_checkin_active
  on "Event" (is_checkin_active) where is_checkin_active;

alter table "Attendee"
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_in_by text;

-- Helpers ------------------------------------------------------------------------

-- The caller's email if they are a PMC organizer, or NOT_AUTHORIZED
create or replace function checkin_organizer_email()
returns text language plpgsql stable as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_email not like '%@ubcpmc.com' then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  return v_email;
end $$;

-- The app's Attendee shape (src/types/index.ts), or null if the id is unknown
create or replace function checkin_attendee_json(p_attendee_id uuid)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'attendeeId',  a.attendee_id,
    'userId',      a.user_id,
    'eventId',     a.event_id,
    'firstName',   u.first_name,
    'lastName',    u.last_name,
    'email',       u.email,
    'pronouns',    u.pronouns,
    'university',  u.university,
    'faculty',     u.faculty,
    'major',       u.major,
    'year',        u.year,
    'status',      a.status,
    'checkedIn',   a.checked_in_at is not null,
    'checkedInAt', a.checked_in_at)
  from "Attendee" a join "User" u on u.user_id = a.user_id
  where a.attendee_id = p_attendee_id;
$$;

-- The one place the rules live. Locks the row, so two organizers scanning the
-- same person get one success and one ALREADY_CHECKED_IN.
create or replace function checkin_apply(p_attendee_id uuid, p_by text)
returns jsonb language plpgsql as $$
declare
  v_attendee "Attendee";
  v_reason text;
begin
  select * into v_attendee from "Attendee" where attendee_id = p_attendee_id for update;
  if v_attendee.status is distinct from 'REGISTERED' then
    v_reason := 'NOT_ACCEPTED';
  elsif v_attendee.checked_in_at is not null then
    v_reason := 'ALREADY_CHECKED_IN';
  else
    update "Attendee" set checked_in_at = now(), checked_in_by = p_by where attendee_id = p_attendee_id;
    return jsonb_build_object('ok', true, 'attendee', checkin_attendee_json(p_attendee_id));
  end if;
  return jsonb_build_object('ok', false, 'reason', v_reason, 'attendee', checkin_attendee_json(p_attendee_id));
end $$;

-- Called by the app -----------------------------------------------------------------

create or replace function checkin_active_event()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform checkin_organizer_email();
  return (select jsonb_build_object('eventId', event_id, 'name', name,
                                    'date', start_time, 'location', location)
          from "Event" where is_checkin_active);
end $$;

create or replace function checkin_attendees(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform checkin_organizer_email();
  return (select coalesce(jsonb_agg(checkin_attendee_json(attendee_id)), '[]'::jsonb)
          from "Attendee" where event_id = p_event_id and status = 'REGISTERED');
end $$;

create or replace function checkin_attendee(p_attendee_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform checkin_organizer_email();
  return checkin_attendee_json(p_attendee_id);
end $$;

-- Returns { ok: true, attendee } or { ok: false, reason, attendee? } with reason
-- NO_ACTIVE_EVENT, INVALID_CODE (no such user), NOT_REGISTERED (no application
-- for the active event), NOT_ACCEPTED (applied but no seat) or ALREADY_CHECKED_IN
create or replace function checkin_by_qr(p_qr text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_by text := checkin_organizer_email();
  v_user_id text := btrim(p_qr, E' \t\r\n');
  v_event_id uuid;
  v_attendee_id uuid;
begin
  select event_id into v_event_id from "Event" where is_checkin_active;
  if v_event_id is null then
    return jsonb_build_object('ok', false, 'reason', 'NO_ACTIVE_EVENT');
  end if;

  select attendee_id into v_attendee_id from "Attendee"
  where event_id = v_event_id and user_id = v_user_id;
  if v_attendee_id is null then
    return jsonb_build_object('ok', false, 'reason',
      case when exists (select 1 from "User" where user_id = v_user_id)
           then 'NOT_REGISTERED' else 'INVALID_CODE' end);
  end if;

  return checkin_apply(v_attendee_id, v_by);
end $$;

-- Same rules and result as checkin_by_qr. An attendee row for another event is
-- NOT_REGISTERED: only the active event can be checked into.
create or replace function checkin_manual(p_attendee_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_by text := checkin_organizer_email();
  v_event_id uuid;
begin
  select event_id into v_event_id from "Event" where is_checkin_active;
  if v_event_id is null then
    return jsonb_build_object('ok', false, 'reason', 'NO_ACTIVE_EVENT');
  end if;

  if not exists (select 1 from "Attendee" where attendee_id = p_attendee_id and event_id = v_event_id) then
    return jsonb_build_object('ok', false, 'reason', 'NOT_REGISTERED');
  end if;

  return checkin_apply(p_attendee_id, v_by);
end $$;

-- Supabase lets every role run new functions by default: close them all, then
-- open the five the app calls to signed-in accounts
revoke execute on function
  checkin_organizer_email, checkin_attendee_json, checkin_apply,
  checkin_active_event, checkin_attendees, checkin_attendee, checkin_by_qr, checkin_manual
  from public, anon, authenticated;
grant execute on function
  checkin_active_event, checkin_attendees, checkin_attendee, checkin_by_qr, checkin_manual
  to authenticated;

-- So the API sees the new functions without a restart
notify pgrst, 'reload schema';
