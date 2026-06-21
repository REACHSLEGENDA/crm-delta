// types/index.ts

export type UserRole = 'SUPERADMIN' | 'MANAGER' | 'AGENTE' | 'SUPERVISOR';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  status: 'online' | 'ausente' | 'ocupado' | 'offline';
  last_seen?: string;
  team_id?: string | null;
  email?: string;
  department?: 'ventas' | 'retencion' | 'cumplimiento' | 'gerente' | null;
}

export interface Lead {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  source: 'WhatsApp' | 'Web' | 'Referido' | 'Llamada';
  status: 'Nuevo' | 'Contactado' | 'Calificado' | 'Descartado';
  score: number;
  agent_id: string | null;
  notes: string | null;
  tags: string[];
}

export interface Deal {
  id: string;
  lead_id: string;
  stage: 'lead' | 'contact' | 'int' | 'demo' | 'dep' | 'won' | 'lost';
  amount: number;
  temperature: 'cold' | 'warm' | 'hot';
  agent_id: string | null;
  created_at: string;
  updated_at: string;
  expected_close: string | null;
  lead?: Lead; // populated lead info
}

export interface Contact {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  tags: string[];
  agent_id: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  entity_type: 'lead' | 'deal' | 'contact' | 'call' | 'system';
  entity_id: string;
  type: string;
  description: string;
  created_by: string | null;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  flow: {
    nodes: any[];
    edges?: any[];
  };
  is_active: boolean;
  executions_count: number;
  created_by: string | null;
}

export interface Rule {
  id: string;
  name: string;
  conditions: any[];
  action_type: string;
  action_config: Record<string, any>;
  priority: number;
  is_active: boolean;
  executions_count: number;
  stop_on_match: boolean;
}

export interface Call {
  id: string;
  contact_id: string | null;
  lead_id: string | null;
  agent_id: string | null;
  status: 'pending' | 'active' | 'done' | 'missed';
  duration_seconds: number;
  disposition: string | null;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface Channel {
  id: string;
  name: string;
  type: 'public' | 'dm' | 'system';
  members: string[];
  created_by: string | null;
  created_at: string;
  unreadCount?: number; // UI flag
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string | null;
  content: string;
  reactions: Record<string, any>;
  created_at: string;
  edited_at: string | null;
  is_system: boolean;
}
