-- 001_initial.sql
-- Schema setup for KOVEX CRM
-- =========================================================================
-- Este script define la estructura relacional, restricciones de dominio,
-- seguridad basada en políticas RLS y la sincronización automática de
-- usuarios de Supabase Auth hacia la tabla de perfiles públicos.
-- =========================================================================

-- Habilitar extensión para generación de identificadores UUID
create extension if not exists "uuid-ossp";

-- =========================================================================
-- 1. CREACIÓN DE TABLAS DE LA BASE DE DATOS
-- =========================================================================

-- 1.1 PERFILES (PROFILES)
-- Extiende los datos del usuario de Supabase Auth agregando roles y estados.
create table public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE, -- Vinculado a Auth.users
  full_name text NOT NULL,                                     -- Nombre completo del miembro del equipo
  avatar_url text,                                            -- URL del avatar o foto de perfil
  role text NOT NULL CHECK (role IN ('SUPERADMIN', 'MANAGER', 'AGENTE', 'SUPERVISOR')), -- Roles del sistema
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'ausente', 'ocupado', 'offline')), -- Estado de conexión
  last_seen timestamp with time zone DEFAULT now(),           -- Última fecha/hora de actividad
  team_id text                                                -- Identificador opcional de equipo/mesa
);

-- 1.2 PROSPECTOS (LEADS)
-- Almacena la información de contacto inicial y estado de captación de leads.
create table public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),           -- Fecha de registro
  full_name text NOT NULL,                                     -- Nombre completo del cliente potencial
  email text NOT NULL,                                         -- Correo electrónico
  phone text,                                                 -- Número de teléfono
  country text,                                               -- País de procedencia (para reglas geográficas)
  source text NOT NULL CHECK (source IN ('WhatsApp', 'Web', 'Referido', 'Llamada')), -- Origen del Lead
  status text NOT NULL DEFAULT 'Nuevo' CHECK (status IN ('Nuevo', 'Contactado', 'Calificado', 'Descartado')), -- Estado en el embudo
  score integer DEFAULT 50 CHECK (score >= 0 AND score <= 100), -- Calificación automática (0 - 100)
  agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Agente asignado
  notes text,                                                 -- Notas adicionales del expediente
  tags text[] DEFAULT '{}'                                    -- Etiquetas de segmentación (ej. 'VIP', 'Trader')
);

-- 1.3 NEGOCIACIONES (DEALS)
-- Representa las transacciones comerciales o tratos dentro del pipeline Kanban.
create table public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,  -- Prospecto asociado
  stage text NOT NULL CHECK (stage IN ('lead', 'contact', 'int', 'demo', 'dep', 'won', 'lost')), -- Etapa en pipeline
  amount decimal(12,2) NOT NULL DEFAULT 0.00,                 -- Monto estimado de inversión
  temperature text NOT NULL DEFAULT 'warm' CHECK (temperature IN ('cold', 'warm', 'hot')), -- Temperatura del trato
  agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Agente a cargo del trato
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expected_close date                                         -- Fecha estimada de cierre de venta
);

-- 1.4 CONTACTOS (CONTACTS)
-- Directorio final de clientes fidelizados, inversores activos y traders.
create table public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,                                     -- Nombre completo del contacto
  email text NOT NULL,                                         -- Correo electrónico (único por cliente)
  phone text,                                                 -- Teléfono
  company text,                                               -- Empresa o Institución asociada
  tags text[] DEFAULT '{}',                                   -- Etiquetas (ej. 'Institucional', 'VIP')
  agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Agente gestor
  created_at timestamp with time zone DEFAULT now()
);

-- 1.5 ACTIVIDADES (ACTIVITIES)
-- Registro/Log histórico de cambios y eventos sobre entidades del CRM.
create table public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('lead', 'deal', 'contact', 'call', 'system')), -- Tipo de entidad
  entity_id uuid NOT NULL,                                    -- ID del registro afectado
  type text NOT NULL,                                         -- Tipo de evento (ej. 'created', 'updated')
  description text NOT NULL,                                  -- Mensaje descriptivo legible
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Usuario que gatilló el evento
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb                          -- Información adicional en formato JSON
);

-- 1.6 AUTOMATIZACIONES (AUTOMATIONS)
-- Almacena la estructura de flujos de trabajo basados en diagramas de nodos.
create table public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                                         -- Nombre del flujo
  trigger_type text NOT NULL,                                 -- Desencadenador (ej. 'lead.created')
  trigger_config jsonb DEFAULT '{}'::jsonb,                   -- Reglas adicionales de disparo
  flow jsonb NOT NULL DEFAULT '{}'::jsonb,                    -- Grafo de nodos y conexiones (coordenadas, pasos)
  is_active boolean DEFAULT true,                             -- Estado del flujo (Activo/Inactivo)
  executions_count integer DEFAULT 0,                         -- Total de ejecuciones registradas
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 1.7 REGLAS DE NEGOCIO (RULES)
-- Motor de condiciones condicionales SI-ENTONCES para asignación y etiquetado automático.
create table public.rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                                         -- Nombre descriptivo
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,              -- Lista de condiciones lógicas
  action_type text NOT NULL,                                  -- Acción a tomar (ej. 'assign_agent')
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,           -- Parámetros de la acción (ej. ID de agente)
  priority integer DEFAULT 1,                                 -- Prioridad de ejecución (ejecución ordenada)
  is_active boolean DEFAULT true,
  executions_count integer DEFAULT 0,
  stop_on_match boolean DEFAULT false                         -- Detener evaluación de reglas posteriores si hay match
);

