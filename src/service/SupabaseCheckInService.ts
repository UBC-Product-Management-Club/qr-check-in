import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActiveEvent, Attendee, CheckInResult } from '../types';
import type { CheckInService } from './CheckInService';

/**
 * The real backend: the `checkin_*` database functions in
 * supabase/migrations/20261115000000_qr_check_in.sql, called with the signed-in
 * organizer's session. The rules live in those functions, and they return the
 * app's types as JSON, so nothing is mapped here. A network or server failure
 * throws; the pages show it as an error.
 */
export class SupabaseCheckInService implements CheckInService {
    constructor(private readonly client: SupabaseClient) {}

    getActiveEvent() {
        return this.call<ActiveEvent | null>('checkin_active_event');
    }

    getAttendees(eventId: string) {
        return this.call<Attendee[]>('checkin_attendees', { p_event_id: eventId });
    }

    getAttendee(attendeeId: string) {
        return this.call<Attendee | null>('checkin_attendee', { p_attendee_id: attendeeId });
    }

    checkInByQr(qrValue: string) {
        return this.call<CheckInResult>('checkin_by_qr', { p_qr: qrValue });
    }

    checkInManually(attendeeId: string) {
        return this.call<CheckInResult>('checkin_manual', { p_attendee_id: attendeeId });
    }

    private async call<T>(fn: string, args?: Record<string, string>): Promise<T> {
        const { data, error } = await this.client.rpc(fn, args);
        if (error) throw new Error(error.message);
        return data as T;
    }
}
