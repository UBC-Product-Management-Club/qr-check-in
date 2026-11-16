# PMC QR Check-in

Organizer-only web app for checking attendees into the active PMC event, by scanning their member QR code or manually from the attendee list.

With Supabase env values set, the app runs on real data through the database functions described under [Backend](#backend). Without them it runs on mock data with sign-in skipped.

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

Open that address on a phone on the same Wi-Fi and accept the self-signed certificate warning. Then open `/dev/qr` on a laptop: it shows a QR code for every mock attendee, labelled with the result each one should give. Those codes only match the mock data; against a real database, see [Testing against real data](#testing-against-real-data).

Other scripts: `npm run check` (lint and type-check), `npm run test:sql` (the migration, in an in-process Postgres), `npm run build`, `npm run format`.

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

## Backend

The app calls Supabase directly. There is no API server in between and nothing to deploy in `pmc-portal-be`.

`src/service/index.ts` picks the service: `SupabaseCheckInService` when the Supabase env values are set, `MockCheckInService` otherwise. Both implement `CheckInService`, the only interface the pages use.

### Setup, once per Supabase project

1. Run `supabase/migrations/20261115000000_qr_check_in.sql` in the Supabase SQL Editor, staging first, then production. It is safe to re-run.
2. Turn the event on:

    ```sql
    update "Event" set is_checkin_active = true where event_id = '<event id>';
    ```

    Only one event can be on at a time; the database refuses a second. Turn the old one off first (`set is_checkin_active = false`).

The migration follows the conventions of `pmc-portal-be/supabase/migrations` and should be copied there so it sits with the others, followed by `scripts/gen_types.sh`.

### What the migration adds

An active-event flag on `Event`, check-in columns on `Attendee`, and the five `checkin_*` functions the app calls. The header of the migration file lists each one.

`Attendee` is one row per user per event, so a check-in belongs to that event only and never carries over to the next.

### Who can be checked in

Only attendees with status `REGISTERED`, the same seat rule the rest of the portal uses. On a reviewed event `ACCEPTED` means accepted but not paid yet, so those people are not in the list and scanning them fails with `NOT_ACCEPTED` ("No seat" on screen). To change the rule, edit the two `'REGISTERED'` checks in the migration and `SEAT_STATUS` in `src/types/index.ts`.

### Who can call the functions

A signed-in Supabase account whose email ends with `@ubcpmc.com`. Each function checks the caller's token itself and runs with its owner's rights, so the app needs no table grants or row-level security policies. Signed-out callers cannot run them at all.

### QR code value

The code encodes `User.user_id` (the Auth0 id, for example `google-oauth2|1234`), which is what `Attendee.user_id` references. Members sign in to the portal with Auth0, not Supabase auth, so there is no Supabase auth id for them. It is the same code for every event; whether it works depends on the member having a seat at the active event.

Generating and showing the member's QR code belongs in `pmc-portal-fe` and is not built yet. This repo only has the dev test page.

### Testing against real data

Make a QR code that encodes a real `User.user_id` (any QR generator works until the portal shows member codes) and scan it. The case to confirm before the event: a check-in for the active event must not show up as checked in for any other event. `npm run test:sql` covers that and the other rules against an in-process Postgres.

### Not built

- Undoing a check-in from the app. Reset a mistaken one in Supabase:

    ```sql
    update "Attendee" set checked_in_at = null, checked_in_by = null where attendee_id = '<attendee id>';
    ```

- Live updates. The attendee list and count load when the page opens and after each manual check-in on that device; another organizer's check-ins appear on the next page load.

## Sign-in

Sign-in is Supabase Google OAuth (`src/providers/AuthProvider.tsx`). An account is let in only if its email ends with `@ubcpmc.com` (`src/config/access.ts`). Anyone else is signed straight back out with a message.

The PMC Supabase project also enforces this on its side: the `restrict_admin_signups` auth hook rejects account creation for any email outside `@ubcpmc.com`.

Already set up for the PMC Supabase project (`dthvbanipvldaiabgvuc`):

- The Google provider is enabled in Supabase, using the OAuth client named "PMC Check-in" in the `ubc-pmc-portal` Google Cloud project.
- `http://localhost:5173` is in Supabase's redirect URLs and in the OAuth client's authorized JavaScript origins, so sign-in works in local dev.

To run with sign-in locally, copy `.env.example` to `.secret/.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLIC_KEY` (same values and names as `admin-portal/.env`). `.secret` is gitignored.

The email check in this app is a UI gate only. The data is protected by the database functions, which make the same check on the caller's token (see [Who can call the functions](#who-can-call-the-functions)).

### Why there is no emergency allowlist

An allowlist for non-PMC emails was built and then removed. `restrict_admin_signups` blocks those sign-ups before the app sees them, and it cannot safely be loosened: the admin API (`/v2/admin` in `pmc-portal-be`) accepts any valid Supabase account, so that hook is what keeps non-execs out of it. Revisit only after the admin API checks `Admin_Allowlist` itself.

## Deploying

The app is not deployed yet. It is a static site served from a container on Cloud Run, set up the same way as `pmc-portal-fe`: `.github/workflows/deploy.yaml` builds the `Dockerfile` with Cloud Build and deploys it.

- A push to `main` deploys **staging**.
- **Production** is deployed by hand: Actions → Deploy to Cloud Run → Run workflow.

### One-time setup

1. **Create two GitHub environments** on this repo, `staging` and `production`, each with these secrets:

    | Secret                | Value                                                                   |
    | --------------------- | ----------------------------------------------------------------------- |
    | `PROJECT_ID`          | The Google Cloud project, same as `pmc-portal-fe`                       |
    | `GCLOUD_AUTH`         | The deploy service account key, same as `pmc-portal-fe`                 |
    | `APP_NAME`            | The Cloud Run service name, different for each environment              |
    | `SUPABASE_URL`        | That environment's Supabase project URL                                 |
    | `SUPABASE_PUBLIC_KEY` | That environment's Supabase publishable key (as in `admin-portal/.env`) |

2. **Run the migration** on that environment's Supabase project and turn the event on (see [Setup](#setup-once-per-supabase-project)).
3. **Deploy once**, then copy the service's address from the workflow log or the Cloud Run console.
4. **Register that address in two places, or sign-in fails there:**
    - Supabase → Authentication → URL Configuration → Redirect URLs.
    - Google Cloud → `ubc-pmc-portal` → APIs & Services → Credentials → "PMC Check-in" → Authorized JavaScript origins.

Google sign-in has only been set up on the Supabase project `dthvbanipvldaiabgvuc`. The other environment's project also needs the Google provider enabled (Authentication → Providers) with the same OAuth client, and that project's callback address added to the client's authorized redirect URIs.

### Things that have to stay true

- **The Supabase values are baked in at build time.** The workflow writes them to `.secret/.env` before the build and stops if either is missing. Setting them on the running container does nothing.
- **`.gcloudignore` must not list `.secret`.** Without that file gcloud falls back to `.gitignore` and leaves the env file out of the build.
- **HTTPS.** Phone browsers block the camera on plain HTTP. Cloud Run addresses are HTTPS.
- **Every path returns `index.html`.** Routing is client-side, so a reload on `/attendees` must return the app. `serve -s` in the `Dockerfile` does this.
