# PMC QR Check-in

Organizer-only web app for checking attendees into the active PMC event, by scanning their member QR code or manually from the attendee list.

The frontend is complete and runs on mock data. The backend work left is listed under [Backend handoff](#backend-handoff).

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

With no Supabase values set, dev mode skips sign-in and opens straight to the home screen.

To test the scanner on a phone (phone browsers only allow the camera over HTTPS):

```bash
npm run dev:phone    # prints an https://192.168.x.x:5173 address
```

Open that address on a phone on the same Wi-Fi and accept the self-signed certificate warning. Then open `/dev/qr` on a laptop: it shows a QR code for every mock attendee, labelled with the result each one should give.

Other scripts: `npm run check` (lint and type-check), `npm run build`, `npm run format`.

## Stack

Same as `pmc-portal-fe`: Vite, React 19, TypeScript, Tailwind v4, react-router-dom v7, react-icons. Colour tokens and Poppins match the portal's `index.css`. Scanning uses `qr-scanner`.

## Screens

| Route                    | File                            | What it does                                    |
| ------------------------ | ------------------------------- | ----------------------------------------------- |
| `/login`                 | `src/pages/Login.tsx`           | Google sign-in                                  |
| `/`                      | `src/pages/Home.tsx`            | Active event name and the Check-in button       |
| `/scan`                  | `src/pages/Scan.tsx`            | Camera QR scanner                               |
| `/scan/result`           | `src/pages/ScanResult.tsx`      | Green check or red X with the reason            |
| `/attendees`             | `src/pages/Attendees.tsx`       | Checked-in count, search, list with check icons |
| `/attendees/:attendeeId` | `src/pages/AttendeeProfile.tsx` | Profile and manual check-in with confirmation   |
| `/dev/qr`                | `src/pages/DevQrCodes.tsx`      | Test QR codes, dev mode only                    |

## Backend handoff

### 1. Implement `CheckInService`

Every backend call the UI makes goes through one interface, `src/service/CheckInService.ts`. Write a class that implements it and construct it in `src/service/index.ts` in place of `MockCheckInService`. No page or component needs to change.

| Method                        | Returns               | Notes                                               |
| ----------------------------- | --------------------- | --------------------------------------------------- |
| `getActiveEvent()`            | `ActiveEvent \| null` | The event flagged active, or null                   |
| `getAttendees(eventId)`       | `Attendee[]`          | Accepted attendees for the event, checked in or not |
| `getAttendee(attendeeId)`     | `Attendee \| null`    | One attendee for the profile page                   |
| `checkInByQr(qrValue)`        | `CheckInResult`       | `qrValue` is the raw scanned text                   |
| `checkInManually(attendeeId)` | `CheckInResult`       | Same rules as the QR path                           |

Types are in `src/types/index.ts`. `Attendee` is an `Attendee` row joined with its `User` row, in camelCase.

Check-in methods return expected failures instead of throwing: `{ ok: false, reason }`, where `reason` is one of `ALREADY_CHECKED_IN`, `NOT_REGISTERED`, `NOT_ACCEPTED`, `INVALID_CODE`, `NO_ACTIVE_EVENT`, `ERROR`. Include `attendee` in a failure when the person is known, so the result screen can show their name. `MockCheckInService.ts` is a working reference for the rules.

### 2. Schema changes needed

The current schema (`pmc-portal-be/src/schema/v2/database.types.ts`) is missing two things:

- **Active event flag.** `Event` has no such column. For example, `is_checkin_active boolean default false`, or a row in `Portal_Settings` holding the active `event_id`.
- **Per-event check-in.** `Attendee` is already one row per user per event, so add `checked_in boolean default false` and `checked_in_at timestamptz` there. Keeping it off `User` is what stops a check-in carrying over to the next event.

### 3. QR code value

Members sign in to the portal with Auth0, not Supabase auth, so there is no Supabase auth id for them. The QR code should encode `User.user_id` (the Auth0 id, for example `google-oauth2|1234`), which is what `Attendee.user_id` references. The scanner passes the scanned text to `checkInByQr` untouched.

Generating and showing the member's QR code belongs in `pmc-portal-fe`. This repo only has the dev test page.

### 4. Which statuses can check in

`ATTENDEE_STATUS` is `FAILED | PROCESSING | APPLIED | REGISTERED | ACCEPTED`. The mock treats only `ACCEPTED` as allowed in the list and at check-in. Change that if `REGISTERED` should count too.

### 5. Authenticating backend calls

The organizer's Supabase session is the credential. `src/config/supabase.ts` exports the client (null when the env values are missing):

- Calling Supabase directly: use that client. Requests carry the organizer's session automatically, so row-level security can key on it.
- Calling `pmc-portal-be`: get the token with `(await supabase.auth.getSession()).data.session?.access_token` and send it as `Authorization: Bearer <token>`, the same way `admin-portal` does.

### 6. Testing against real data

`/dev/qr` only shows codes for the mock attendees. Once the real service is in, test with a QR code that encodes a real `User.user_id` (any QR generator works until the portal shows member codes). The case to confirm before the event: a check-in for the active event must not show up as checked in for any other event.

### 7. Not built

- Undoing a check-in. A mistaken one has to be reset in Supabase.
- Live updates. The attendee list and count load when the page opens and after each manual check-in on that device; another organizer's check-ins appear on the next page load.

## Sign-in

Sign-in is Supabase Google OAuth (`src/providers/AuthProvider.tsx`). An account is let in only if its email ends with `@ubcpmc.com` (`src/config/access.ts`). Anyone else is signed straight back out with a message.

The PMC Supabase project also enforces this on its side: the `restrict_admin_signups` auth hook rejects account creation for any email outside `@ubcpmc.com`.

Already set up for the PMC Supabase project (`dthvbanipvldaiabgvuc`):

- The Google provider is enabled in Supabase, using the OAuth client named "PMC Check-in" in the `ubc-pmc-portal` Google Cloud project.
- `http://localhost:5173` is in Supabase's redirect URLs and in the OAuth client's authorized JavaScript origins, so sign-in works in local dev.

To run with sign-in locally, copy `.env.example` to `.secret/.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLIC_KEY` (same values and names as `admin-portal/.env`). `.secret` is gitignored.

**The email check in this app is a UI gate only.** The data itself has to be protected on the backend: the row-level security policies (or API middleware) for attendee data and check-in writes must only allow PMC organizers. Otherwise any account that can sign in to Supabase can call it directly.

### Why there is no emergency allowlist

An allowlist for non-PMC emails was built and then removed. `restrict_admin_signups` blocks those sign-ups before the app sees them, and it cannot safely be loosened: the admin API (`/v2/admin` in `pmc-portal-be`) accepts any valid Supabase account, so that hook is what keeps non-execs out of it. Revisit only after the admin API checks `Admin_Allowlist` itself.

## Deploying

The app is not deployed yet. It is a static site: `npm run build` writes it to `dist/`.

1. **Set the env values at build time.** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLIC_KEY` are baked into the build, so they must be set where the build runs. A production build without them shows a sign-in screen that cannot sign anyone in.
2. **Serve over HTTPS.** Phone browsers block the camera on plain HTTP.
3. **Send every path to `index.html`.** Routing is client-side, so a reload on `/attendees` must return the app, not a 404.
4. **Register the deployed address in two places, or sign-in fails there:**
    - Supabase → Authentication → URL Configuration → Redirect URLs.
    - Google Cloud → `ubc-pmc-portal` → APIs & Services → Credentials → "PMC Check-in" → Authorized JavaScript origins.