-- 1.8 LLAMADAS (CALLS)
-- Bitácora de marcación telefónica, duración y disposición para el Contact Center.
create table public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text CHECK (status IN ('pending', 'active', 'done', 'missed')), -- Estatus de la llamada
  duration_seconds integer DEFAULT 0,                         -- Duración en segundos
  disposition text,                                           -- Resultado de la llamada (ej. 'Interesado', 'Buzón')
  notes text,                                                 -- Notas tomadas durante la llamada
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone
);

-- 1.9 CANALES DE CHAT (CHANNELS)
-- Canales de comunicación interna grupales o mensajes directos (DM).
create table public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                                         -- Nombre del canal (vacío en DMs)
  type text NOT NULL CHECK (type IN ('public', 'dm', 'system')), -- Tipo de conversación
  members uuid[] NOT NULL DEFAULT '{}',                       -- Lista de IDs de miembros participantes
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 1.10 MENSAJES DE CHAT (MESSAGES)
-- Contenido de mensajes intercambiados en los canales de chat.
create table public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Emisor del mensaje
  content text NOT NULL,                                      -- Contenido de texto
  reactions jsonb DEFAULT '{}'::jsonb,                        -- Reacciones de emojis
  created_at timestamp with time zone DEFAULT now(),
  edited_at timestamp with time zone,
  is_system boolean DEFAULT false                             -- True si es notificación automática del sistema
);

-- =========================================================================
-- 2. SEGURIDAD DE BASE DE DATOS (ROW LEVEL SECURITY - RLS)
-- =========================================================================

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

-- 2.1 Políticas para Perfiles (Profiles)
create policy "Cualquiera autenticado puede ver perfiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Cada usuario actualiza su propio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- 2.2 Políticas para Leads (Prospectos)
-- Solo visible para administradores/supervisores o agentes explícitamente asignados.
create policy "Leads access policy"
  on public.leads for all
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER', 'SUPERVISOR')
    or agent_id = auth.uid()
  );

-- 2.3 Políticas para Deals (Negociaciones)
-- Solo visible para directores/supervisores o agentes asignados.
create policy "Deals access policy"
  on public.deals for all
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER', 'SUPERVISOR')
    or agent_id = auth.uid()
  );

-- 2.4 Políticas para Contactos (Clientes)
create policy "Contacts access policy"
  on public.contacts for all
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER', 'SUPERVISOR')
    or agent_id = auth.uid()
  );

-- 2.5 Políticas para Actividades (Logs)
create policy "Activities view policy"
  on public.activities for select
  to authenticated
  using (true);

create policy "Activities insert policy"
  on public.activities for insert
  to authenticated
  with check (auth.uid() = created_by);

-- 2.6 Políticas para Automatizaciones (Automations)
-- Acceso exclusivo a niveles directivos (SUPERADMIN y MANAGER).
create policy "Automations access policy"
  on public.automations for all
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER')
  );

-- 2.7 Políticas para Reglas de Negocio (Rules)
create policy "Rules access policy"
  on public.rules for all
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER')
  );

-- 2.8 Políticas para Llamadas (Calls)
create policy "Calls access policy"
  on public.calls for all
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('SUPERADMIN', 'MANAGER', 'SUPERVISOR')
    or agent_id = auth.uid()
  );

-- 2.9 Políticas para Canales de Chat (Channels)
-- Visible si es un canal público, de alertas del sistema, o si el usuario pertenece al arreglo de miembros.
create policy "Channels access policy"
  on public.channels for all
  to authenticated
  using (
    type = 'public' 
    or type = 'system'
    or auth.uid() = any(members)
  );

-- 2.10 Políticas para Mensajes de Chat (Messages)
-- Solo se pueden leer/escribir mensajes si el usuario tiene acceso verificado al canal correspondiente.
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

-- =========================================================================
-- 3. TRIGGERS Y FUNCIONES DE AUTOMATIZACIÓN
-- =========================================================================

-- Función disparadora: Crea automáticamente un perfil público en la tabla 'profiles'
-- tan pronto como un nuevo usuario se registra y confirma en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'AGENTE'), -- Rol por defecto: AGENTE
    'online'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Enlace del disparador a la tabla de Auth interna de Supabase
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
