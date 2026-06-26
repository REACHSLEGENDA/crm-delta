export type UserRole = 'SUPERADMIN' | 'MANAGER' | 'AGENTE' | 'SUPERVISOR';
export type UserStatus = 'online' | 'ausente' | 'ocupado' | 'offline';
export type Department = 'ventas' | 'retencion' | 'cumplimiento' | 'gerente';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  last_seen?: string;
  team_id?: string;
  department?: Department;
  email?: string;
}

export type LeadSource = 'WhatsApp' | 'Web' | 'Referido' | 'Llamada';
export type LeadStatus = 'Nuevo' | 'Contactado' | 'Calificado' | 'Descartado';

export interface Lead {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone?: string;
  country?: string;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  agent_id?: string;
  notes?: string;
  tags: string[];
  investment_amount: number;
  // Join fields
  agent?: Profile;
}

export type DealStage = 'lead' | 'contact' | 'int' | 'demo' | 'dep' | 'won' | 'lost';
export type DealTemperature = 'cold' | 'warm' | 'hot';

export interface Deal {
  id: string;
  lead_id?: string;
  stage: DealStage;
  amount: number;
  temperature: DealTemperature;
  agent_id?: string;
  created_at: string;
  updated_at: string;
  expected_close?: string;
  // Join fields
  lead?: Lead;
  agent?: Profile;
}

export interface Contact {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  company?: string;
  tags: string[];
  agent_id?: string;
  created_at: string;
  // Join fields
  agent?: Profile;
}

export interface Channel {
  id: string;
  name: string;
  type: 'public' | 'dm' | 'system';
  members: string[];
  created_by?: string;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id?: string;
  content: string;
  reactions: Record<string, string[]>;
  created_at: string;
  edited_at?: string;
  is_system: boolean;
  // Join fields
  sender?: Profile;
}

export interface Attendance {
  id: string;
  profile_id: string;
  clock_in: string;
  clock_out?: string;
  status: 'working' | 'completed';
}

export interface LegalFile {
  id: string;
  name: string;
  file_url: string;
  uploaded_by?: string;
  created_at: string;
  // Join fields
  uploader?: Profile;
}

export interface LeadComment {
  id: string;
  lead_id: string;
  author_id?: string;
  content: string;
  created_at: string;
  // Join fields
  author?: Profile;
}
