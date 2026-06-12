// modules/prospectos/useProspectos.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';

interface ProspectosState {
  leads: Lead[];
  loading: boolean;
  selectedLeadIds: string[];
  searchQuery: string;
  filterStatus: string[];
  filterSource: string[];
  filterAgent: string;
  fetchLeads: () => Promise<void>;
  setSelectedLeadIds: (ids: string[]) => void;
  toggleSelectLead: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: string[]) => void;
  setFilterSource: (source: string[]) => void;
  setFilterAgent: (agent: string) => void;
  createLead: (lead: Omit<Lead, 'id' | 'created_at'>) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  deleteSelectedLeads: () => Promise<void>;
  batchUpdateAgent: (agentId: string | null) => Promise<void>;
  batchUpdateStatus: (status: Lead['status']) => Promise<void>;
}

export const useProspectosStore = create<ProspectosState>((set, get) => ({
  leads: [],
  loading: false,
  selectedLeadIds: [],
  searchQuery: '',
  filterStatus: [],
  filterSource: [],
  filterAgent: '',

  fetchLeads: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (!error) {
        set({ leads: data || [] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      set({ loading: false });
    }
  },

  setSelectedLeadIds: (ids) => set({ selectedLeadIds: ids }),
  toggleSelectLead: (id) => set((state) => ({
    selectedLeadIds: state.selectedLeadIds.includes(id)
      ? state.selectedLeadIds.filter((item) => item !== id)
      : [...state.selectedLeadIds, id]
  })),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterSource: (source) => set({ filterSource: source }),
  setFilterAgent: (agent) => set({ filterAgent: agent }),

  createLead: async (lead) => {
    try {
      const { data, error } = await supabase.from('leads').insert(lead);
      if (!error && data) {
        set((state) => ({ leads: [data[0], ...state.leads] }));
      }
    } catch (err) {
      console.error(err);
    }
  },

  updateLead: async (id, updates) => {
    try {
      const { data, error } = await supabase.from('leads').update(updates).eq('id', id);
      if (!error && data) {
        set((state) => ({
          leads: state.leads.map((l) => l.id === id ? { ...l, ...data[0] } : l)
        }));
      }
    } catch (err) {
      console.error(err);
    }
  },

  deleteLead: async (id) => {
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (!error) {
        set((state) => ({
          leads: state.leads.filter((l) => l.id !== id),
          selectedLeadIds: state.selectedLeadIds.filter((item) => item !== id)
        }));
      }
    } catch (err) {
      console.error(err);
    }
  },

  deleteSelectedLeads: async () => {
    const ids = get().selectedLeadIds;
    if (ids.length === 0) return;
    try {
      for (const id of ids) {
        await supabase.from('leads').delete().eq('id', id);
      }
      set((state) => ({
        leads: state.leads.filter((l) => !ids.includes(l.id)),
        selectedLeadIds: []
      }));
    } catch (err) {
      console.error(err);
    }
  },

  batchUpdateAgent: async (agentId) => {
    const ids = get().selectedLeadIds;
    if (ids.length === 0) return;
    try {
      for (const id of ids) {
        await supabase.from('leads').update({ agent_id: agentId }).eq('id', id);
      }
      set((state) => ({
        leads: state.leads.map((l) => ids.includes(l.id) ? { ...l, agent_id: agentId } : l),
        selectedLeadIds: []
      }));
    } catch (err) {
      console.error(err);
    }
  },

  batchUpdateStatus: async (status) => {
    const ids = get().selectedLeadIds;
    if (ids.length === 0) return;
    try {
      for (const id of ids) {
        await supabase.from('leads').update({ status }).eq('id', id);
      }
      set((state) => ({
        leads: state.leads.map((l) => ids.includes(l.id) ? { ...l, status } : l),
        selectedLeadIds: []
      }));
    } catch (err) {
      console.error(err);
    }
  }
}));
