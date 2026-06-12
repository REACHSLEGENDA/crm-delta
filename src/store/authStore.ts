// store/authStore.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<{ success: boolean; error: string | null }>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  updateProfileStatus: (status: Profile['status']) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  login: async (email, password, remember) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      const user = data.user;
      
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      set({ user, profile: profileData, loading: false });
      return { success: true, error: null };
    } catch (err: any) {
      set({ loading: false });
      return { success: false, error: err.message || 'Error de conexión' };
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  initialize: async () => {
    if (get().initialized) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const user = session.user;
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        set({ user, profile: profileData, initialized: true });
      } else {
        set({ user: null, profile: null, initialized: true });
      }
    } catch (err) {
      set({ user: null, profile: null, initialized: true });
    }
  },

  updateProfileStatus: async (status) => {
    const profile = get().profile;
    if (!profile) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ status })
        .eq('id', profile.id);
      
      set({ profile: { ...profile, status } });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  }
}));
