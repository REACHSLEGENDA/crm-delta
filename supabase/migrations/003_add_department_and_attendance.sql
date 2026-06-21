-- 003_add_department_and_attendance.sql
-- Migration file to support DELTA CAPITAL roles, departments, attendance, and compliance files

-- 1. Add department column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text CHECK (department IN ('ventas', 'retencion', 'cumplimiento', 'gerente'));

-- 2. Update profiles handler trigger function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, status, email, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'AGENTE'),
    'online',
    new.email,
    new.raw_user_meta_data->>'department'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 3. Create attendance table
create table if not exists public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clock_in timestamp with time zone DEFAULT now(),
  clock_out timestamp with time zone,
  status text NOT NULL DEFAULT 'working' CHECK (status IN ('working', 'completed'))
);

-- Enable RLS for attendance
alter table public.attendance enable row level security;

-- Drop policies if they already exist
drop policy if exists "Select attendance" on public.attendance;
drop policy if exists "Insert attendance" on public.attendance;
drop policy if exists "Update attendance" on public.attendance;

-- Attendance RLS Policies
create policy "Select attendance" on public.attendance
  for select to authenticated
  using (
    auth.uid() = profile_id 
    or (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER')
  );

create policy "Insert attendance" on public.attendance
  for insert to authenticated
  with check (auth.uid() = profile_id);

create policy "Update attendance" on public.attendance
  for update to authenticated
  using (auth.uid() = profile_id);

-- 4. Create legal files repository table
create table if not exists public.legal_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for legal_files
alter table public.legal_files enable row level security;

-- Drop policies if they exist
drop policy if exists "Select legal_files" on public.legal_files;
drop policy if exists "Insert legal_files" on public.legal_files;

-- Legal Files RLS Policies
create policy "Select legal_files" on public.legal_files
  for select to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER', 'SUPERVISOR')
    or (select department from public.profiles where id = auth.uid()) = 'cumplimiento'
  );

create policy "Insert legal_files" on public.legal_files
  for insert to authenticated
  with check (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER')
    or (select department from public.profiles where id = auth.uid()) = 'cumplimiento'
  );
