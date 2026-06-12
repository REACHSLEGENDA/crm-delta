-- 002_add_email_column.sql
-- Add email column to profiles table and update trigger

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Update trigger function to sync email as well
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, status, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'AGENTE'),
    'online',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;
