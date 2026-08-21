import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY antes de ejecutar el diagnóstico.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profiles, error: profileError } = await supabase.from('profiles').select('id,role,department,active').limit(5);
console.log('Profiles:', profiles?.length ?? 0, profileError?.message ?? 'ok');

const suffix = randomBytes(8).toString('hex');
const { data, error } = await supabase.auth.admin.createUser({
  email: `delta-diagnostic-${suffix}@example.invalid`,
  password: randomBytes(24).toString('base64url'),
  email_confirm: true,
});
console.log('Admin user creation:', error?.message ?? 'ok');

if (data.user) {
  await supabase.auth.admin.deleteUser(data.user.id);
  console.log('Diagnostic user removed');
}
