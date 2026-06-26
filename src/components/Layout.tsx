import React from 'react';
import Sidebar from './Sidebar';
import type { Profile } from '../types';

interface LayoutProps {
  profile: Profile | null;
  onLogout: () => void;
  onProfileUpdate: (newProfile: Profile) => void;
  children: React.ReactNode;
}

export default function Layout({ profile, onLogout, onProfileUpdate, children }: LayoutProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-dark-deep)' }}>
      <Sidebar 
        profile={profile} 
        onLogout={onLogout} 
        onProfileUpdate={onProfileUpdate} 
      />
      <main style={{
        flex: 1,
        marginLeft: '260px',
        padding: '30px',
        minHeight: '100vh',
        width: 'calc(100% - 260px)',
        overflowY: 'auto'
      }}>
        {children}
      </main>
    </div>
  );
}
