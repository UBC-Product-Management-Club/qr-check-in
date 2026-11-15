import type { CheckInService } from './CheckInService';
import { MockCheckInService } from './MockCheckInService';

// BACKEND HANDOFF: write a class that implements CheckInService against the real
// backend (Supabase directly, or the pmc-portal-be API) and construct it here.
// Nothing else in the app needs to change. See README.md, "Backend handoff".
export const checkInService: CheckInService = new MockCheckInService();

export type { CheckInService };
