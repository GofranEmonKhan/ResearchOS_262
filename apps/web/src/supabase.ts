import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' ? process.env : {}) as any;

const supabaseUrl = env?.VITE_SUPABASE_URL || 'https://bnupwgefsxjbaxasptjy.supabase.co';
const supabasePublishableKey = env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1WP4GkxxPN-fJYvMxFvxLg_L006rTWB';

/**
 * Browser-side Supabase client initialized with Publishable Key.
 * RESTRICTED PER AGENTS.MD:
 * Only used for:
 * 1. Supabase Auth (signUp, signInWithPassword, signInWithOAuth, signOut, resetPasswordForEmail)
 * 2. Supabase Storage uploads (e.g. faculty verification document uploads)
 * 3. Realtime subscriptions
 *
 * Normal business CRUD goes through Express API endpoints.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
