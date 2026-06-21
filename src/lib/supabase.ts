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
  { id: 'f82fb25d-c6e1-4e16-ad4d-ed3813359800', full_name: 'Delta Admin', role: 'SUPERADMIN', status: 'online', avatar_url: null, email: 'kovex.net@gmail.com', department: 'gerente' }
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
const MOCK_ATTENDANCE: any[] = [];
const MOCK_LEGAL_FILES: any[] = [];
const MOCK_LEAD_COMMENTS: any[] = [];

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
  getOrSetLocal('kovex_v6_profiles', MOCK_PROFILES);
  getOrSetLocal('kovex_v6_leads', MOCK_LEADS);
  getOrSetLocal('kovex_v6_deals', MOCK_DEALS);
  getOrSetLocal('kovex_v6_contacts', MOCK_CONTACTS);
  getOrSetLocal('kovex_v6_activities', MOCK_ACTIVITIES);
  getOrSetLocal('kovex_v6_automations', MOCK_AUTOMATIONS);
  getOrSetLocal('kovex_v6_rules', MOCK_RULES);
  getOrSetLocal('kovex_v6_channels', MOCK_CHANNELS);
  getOrSetLocal('kovex_v6_messages', MOCK_MESSAGES);
  getOrSetLocal('kovex_v6_calls', MOCK_CALLS);
  getOrSetLocal('kovex_v6_attendance', MOCK_ATTENDANCE);
  getOrSetLocal('kovex_v6_legal_files', MOCK_LEGAL_FILES);
  getOrSetLocal('kovex_v6_lead_comments', MOCK_LEAD_COMMENTS);
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
      const defaultUsers = [
        { email: 'kovex.net@gmail.com', password: '@Kovex3412s', role: 'SUPERADMIN', name: 'Delta Admin', id: 'f82fb25d-c6e1-4e16-ad4d-ed3813359800', department: 'gerente' }
      ];
      
      const registeredUsers = getCollection('kovex_v6_mock_users') || [];
      const users = [...defaultUsers, ...registeredUsers];
      
      const found = users.find(u => u.email === email);
      if (found && password === found.password) {
        const session = {
          access_token: 'mock-token',
          user: {
            id: found.id,
            email: found.email,
            user_metadata: { full_name: found.name, role: found.role, department: found.department }
          }
        };
        localStorage.setItem('kovex_session', JSON.stringify(session));
        return Promise.resolve({ data: { user: session.user, session }, error: null });
      }
      return Promise.resolve({ data: { user: null, session: null }, error: { message: 'Credenciales incorrectas' } });
    },
    signUp: ({ email, password, options }: any) => {
      const usersKey = 'kovex_v6_mock_users';
      const users = getCollection(usersKey) || [];
      
      if (users.some((u: any) => u.email === email)) {
        return Promise.resolve({ data: { user: null, session: null }, error: { message: 'El usuario ya existe.' } });
      }
      
      const id = crypto.randomUUID();
      const role = options?.data?.role || 'AGENTE';
      const department = options?.data?.department || 'ventas';
      const name = options?.data?.full_name || email;
      const newUser = { email, password, role, name, id, department };
      
      users.push(newUser);
      saveCollection(usersKey, users);

      // Create a profile in mock storage
      const profiles = getCollection('kovex_v6_profiles');
      profiles.push({
        id,
        full_name: name,
        role,
        status: 'online',
        avatar_url: null,
        email,
        department
      });
      saveCollection('kovex_v6_profiles', profiles);

      return Promise.resolve({
        data: {
          user: { id, email, user_metadata: { full_name: name, role, department } },
          session: null
        },
        error: null
      });
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
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },
  from: (table: string) => {
    const key = `kovex_v6_${table}`;
    
    const buildChain = (currentData: any[]) => {
      const builder: any = {
        eq: (field: string, val: any) => {
          const filtered = currentData.filter((item: any) => item[field] === val);
          return buildChain(filtered);
        },
        order: (field: string, { ascending = true } = {}) => {
          const sorted = [...currentData].sort((a: any, b: any) => {
            if (a[field] < b[field]) return ascending ? -1 : 1;
            if (a[field] > b[field]) return ascending ? 1 : -1;
            return 0;
          });
          return buildChain(sorted);
        },
        single: () => mockResponse(currentData[0] || null),
        then: (cb: any) => cb({ data: currentData, error: null })
      };
      
      // Make it a thenable itself
      builder.then = (cb: any) => cb({ data: currentData, error: null });
      return builder;
    };

    return {
      select: (columns = '*') => {
        let data = getCollection(key);
        
        // Handle join simulated references
        if (table === 'deals') {
          const leads = getCollection('kovex_v6_leads');
          data.forEach((deal: any) => {
            deal.lead = leads.find((l: any) => l.id === deal.lead_id);
          });
        }
        
        return buildChain(data);
      },
      insert: (record: any) => {
        const data = getCollection(key);
        const recordsToInsert = Array.isArray(record) ? record : [record];
        const newRecords = recordsToInsert.map((r: any) => ({
          id: r.id || crypto.randomUUID(),
          created_at: r.created_at || new Date().toISOString(),
          ...r
        }));
        
        data.unshift(...newRecords);
        saveCollection(key, data);
        
        // Log activity automatically
        if (table !== 'activities' && table !== 'attendance') {
          const session = JSON.parse(localStorage.getItem('kovex_session') || '{}');
          const acts = getCollection('kovex_v6_activities');
          newRecords.forEach((newRec: any) => {
            acts.unshift({
              id: crypto.randomUUID(),
              entity_type: table.replace(/s$/, ''),
              entity_id: newRec.id,
              type: 'created',
              description: `Se creó un registro en la tabla ${table}: ${newRec.full_name || newRec.name || newRec.id}`,
              created_by: session.user?.id || null,
              created_at: new Date().toISOString()
            });
          });
          saveCollection('kovex_v6_activities', acts);
        }
        
        return mockResponse(Array.isArray(record) ? newRecords : newRecords[0]);
      },
      update: (updates: any) => {
        return {
          eq: (field: string, val: any) => {
            const data = getCollection(key);
            let updatedRecords: any[] = [];
            const updated = data.map((item: any) => {
              if (item[field] === val) {
                const updatedRecord = { ...item, ...updates, updated_at: new Date().toISOString() };
                updatedRecords.push(updatedRecord);
                return updatedRecord;
              }
              return item;
            });
            saveCollection(key, updated);
            
            // Log activity
            if (table !== 'activities' && table !== 'attendance' && updatedRecords.length > 0) {
              const session = JSON.parse(localStorage.getItem('kovex_session') || '{}');
              const acts = getCollection('kovex_v6_activities');
              updatedRecords.forEach((updatedRecord: any) => {
                acts.unshift({
                  id: crypto.randomUUID(),
                  entity_type: table.replace(/s$/, ''),
                  entity_id: updatedRecord.id,
                  type: 'updated',
                  description: `Se actualizó el registro en la tabla ${table}: ${updatedRecord.full_name || updatedRecord.name || updatedRecord.id}`,
                  created_by: session.user?.id || null,
                  created_at: new Date().toISOString()
                });
              });
              saveCollection('kovex_v6_activities', acts);
            }
            
            return mockResponse(updatedRecords);
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
