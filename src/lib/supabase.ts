// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isValidUrl = supabaseUrl && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));
const safeUrl = isValidUrl ? supabaseUrl : 'https://placeholder-project-ref.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-anon-key';

if (!isValidUrl || !supabaseAnonKey) {
  console.error('ERROR: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables are missing or invalid. Please configure them in your hosting panel (e.g. Netlify/Vercel).');
}

// Export actual Supabase client
export const supabase = createClient(safeUrl, safeKey);

export const getSupabaseMode = () => 'PROD';
export const isRealSupabase = !!isValidUrl;

