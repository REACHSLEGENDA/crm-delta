// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isRealSupabase = 
  supabaseUrl && 
  supabaseAnonKey && 
  typeof supabaseUrl === 'string' &&
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) &&
  !supabaseUrl.includes('placeholder') && 
  !supabaseUrl.includes('your-supabase');

// Mock Data Initial Seeds
const MOCK_PROFILES = [
  { id: '00000000-0000-0000-0000-000000000001', full_name: 'Diego Ramírez', role: 'SUPERADMIN', status: 'online', avatar_url: null },
  { id: '00000000-0000-0000-0000-000000000002', full_name: 'Ana Quintero', role: 'MANAGER', status: 'online', avatar_url: null },
  { id: '00000000-0000-0000-0000-000000000003', full_name: 'Carlos Méndez', role: 'AGENTE', status: 'online', avatar_url: null },
  { id: '00000000-0000-0000-0000-000000000004', full_name: 'Valeria Soto', role: 'AGENTE', status: 'ocupado', avatar_url: null },
  { id: '00000000-0000-0000-0000-000000000005', full_name: 'Isabel Paredes', role: 'SUPERVISOR', status: 'online', avatar_url: null },
];

const MOCK_LEADS: any[] = [];

const MOCK_DEALS: any[] = [];

const MOCK_CONTACTS: any[] = [];

const MOCK_ACTIVITIES: any[] = [];

const MOCK_AUTOMATIONS: any[] = [];

const MOCK_RULES: any[] = [];

const MOCK_CHANNELS = [
  { id: 'chan-1', name: 'general', type: 'public', members: [] },
  { id: 'chan-2', name: 'ventas-mx', type: 'public', members: [] },
  { id: 'chan-3', name: 'alertas', type: 'system', members: [] },
];

const MOCK_MESSAGES: any[] = [];

const MOCK_CALLS: any[] = [];

// Initialize LocalStorage with seed data if not present
const getOrSetLocal = (key: string, seed: any) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
};

// Ensure all data structures are loaded
const initializeLocalDb = () => {
  if (typeof window === 'undefined') return;
  getOrSetLocal('kovex_v3_profiles', MOCK_PROFILES);
  getOrSetLocal('kovex_v3_leads', MOCK_LEADS);
  getOrSetLocal('kovex_v3_deals', MOCK_DEALS);
  getOrSetLocal('kovex_v3_contacts', MOCK_CONTACTS);
  getOrSetLocal('kovex_v3_activities', MOCK_ACTIVITIES);
  getOrSetLocal('kovex_v3_automations', MOCK_AUTOMATIONS);
  getOrSetLocal('kovex_v3_rules', MOCK_RULES);
  getOrSetLocal('kovex_v3_channels', MOCK_CHANNELS);
  getOrSetLocal('kovex_v3_messages', MOCK_MESSAGES);
  getOrSetLocal('kovex_v3_calls', MOCK_CALLS);
};

initializeLocalDb();

// Generic helper to mock Supabase query responses
const mockResponse = (data: any, error: any = null) => {
  return Promise.resolve({ data, error, count: Array.isArray(data) ? data.length : 0 });
};

// Local storage helpers
const getCollection = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const saveCollection = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

