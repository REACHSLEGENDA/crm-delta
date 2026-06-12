-- 001_initial.sql
-- Schema setup for KOVEX CRM

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create tables

-- PROFILES
create table public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  avatar_url text,
  role text NOT NULL CHECK (role IN ('SUPERADMIN', 'MANAGER', 'AGENTE', 'SUPERVISOR')),
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'ausente', 'ocupado', 'offline')),
  last_seen timestamp with time zone DEFAULT now(),
  team_id text
);

-- LEADS
create table public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  country text,
  source text NOT NULL CHECK (source IN ('WhatsApp', 'Web', 'Referido', 'Llamada')),
  status text NOT NULL DEFAULT 'Nuevo' CHECK (status IN ('Nuevo', 'Contactado', 'Calificado', 'Descartado')),
  score integer DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  tags text[] DEFAULT '{}'
);

-- DEALS
create table public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('lead', 'contact', 'int', 'demo', 'dep', 'won', 'lost')),
  amount decimal(12,2) NOT NULL DEFAULT 0.00,
  temperature text NOT NULL DEFAULT 'warm' CHECK (temperature IN ('cold', 'warm', 'hot')),
  agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expected_close date
);

-- CONTACTS
create table public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  tags text[] DEFAULT '{}',
  agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- ACTIVITIES
create table public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('lead', 'deal', 'contact', 'call', 'system')),
  entity_id uuid NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- AUTOMATIONS
create table public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  flow jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  executions_count integer DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- RULES
create table public.rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_type text NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority integer DEFAULT 1,
  is_active boolean DEFAULT true,
  executions_count integer DEFAULT 0,
  stop_on_match boolean DEFAULT false
);

-- CALLS
create table public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text CHECK (status IN ('pending', 'active', 'done', 'missed')),
  duration_seconds integer DEFAULT 0,
  disposition text,
  notes text,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone
);

-- CHANNELS
create table public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('public', 'dm', 'system')),
  members uuid[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- MESSAGES
create table public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  reactions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  edited_at timestamp with time zone,
  is_system boolean DEFAULT false
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.deals enable row level security;
alter table public.contacts enable row level security;
alter table public.activities enable row level security;
alter table public.automations enable row level security;
alter table public.rules enable row level security;
alter table public.calls enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;

-- Create Policies

-- Profiles Policies
create policy "Cualquiera autenticado puede ver perfiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Cada usuario actualiza su propio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Leads Policies
create policy "Leads access policy"
  on public.leads for all
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER', 'SUPERVISOR')
    or agent_id = auth.uid()
  );

-- Deals Policies
create policy "Deals access policy"
  on public.deals for all
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER', 'SUPERVISOR')
    or agent_id = auth.uid()
  );

-- Contacts Policies
create policy "Contacts access policy"
  on public.contacts for all
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER', 'SUPERVISOR')
    or agent_id = auth.uid()
  );

-- Activities Policies
create policy "Activities view policy"
  on public.activities for select
  to authenticated
  using (true);

create policy "Activities insert policy"
  on public.activities for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Automations Policies
create policy "Automations access policy"
  on public.automations for all
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER')
  );

-- Rules Policies
create policy "Rules access policy"
  on public.rules for all
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER')
  );

-- Calls Policies
create policy "Calls access policy"
  on public.calls for all
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER', 'SUPERVISOR')
    or agent_id = auth.uid()
  );

-- Channels Policies
create policy "Channels access policy"
  on public.channels for all
  to authenticated
  using (
    type = 'public' 
    or type = 'system'
    or auth.uid() = any(members)
  );

-- Messages Policies
create policy "Messages access policy"
  on public.messages for all
  to authenticated
  using (
    exists (
      select 1 from public.channels 
      where id = channel_id 
      and (type = 'public' or type = 'system' or auth.uid() = any(members))
    )
  );

-- Realtime triggers / helpers
-- Automatic profile creation on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'AGENTE'),
    'online'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
