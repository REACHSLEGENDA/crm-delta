// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('WARNING: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Real Supabase client cannot be initialized properly.');
}

// Export actual Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getSupabaseMode = () => 'PROD';
export const isRealSupabase = true;
