import type { CheckInService } from './CheckInService';
import { supabase } from '../config/supabase';
import { MockCheckInService } from './MockCheckInService';
import { SupabaseCheckInService } from './SupabaseCheckInService';

// With Supabase env values set, the app talks to the real backend. Without them
// (local dev with sign-in skipped) it runs on mock data.
export const checkInService: CheckInService = supabase
    ? new SupabaseCheckInService(supabase)
    : new MockCheckInService();

export type { CheckInService };
