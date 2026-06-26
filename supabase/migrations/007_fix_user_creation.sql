-- 007_fix_user_creation.sql
-- Fixes: trigger missing email/department columns, missing INSERT policy for admins

-- 1. Allow SUPERADMIN/MANAGER to insert new profiles
create policy "Admins pueden insertar perfiles"
  on public.profiles for insert
  to authenticated
  with check (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER')
  );

-- 2. Allow SUPERADMIN/MANAGER to update any profile (not just own)
create policy "Admins pueden actualizar cualquier perfil"
  on public.profiles for update
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER')
  );

-- 3. Fix the trigger to also insert email and department
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role, department, status, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'AGENTE'),
    coalesce(new.raw_user_meta_data->>'department', 'ventas'),
    'online',
    null
  )
  on conflict (id) do update
    set
      full_name = excluded.full_name,
      email     = excluded.email,
      role      = excluded.role,
      department = excluded.department,
      status    = 'online';
  return new;
end;
$$ language plpgsql security definer;

-- 4. Ensure trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
