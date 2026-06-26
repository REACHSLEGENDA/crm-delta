# Esquema Limpio de Supabase (Kovex CRM)

Este documento contiene el esquema completo y corregido de la base de datos de producción de Supabase. Este script ya ha sido ejecutado y se encuentra activo en tu base de datos.

```sql
-- =========================================================================
-- 1. TABLA DE PERFILES (profiles)
-- =========================================================================
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  role text NOT NULL CHECK (role = ANY (ARRAY['SUPERADMIN'::text, 'MANAGER'::text, 'AGENTE'::text, 'SUPERVISOR'::text])),
  status text NOT NULL DEFAULT 'online'::text CHECK (status = ANY (ARRAY['online'::text, 'ausente'::text, 'ocupado'::text, 'offline'::text])),
  last_seen timestamp with time zone DEFAULT now(),
  team_id text,
  department text CHECK (department = ANY (ARRAY['ventas'::text, 'retencion'::text, 'cumplimiento'::text, 'gerente'::text])),
  email text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar RLS en perfiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow all for authenticated users on profiles" ON public.profiles FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================
-- 2. TABLA DE PROSPECTOS (leads)
-- =========================================================================
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  country text,
  source text NOT NULL CHECK (source = ANY (ARRAY['WhatsApp'::text, 'Web'::text, 'Referido'::text, 'Llamada'::text])),
  status text NOT NULL DEFAULT 'Nuevo'::text CHECK (status = ANY (ARRAY['Nuevo'::text, 'Contactado'::text, 'Calificado'::text, 'Descartado'::text])),
  score integer DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  agent_id uuid,
  notes text,
  tags text[] DEFAULT '{}'::text[],
  investment_amount numeric DEFAULT 0.00,
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on leads" ON public.leads FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================
-- 3. TABLA DE NEGOCIACIONES (deals)
-- =========================================================================
CREATE TABLE public.deals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  stage text NOT NULL CHECK (stage = ANY (ARRAY['lead'::text, 'contact'::text, 'int'::text, 'demo'::text, 'dep'::text, 'won'::text, 'lost'::text])),
  amount numeric NOT NULL DEFAULT 0.00,
  temperature text NOT NULL DEFAULT 'warm'::text CHECK (temperature = ANY (ARRAY['cold'::text, 'warm'::text, 'hot'::text])),
  agent_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expected_close date,
  CONSTRAINT deals_pkey PRIMARY KEY (id),
  CONSTRAINT deals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT deals_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on deals" ON public.deals FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================
-- 4. TABLA DE CONTACTOS (contacts)
-- =========================================================================
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  tags text[] DEFAULT '{}'::text[],
  agent_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT contacts_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on contacts" ON public.contacts FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================
-- 5. TABLA DE ACTIVIDADES (activities)
-- =========================================================================
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type = ANY (ARRAY['lead'::text, 'deal'::text, 'contact'::text, 'call'::text, 'system'::text])),
  entity_id uuid NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on activities" ON public.activities FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================
-- 6. TABLA DE AUTOMATIZACIONES (automations)
-- =========================================================================
CREATE TABLE public.automations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  flow jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  executions_count integer DEFAULT 0,
  created_by uuid,
  CONSTRAINT automations_pkey PRIMARY KEY (id),
  CONSTRAINT automations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on automations" ON public.automations FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================
-- 7. TABLA DE REGLAS (rules)
-- =========================================================================
CREATE TABLE public.rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_type text NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority integer DEFAULT 1,
  is_active boolean DEFAULT true,
  executions_count integer DEFAULT 0,
  stop_on_match boolean DEFAULT false,
  CONSTRAINT rules_pkey PRIMARY KEY (id)
);

ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on rules" ON public.rules FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================
-- 8. TABLA DE LLAMADAS (calls)
-- =========================================================================
CREATE TABLE public.calls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid,
  lead_id uuid,
  agent_id uuid,
  status text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'done'::text, 'missed'::text])),
  duration_seconds integer DEFAULT 0,
  disposition text,
  notes text,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  CONSTRAINT calls_pkey PRIMARY KEY (id),
  CONSTRAINT calls_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL,
  CONSTRAINT calls_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL,
  CONSTRAINT calls_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on calls" ON public.calls FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================
-- 9. TABLA DE CANALES (channels)
-- =========================================================================
CREATE TABLE public.channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['public'::text, 'dm'::text, 'system'::text])),
  members uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT channels_pkey PRIMARY KEY (id),
  CONSTRAINT channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on channels" ON public.channels FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================
-- 10. TABLA DE MENSAJES (messages)
-- =========================================================================
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  channel_id uuid,
  sender_id uuid,
  content text NOT NULL,
  reactions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  edited_at timestamp with time zone,
  is_system boolean DEFAULT false,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE,
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on messages" ON public.messages FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================
-- 11. TABLA DE ASISTENCIA (attendance)
-- =========================================================================
CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  clock_in timestamp with time zone DEFAULT now(),
  clock_out timestamp with time zone,
  status text NOT NULL DEFAULT 'working'::text CHECK (status = ANY (ARRAY['working'::text, 'completed'::text])),
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on attendance" ON public.attendance FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================
-- 12. TABLA DE ARCHIVOS LEGALES (legal_files)
-- =========================================================================
CREATE TABLE public.legal_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT legal_files_pkey PRIMARY KEY (id),
  CONSTRAINT legal_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.legal_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on legal_files" ON public.legal_files FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================
-- 13. TABLA DE COMENTARIOS DE PROSPECTOS (lead_comments)
-- =========================================================================
CREATE TABLE public.lead_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  author_id uuid,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lead_comments_pkey PRIMARY KEY (id),
  CONSTRAINT lead_comments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT lead_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on lead_comments" ON public.lead_comments FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================
-- 14. FUNCIÓN Y TRIGGER PARA AUTOCREAR PERFILES AL REGISTRAR USUARIOS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, department, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'AGENTE'),
    COALESCE(new.raw_user_meta_data->>'department', 'ventas'),
    'online'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    department = EXCLUDED.department;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE PROCEDURE public.handle_new_user();
```