// Create Mock Supabase client
const mockSupabase = {
  auth: {
    signInWithPassword: ({ email, password }: any) => {
      const users = [
        { email: 'superadmin@kovex.net', role: 'SUPERADMIN', name: 'Diego Ramírez', id: '00000000-0000-0000-0000-000000000001' },
        { email: 'manager@kovex.net', role: 'MANAGER', name: 'Ana Quintero', id: '00000000-0000-0000-0000-000000000002' },
        { email: 'agente1@kovex.net', role: 'AGENTE', name: 'Carlos Méndez', id: '00000000-0000-0000-0000-000000000003' },
        { email: 'agente2@kovex.net', role: 'AGENTE', name: 'Valeria Soto', id: '00000000-0000-0000-0000-000000000004' },
        { email: 'supervisor@kovex.net', role: 'SUPERVISOR', name: 'Isabel Paredes', id: '00000000-0000-0000-0000-000000000005' },
      ];
      
      const found = users.find(u => u.email === email);
      if (found && password === 'Kovex2025!') {
        const session = {
          access_token: 'mock-token',
          user: {
            id: found.id,
            email: found.email,
            user_metadata: { full_name: found.name, role: found.role }
          }
        };
        localStorage.setItem('kovex_session', JSON.stringify(session));
        return Promise.resolve({ data: { user: session.user, session }, error: null });
      }
      return Promise.resolve({ data: { user: null, session: null }, error: { message: 'Credenciales incorrectas' } });
    },
    signOut: () => {
      localStorage.removeItem('kovex_session');
      return Promise.resolve({ error: null });
    },
    getSession: () => {
      const data = localStorage.getItem('kovex_session');
      const session = data ? JSON.parse(data) : null;
      return Promise.resolve({ data: { session }, error: null });
    },
    onAuthStateChange: (callback: any) => {
      // Return unsubscribe mock
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },
  from: (table: string) => {
    const key = `kovex_v3_${table}`;
    return {
      select: (columns = '*') => {
        const data = getCollection(key);
        
        // Handle join simulated references
        if (table === 'deals') {
          const leads = getCollection('kovex_v3_leads');
          data.forEach((deal: any) => {
            deal.lead = leads.find((l: any) => l.id === deal.lead_id);
          });
        }
        
        return {
          eq: (field: string, val: any) => {
            const filtered = data.filter((item: any) => item[field] === val);
            return {
              single: () => mockResponse(filtered[0] || null),
              order: () => mockResponse(filtered),
              then: (cb: any) => cb({ data: filtered, error: null })
            };
          },
          order: (field: string, { ascending = true } = {}) => {
            const sorted = [...data].sort((a: any, b: any) => {
              if (a[field] < b[field]) return ascending ? -1 : 1;
              if (a[field] > b[field]) return ascending ? 1 : -1;
              return 0;
            });
            return {
              then: (cb: any) => cb({ data: sorted, error: null })
            };
          },
          then: (cb: any) => cb({ data, error: null })
        };
      },
      insert: (record: any) => {
        const data = getCollection(key);
        const newRecord = { 
          id: crypto.randomUUID(), 
          created_at: new Date().toISOString(), 
          ...record 
        };
        data.unshift(newRecord);
        saveCollection(key, data);
        
        // Log activity automatically
        if (table !== 'activities') {
          const session = JSON.parse(localStorage.getItem('kovex_session') || '{}');
          const acts = getCollection('kovex_v3_activities');
          acts.unshift({
            id: crypto.randomUUID(),
            entity_type: table.replace(/s$/, ''),
            entity_id: newRecord.id,
            type: 'created',
            description: `Se creó un registro en la tabla ${table}: ${newRecord.full_name || newRecord.name || newRecord.id}`,
            created_by: session.user?.id || null,
            created_at: new Date().toISOString()
          });
          saveCollection('kovex_v3_activities', acts);
        }
        
        return mockResponse([newRecord]);
      },
      update: (updates: any) => {
        return {
          eq: (field: string, val: any) => {
            const data = getCollection(key);
            let updatedRecord: any = null;
            const updated = data.map((item: any) => {
              if (item[field] === val) {
                updatedRecord = { ...item, ...updates, updated_at: new Date().toISOString() };
                return updatedRecord;
              }
              return item;
            });
            saveCollection(key, updated);
            
            // Log activity
            if (table !== 'activities' && updatedRecord) {
              const session = JSON.parse(localStorage.getItem('kovex_session') || '{}');
              const acts = getCollection('kovex_v3_activities');
              acts.unshift({
                id: crypto.randomUUID(),
                entity_type: table.replace(/s$/, ''),
                entity_id: updatedRecord.id,
                type: 'updated',
                description: `Se actualizó el registro en la tabla ${table}: ${updatedRecord.full_name || updatedRecord.name || updatedRecord.id}`,
                created_by: session.user?.id || null,
                created_at: new Date().toISOString()
              });
              saveCollection('kovex_v3_activities', acts);
            }
            
            return mockResponse(updatedRecord ? [updatedRecord] : []);
          }
        };
      },
      delete: () => {
        return {
          eq: (field: string, val: any) => {
            const data = getCollection(key);
            const filtered = data.filter((item: any) => item[field] !== val);
            saveCollection(key, filtered);
            return mockResponse({ success: true });
          }
        };
      }
    };
  },
  channel: (channelName: string) => {
    return {
      on: (event: string, config: any, callback: any) => {
        return {
          subscribe: () => {
            // Setup a interval to simulate periodic updates (like incoming messages)
            return {
              unsubscribe: () => {}
            };
          }
        };
      },
      send: (payload: any) => {
        return Promise.resolve({ status: 'ok' });
      }
    };
  }
};

// Export actual Supabase client or Mock depending on environment variables
export const supabase = isRealSupabase 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : (mockSupabase as any);

export const getSupabaseMode = () => isRealSupabase ? 'PROD' : 'LOCAL_MOCK';
export { isRealSupabase };
