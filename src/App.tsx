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
  const [sessionChecked, setSessionChecked] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setSessionChecked(true);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
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
