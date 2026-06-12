-- seed.sql
-- Seed data for KOVEX CRM

-- Inserts into auth.users (local development)
-- We use helper functions or extensions if running in supabase environment,
-- otherwise we write simple insert statements.

-- Profiles will be created automatically by the trigger when users are created,
-- but since we want specific names and roles, we will insert them into profiles
-- (overwriting or using UPDATE, or disabling the trigger momentarily, or just inserting profiles directly for testing).

-- Let's populate the mock/seed profiles directly in profiles
-- (assuming users already exist, or for frontend simulation).
-- These profiles match the accounts:
-- 1. superadmin@kovex.net (role: SUPERADMIN, id: 00000000-0000-0000-0000-000000000001)
-- 2. manager@kovex.net (role: MANAGER, id: 00000000-0000-0000-0000-000000000002)
-- 3. agente1@kovex.net (role: AGENTE, id: 00000000-0000-0000-0000-000000000003)
-- 4. agente2@kovex.net (role: AGENTE, id: 00000000-0000-0000-0000-000000000004)
-- 5. supervisor@kovex.net (role: SUPERVISOR, id: 00000000-0000-0000-0000-000000000005)

-- Auth users seed
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'superadmin@kovex.net', crypt('Kovex2025!', gen_salt('bf')), now(), '{"full_name": "Diego Ramírez", "role": "SUPERADMIN"}'),
  ('00000000-0000-0000-0000-000000000002', 'manager@kovex.net', crypt('Kovex2025!', gen_salt('bf')), now(), '{"full_name": "Ana Quintero", "role": "MANAGER"}'),
  ('00000000-0000-0000-0000-000000000003', 'agente1@kovex.net', crypt('Kovex2025!', gen_salt('bf')), now(), '{"full_name": "Carlos Méndez", "role": "AGENTE"}'),
  ('00000000-0000-0000-0000-000000000004', 'agente2@kovex.net', crypt('Kovex2025!', gen_salt('bf')), now(), '{"full_name": "Valeria Soto", "role": "AGENTE"}'),
  ('00000000-0000-0000-0000-000000000005', 'supervisor@kovex.net', crypt('Kovex2025!', gen_salt('bf')), now(), '{"full_name": "Isabel Paredes", "role": "SUPERVISOR"}')
ON CONFLICT (id) DO NOTHING;

-- Trigger handles profiles creation, but let's ensure they have correct values
UPDATE public.profiles SET full_name = 'Diego Ramírez', role = 'SUPERADMIN', status = 'online' WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET full_name = 'Ana Quintero', role = 'MANAGER', status = 'online' WHERE id = '00000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET full_name = 'Carlos Méndez', role = 'AGENTE', status = 'online' WHERE id = '00000000-0000-0000-0000-000000000003';
UPDATE public.profiles SET full_name = 'Valeria Soto', role = 'AGENTE', status = 'ocupado' WHERE id = '00000000-0000-0000-0000-000000000004';
UPDATE public.profiles SET full_name = 'Isabel Paredes', role = 'SUPERVISOR', status = 'online' WHERE id = '00000000-0000-0000-0000-000000000005';

