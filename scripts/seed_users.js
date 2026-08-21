import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GLOBAL_PASSWORD = process.env.SEED_USER_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !GLOBAL_PASSWORD) {
  throw new Error(
    'Define SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SEED_USER_PASSWORD antes de ejecutar este script.',
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: 'ejecutivo.4.tradingworld@gmail.com', firstName: 'Erick', lastName: 'Vallarta', role: 'SUPERADMIN', department: 'Ventas' },
  { email: 'veroramirezmat@gmail.com', firstName: 'Carlos', lastName: 'Ismael', role: 'AGENT', department: 'Ventas' },
  { email: 'michellegarciacaba@gmail.com', firstName: 'Matias', lastName: 'Villanueva', role: 'AGENT', department: 'Retencion' },
  { email: 'benjaminventassaenz@gmail.com', firstName: 'Julieta', lastName: 'Castillo', role: 'MANAGER', department: 'Ventas' },
  { email: 'margaritatalavera59@gmail.com', firstName: 'Paola', lastName: 'Chavez', role: 'AGENT', department: 'Ventas' },
];

async function upsertProfile(userId, user) {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    role: user.role,
    department: user.department,
    active: true,
  });
  if (error) throw error;
}

async function createUsers() {
  for (const user of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: GLOBAL_PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.role,
        department: user.department,
      },
    });

    if (!error && data.user) {
      await upsertProfile(data.user.id, user);
      console.log(`Usuario preparado: ${user.email}`);
      continue;
    }

    if (!error?.message.includes('already')) {
      console.error(`No se pudo crear ${user.email}: ${error?.message ?? 'error desconocido'}`);
      continue;
    }

    const { data: existing } = await supabase.auth.admin.listUsers();
    const existingUser = existing.users.find((item) => item.email === user.email);
    if (existingUser) await upsertProfile(existingUser.id, user);
  }
}

await createUsers();
