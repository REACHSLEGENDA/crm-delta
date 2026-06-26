import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { Profile, UserStatus } from '../types';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Users, 
  Kanban, 
  Contact, 
  MessageSquare, 
  Clock, 
  FileText, 
  Cpu, 
  LogOut, 
  ChevronDown,
  Circle
} from 'lucide-react';

interface SidebarProps {
  profile: Profile | null;
  onLogout: () => void;
  onProfileUpdate: (newProfile: Profile) => void;
}

export default function Sidebar({ profile, onLogout, onProfileUpdate }: SidebarProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const navigate = useNavigate();

  const handleStatusChange = async (status: UserStatus) => {
    if (!profile) return;
    setShowStatusDropdown(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status, last_seen: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;

      onProfileUpdate({
        ...profile,
        status
      });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleLogoutClick = async () => {
    if (profile) {
      // Set status offline when logging out
      await supabase.from('profiles').update({ status: 'offline' }).eq('id', profile.id);
    }
    await supabase.auth.signOut();
    onLogout();
    navigate('/login');
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'online': return '#34d399'; // Green
      case 'ausente': return '#f59e0b'; // Amber
      case 'ocupado': return '#ef4444'; // Red
      case 'offline': default: return '#9ca3af'; // Gray
    }
  };

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--bg-dark-panel)',
      borderRight: '1px solid var(--border-gold-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid var(--border-dark)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <img src="/logo-delta.png" alt="Delta Capital" style={{ width: '40px', height: 'auto' }} />
        <div>
          <h1 className="gold-gradient-text" style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '1px' }}>
            DELTA CAPITAL
          </h1>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
            CRM &amp; Holding
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{
        flex: 1,
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        overflowY: 'auto'
      }}>
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `secondary-button ${isActive ? 'active-nav-link' : ''}`}
          style={navLinkStyle}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/leads" 
          className={({ isActive }) => `secondary-button ${isActive ? 'active-nav-link' : ''}`}
          style={navLinkStyle}
        >
          <Users size={18} />
          <span>Leads</span>
        </NavLink>

        <NavLink 
          to="/pipeline" 
          className={({ isActive }) => `secondary-button ${isActive ? 'active-nav-link' : ''}`}
          style={navLinkStyle}
        >
          <Kanban size={18} />
          <span>Pipeline (Deals)</span>
        </NavLink>

        <NavLink 
          to="/contacts" 
          className={({ isActive }) => `secondary-button ${isActive ? 'active-nav-link' : ''}`}
          style={navLinkStyle}
        >
          <Contact size={18} />
          <span>Contactos</span>
        </NavLink>

        <NavLink 
          to="/chat" 
          className={({ isActive }) => `secondary-button ${isActive ? 'active-nav-link' : ''}`}
          style={navLinkStyle}
        >
          <MessageSquare size={18} />
          <span>Chat Interno</span>
        </NavLink>

        <NavLink 
          to="/attendance" 
          className={({ isActive }) => `secondary-button ${isActive ? 'active-nav-link' : ''}`}
          style={navLinkStyle}
        >
          <Clock size={18} />
          <span>Asistencia</span>
        </NavLink>

        <NavLink 
          to="/legal" 
          className={({ isActive }) => `secondary-button ${isActive ? 'active-nav-link' : ''}`}
          style={navLinkStyle}
        >
          <FileText size={18} />
          <span>Legales</span>
        </NavLink>

        <NavLink 
          to="/automations" 
          className={({ isActive }) => `secondary-button ${isActive ? 'active-nav-link' : ''}`}
          style={navLinkStyle}
        >
          <Cpu size={18} />
          <span>Automatización</span>
        </NavLink>
      </nav>

      {/* User Footer Profile */}
      {profile && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--border-dark)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          position: 'relative'
        }}>
          {/* Status Dropdown */}
          <div 
            className={showStatusDropdown ? "flex" : "hidden"}
            style={{
              position: 'absolute',
              bottom: '75px',
              left: '12px',
              right: '12px',
              backgroundColor: 'var(--bg-dark-panel)',
              border: '1px solid var(--border-gold-subtle)',
              borderRadius: '8px',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-dark)',
              zIndex: 110,
              padding: '6px'
            }}
          >
            {(['online', 'ausente', 'ocupado', 'offline'] as UserStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-white)',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  borderRadius: '4px'
                }}
                className="status-dropdown-item"
              >
                <Circle size={10} fill={getStatusColor(st)} color={getStatusColor(st)} />
                <span style={{ textTransform: 'capitalize' }}>{st}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Avatar / Initials */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--gold-primary) 0%, var(--gold-secondary) 100%)',
              color: 'var(--bg-dark-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '16px'
            }}>
              {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </div>

            {/* Profile Info */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => setShowStatusDropdown(!showStatusDropdown)}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'inline-block',
                  maxWidth: '120px'
                }}>{profile.full_name}</span>
                <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Circle size={8} fill={getStatusColor(profile.status)} color={getStatusColor(profile.status)} />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500 }}>
                  {profile.role}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button 
              onClick={handleLogoutClick}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px'
              }}
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

const navLinkStyle: React.CSSProperties = {
  justifyContent: 'flex-start',
  padding: '12px 14px',
  width: '100%',
  border: 'none',
  fontSize: '14px',
  textDecoration: 'none',
  gap: '12px'
};
