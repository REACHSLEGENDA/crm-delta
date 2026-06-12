import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  LayoutDashboard, UserPlus, GitBranch, Users, Zap, Filter, 
  PhoneCall, MessageSquare, ShieldAlert, LogOut, ChevronLeft, ChevronRight, Settings2 
} from 'lucide-react';

export default function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const activeView = useUIStore((state) => state.activeView);
  const setActiveView = useUIStore((state) => state.setActiveView);
  const navigate = useNavigate();
  
  const profile = useAuthStore((state) => state.profile);

  const logout = useAuthStore((state) => state.logout);
  const updateStatus = useAuthStore((state) => state.updateProfileStatus);
  const permissions = usePermissions();

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  };

  const navGroups = [
    {
      label: 'Operación',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowed: true },
        { id: 'prospectos', label: 'Prospectos', icon: UserPlus, allowed: true },
        { id: 'negociaciones', label: 'Negociaciones', icon: GitBranch, allowed: true },
        { id: 'contactos', label: 'Contactos', icon: Users, allowed: true },
      ]
    },
    {
      label: 'Automatización',
      items: [
        { id: 'automatizacion', label: 'Flujos', icon: Zap, allowed: permissions.canAccessAutomations },
        { id: 'reglas', label: 'Reglas', icon: Filter, allowed: permissions.canAccessRules },
      ]
    },
    {
      label: 'Comunicación',
      items: [
        { id: 'contactcenter', label: 'Contact Center', icon: PhoneCall, allowed: true },
        { id: 'chat', label: 'Chat Interno', icon: MessageSquare, allowed: true },
      ]
    },
    {
      label: 'Administración',
      items: [
        { id: 'admin', label: 'Usuarios', icon: ShieldAlert, allowed: permissions.canAccessAdmin },
      ]
    }
  ];

  const statusColors = {
    online: 'bg-kovex-success',
    ausente: 'bg-kovex-warning',
    ocupado: 'bg-kovex-danger',
    offline: 'bg-kovex-muted',
  };

  return (
    <aside
      className={`bg-kovex-surface border-r border-kovex-border h-screen flex flex-col justify-between transition-all duration-300 relative z-30 select-none ${
        collapsed ? 'w-20' : 'w-60'
      }`}
    >
      {/* Brand Logo */}
      <div className="flex items-center justify-between p-5 border-b border-kovex-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-kovex-primary to-[#7B0E55] flex items-center justify-center flex-shrink-0 font-display font-extrabold text-xl text-white shadow-[0_4px_14px_rgba(233,30,140,0.25)]">
            K
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-display font-extrabold text-base tracking-wider text-white">KOVEX</span>
              <span className="text-[9px] text-kovex-muted tracking-[2px] uppercase mt-0.5">CRM v1.0</span>
            </div>
          )}
        </div>
        
        {/* Toggle Collapse */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-kovex-elevated border border-kovex-border flex items-center justify-center text-kovex-muted hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group, gIdx) => {
          const visibleItems = group.items.filter((item) => item.allowed);
          if (visibleItems.length === 0) return null;

          return (
            <div key={gIdx} className="space-y-1">
              {!collapsed && (
                <span className="text-[10px] text-kovex-muted font-bold tracking-[1.5px] uppercase pl-3 block mb-2">
                  {group.label}
                </span>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id === 'dashboard' ? '/' : `/${item.id}`)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 py-3 px-3 rounded-xl transition-all relative ${
                      active
                        ? 'bg-kovex-primary/10 text-white font-bold'
                        : 'text-kovex-muted hover:text-kovex-text hover:bg-white/[0.02]'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-3 bottom-3 w-1 bg-kovex-primary rounded-r" />
                    )}
                    <Icon size={18} className={active ? 'text-kovex-primary' : ''} />
                    {!collapsed && <span className="text-sm">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-kovex-border bg-black/10 relative">
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer" onClick={() => setShowStatusDropdown(!showStatusDropdown)}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-kovex-primary to-[#7B0E55] flex items-center justify-center font-bold text-sm text-white select-none">
              {profile ? getInitials(profile.full_name) : 'U'}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-kovex-surface ${
                statusColors[profile?.status || 'offline']
              }`}
            />
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{profile?.full_name || 'Diego Ramírez'}</h4>
              <span className="text-[10px] text-kovex-muted font-semibold uppercase tracking-wider block mt-0.5">
                {profile?.role || 'SUPERADMIN'}
              </span>
            </div>
          )}

          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-2 text-kovex-muted hover:text-kovex-primary hover:bg-kovex-elevated rounded-xl transition-all ml-auto"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Status Dropdown */}
        {showStatusDropdown && (
          <div className="absolute bottom-16 left-4 bg-kovex-elevated border border-kovex-border rounded-xl p-2 w-40 shadow-2xl z-40 space-y-1">
            <div className="text-[9px] text-kovex-muted font-bold uppercase tracking-wider px-2 py-1">Estado</div>
            {(['online', 'ausente', 'ocupado', 'offline'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  updateStatus(st);
                  setShowStatusDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-kovex-text hover:bg-white/[0.04] capitalize text-left"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${statusColors[st]}`} />
                {st}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
