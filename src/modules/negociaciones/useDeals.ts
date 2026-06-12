// modules/negociaciones/useDeals.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Deal } from '@/types';

interface DealsState {
  deals: Deal[];
  loading: boolean;
  fetchDeals: () => Promise<void>;
  updateDealStage: (id: string, stage: Deal['stage']) => Promise<void>;
  createDeal: (deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
}

export const useDealsStore = create<DealsState>((set, get) => ({
  deals: [],
  loading: false,

  fetchDeals: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.from('deals').select('*').order('created_at', { ascending: false });
      if (!error) {
        set({ deals: data || [] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      set({ loading: false });
    }
  },

  updateDealStage: async (id, stage) => {
    try {
      const { data, error } = await supabase.from('deals').update({ stage }).eq('id', id);
      if (!error && data) {
        set((state) => ({
          deals: state.deals.map((d) => d.id === id ? { ...d, ...data[0] } : d)
        }));
      }
    } catch (err) {
      console.error(err);
    }
  },

  createDeal: async (deal) => {
    try {
      const { data, error } = await supabase.from('deals').insert(deal);
      if (!error && data) {
        set((state) => ({ deals: [data[0], ...state.deals] }));
      }
    } catch (err) {
      console.error(err);
    }
  },

  deleteDeal: async (id) => {
    try {
      const { error } = await supabase.from('deals').delete().eq('id', id);
      if (!error) {
        set((state) => ({
          deals: state.deals.filter((d) => d.id !== id)
        }));
      }
    } catch (err) {
      console.error(err);
    }
  }
}));
