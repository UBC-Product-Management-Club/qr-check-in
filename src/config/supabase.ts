import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Same env names as admin-portal. Values live in .secret/.env (see .env.example).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publicKey = import.meta.env.VITE_SUPABASE_PUBLIC_KEY;

/** Null when the env values are missing, so the app can still run locally on mock data. */
export const supabase: SupabaseClient | null =
    supabaseUrl && publicKey ? createClient(supabaseUrl, publicKey) : null;
