import type { ActiveEvent, Attendee, CheckInResult } from '../types';

/**
 * Every backend call the UI makes. The UI only ever talks to this interface,
 * so swapping the mock for the real backend happens in `src/service/index.ts`
 * and nowhere else.
 */
export interface CheckInService {
    /** The event flagged active in Supabase, or null if none is. */
    getActiveEvent(): Promise<ActiveEvent | null>;

    /**
     * Everyone accepted for the event, checked in or not.
     * The list page derives the checked-in count from `checkedIn` on these rows.
     */
    getAttendees(eventId: string): Promise<Attendee[]>;

    /** One attendee for the profile page, or null if the id is unknown. */
    getAttendee(attendeeId: string): Promise<Attendee | null>;

    /**
     * Check in from a scanned QR code. `qrValue` is the raw scanned text,
     * expected to be `User.user_id`. Verifies the user is accepted for the
     * active event before marking them checked in.
     *
     * Expected failures are returned as `{ ok: false, reason }`, not thrown.
     */
    checkInByQr(qrValue: string): Promise<CheckInResult>;

    /** Check in from the profile page. Same rules and result shape as `checkInByQr`. */
    checkInManually(attendeeId: string): Promise<CheckInResult>;
}
