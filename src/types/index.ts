/** Mirrors the ATTENDEE_STATUS enum in Supabase. */
export type AttendeeStatus =
    'FAILED' | 'PROCESSING' | 'APPLIED' | 'REGISTERED' | 'ACCEPTED' | 'REJECTED';

/**
 * The one status that has a seat and can be checked in. ACCEPTED is not enough:
 * on a reviewed event it means accepted but not paid yet.
 */
export const SEAT_STATUS: AttendeeStatus = 'REGISTERED';

/** The one event the app is currently checking people into. */
export type ActiveEvent = {
    eventId: string;
    name: string;
    date: string | null;
    location: string | null;
};

/**
 * One person attending one event: an `Attendee` row joined with its `User` row.
 * `checkedIn` belongs to the Attendee row (per event), never to the User.
 */
export type Attendee = {
    attendeeId: string;
    /** `User.user_id` (the Auth0 id). This is the value encoded in the member's QR code. */
    userId: string;
    eventId: string;
    firstName: string;
    lastName: string;
    email: string;
    pronouns: string | null;
    university: string | null;
    faculty: string | null;
    major: string | null;
    year: string | null;
    status: AttendeeStatus;
    checkedIn: boolean;
    checkedInAt: string | null;
};

export type CheckInFailureReason =
    /** Already checked in for this event. */
    | 'ALREADY_CHECKED_IN'
    /** The user exists but has no Attendee row for the active event. */
    | 'NOT_REGISTERED'
    /** Has an Attendee row for the active event, but no seat (status is not REGISTERED). */
    | 'NOT_ACCEPTED'
    /** The QR value does not match any user. */
    | 'INVALID_CODE'
    /** No event is flagged active. */
    | 'NO_ACTIVE_EVENT'
    /** Network or server failure. */
    | 'ERROR';

export type CheckInResult =
    | { ok: true; attendee: Attendee }
    | { ok: false; reason: CheckInFailureReason; attendee?: Attendee };

export const fullName = (attendee: Pick<Attendee, 'firstName' | 'lastName'>) =>
    `${attendee.firstName} ${attendee.lastName}`.trim();
