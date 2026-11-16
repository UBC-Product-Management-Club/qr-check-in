import { SEAT_STATUS } from '../types';
import type { ActiveEvent, Attendee, CheckInResult } from '../types';
import type { CheckInService } from './CheckInService';
import { MOCK_ATTENDEES, MOCK_EVENT, MOCK_UNREGISTERED_USER_ID } from './mockData';

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * In-memory stand-in for the backend. Check-ins last until the page reloads.
 * It follows the same rules the real backend should enforce, so the UI can be
 * exercised end to end.
 */
export class MockCheckInService implements CheckInService {
    private attendees: Attendee[] = MOCK_ATTENDEES.map((attendee) => ({ ...attendee }));

    async getActiveEvent(): Promise<ActiveEvent | null> {
        await delay();
        return MOCK_EVENT;
    }

    async getAttendees(eventId: string): Promise<Attendee[]> {
        await delay();
        return this.attendees
            .filter((attendee) => attendee.eventId === eventId && attendee.status === SEAT_STATUS)
            .map((attendee) => ({ ...attendee }));
    }

    async getAttendee(attendeeId: string): Promise<Attendee | null> {
        await delay();
        const attendee = this.attendees.find((a) => a.attendeeId === attendeeId);
        return attendee ? { ...attendee } : null;
    }

    async checkInByQr(qrValue: string): Promise<CheckInResult> {
        await delay();
        const userId = qrValue.trim();
        const attendee = this.attendees.find(
            (a) => a.userId === userId && a.eventId === MOCK_EVENT.eventId
        );
        if (!attendee) {
            return {
                ok: false,
                reason: userId === MOCK_UNREGISTERED_USER_ID ? 'NOT_REGISTERED' : 'INVALID_CODE',
            };
        }
        return this.checkIn(attendee);
    }

    async checkInManually(attendeeId: string): Promise<CheckInResult> {
        await delay();
        const attendee = this.attendees.find((a) => a.attendeeId === attendeeId);
        if (!attendee) return { ok: false, reason: 'NOT_REGISTERED' };
        return this.checkIn(attendee);
    }

    private checkIn(attendee: Attendee): CheckInResult {
        if (attendee.status !== SEAT_STATUS) {
            return { ok: false, reason: 'NOT_ACCEPTED', attendee: { ...attendee } };
        }
        if (attendee.checkedIn) {
            return { ok: false, reason: 'ALREADY_CHECKED_IN', attendee: { ...attendee } };
        }
        attendee.checkedIn = true;
        attendee.checkedInAt = new Date().toISOString();
        return { ok: true, attendee: { ...attendee } };
    }
}
