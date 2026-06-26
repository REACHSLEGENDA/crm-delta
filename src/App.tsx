import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Profile } from './types';

// Components & Pages
import Layout from './components/Layout';
import Login from './pages/Login';
import RegisterInternal from './pages/RegisterInternal';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Pipeline from './pages/Pipeline';
import Contacts from './pages/Contacts';
import Chat from './pages/Chat';
import Attendance from './pages/Attendance';
import Legal from './pages/Legal';
import Automations from './pages/Automations';

export default function App() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-dark-deep)',
        padding: '20px',
        color: 'var(--text-white)'
      }}>
        <div className="glass-panel" style={{
          maxWidth: '600px',
          width: '100%',
          padding: '40px',
          border: '1px solid var(--border-gold)',
          textAlign: 'center'
        }}>
          <img src="/logo-delta.png" alt="Delta Capital" style={{ width: '100px', marginBottom: '20px' }} />
          <h2 className="gold-gradient-text" style={{ fontSize: '22px', fontWeight: 800, marginBottom: '15px' }}>
            CONFIGURACIÓN REQUERIDA EN NETLIFY
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '25px' }}>
            Faltan las variables de entorno de Supabase en producción. Para solucionarlo, debes agregarlas en el panel de control de Netlify.
          </p>
          <div style={{
            textAlign: 'left',
            backgroundColor: 'var(--bg-dark-input)',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid var(--border-dark)',
            fontSize: '13px',
            lineHeight: '1.8'
          }}>
            <strong style={{ color: 'var(--text-gold)', display: 'block', marginBottom: '10px' }}>Pasos para configurar:</strong>
            1. Abre tu cuenta de <strong>Netlify</strong> y ve a tu sitio.<br />
            2. Ve a <strong>Site Configuration</strong> &gt; <strong>Environment variables</strong>.<br />
            3. Haz clic en <strong>Add a variable</strong> y añade estas tres:<br />
            &nbsp;&nbsp;• <code style={{ color: 'var(--text-gold)' }}>VITE_SUPABASE_URL</code>: URL de tu Supabase<br />
            &nbsp;&nbsp;• <code style={{ color: 'var(--text-gold)' }}>VITE_SUPABASE_ANON_KEY</code>: Anon Key de Supabase<br />
            &nbsp;&nbsp;• <code style={{ color: 'var(--text-gold)' }}>VITE_SUPABASE_SERVICE_ROLE_KEY</code>: Service Role Key de Supabase<br />
            4. Presiona <strong>Save</strong>.<br />
            5. Ve a la pestaña de <strong>Deploys</strong>, selecciona <strong>Trigger deploy</strong> &gt; <strong>Clear cache and deploy site</strong>.
          </div>
        </div>
      </div>
    );
  }

  const [sessionChecked, setSessionChecked] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setSessionChecked(true);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: any, session: any) => {
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setSessionChecked(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setSessionChecked(true);
    }
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  const handleLogout = () => {
    setProfile(null);
  };

  // Protected Route Wrapper (DOM stable, no node deletions)
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!sessionChecked) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-dark-deep)'
        }}>
          <span>Cargando Delta Capital CRM...</span>
        </div>
      );
    }

    if (!profile) {
      return <Navigate to="/login" replace />;
    }

    return (
      <Layout profile={profile} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate}>
        {children}
      </Layout>
    );
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={profile ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={() => {}} />} 
        />
        <Route 
          path="/register-kovex-internal" 
          element={<RegisterInternal />} 
        />

        {/* Protected Dashboard & CRM Modules */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard profile={profile} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/leads" 
          element={
            <ProtectedRoute>
              <Leads currentProfile={profile} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/pipeline" 
          element={
            <ProtectedRoute>
              <Pipeline currentProfile={profile} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/contacts" 
          element={
            <ProtectedRoute>
              <Contacts currentProfile={profile} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <Chat currentProfile={profile} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/attendance" 
          element={
            <ProtectedRoute>
              <Attendance currentProfile={profile} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/legal" 
          element={
            <ProtectedRoute>
              <Legal currentProfile={profile} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/automations" 
          element={
            <ProtectedRoute>
              <Automations />
            </ProtectedRoute>
          } 
        />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
