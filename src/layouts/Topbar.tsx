import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { useAuthStore } from '@/store/authStore';
import { Menu, Search, Bell, MessageSquare, Plus, ChevronDown } from 'lucide-react';

export default function Topbar() {
  const navigate = useNavigate();
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const activeView = useUIStore((state) => state.activeView);
  const setNotificationsOpen = useUIStore((state) => state.setNotificationsOpen);
  const setGlobalSearchOpen = useUIStore((state) => state.setGlobalSearchOpen);
  
  const profile = useAuthStore((state) => state.profile);
  const notifications = useNotificationsStore((state) => state.notifications);
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const getInitials = (name: string) => {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  };

  const getBreadcrumbs = () => {
    switch (activeView) {
      case 'dashboard':
        return { title: 'Dashboard', crumb: 'Vista general · Hoy, 12 jun' };
      case 'prospectos':
        return { title: 'Prospectos', crumb: 'Gestión de captación · Leads activos' };
      case 'negociaciones':
        return { title: 'Negociaciones', crumb: 'Pipeline comercial · Tablero Kanban' };
      case 'contactos':
        return { title: 'Contactos', crumb: 'Directorio de clientes y traders' };
      case 'automatizacion':
        return { title: 'Automatización', crumb: 'Flujos lógicos del sistema' };
      case 'reglas':
        return { title: 'Reglas de Negocio', crumb: 'Motor de automatización condicional' };
      case 'contactcenter':
        return { title: 'Contact Center', crumb: 'Mesa telefónica y llamadas' };
      case 'chat':
        return { title: 'Chat Interno', crumb: 'Comunicación en tiempo real' };
      case 'admin':
        return { title: 'Usuarios', crumb: 'Panel de administración SUPERADMIN' };
      default:
        return { title: 'KOVEX CRM', crumb: 'Panel operativo' };
    }
  };

  const { title, crumb } = getBreadcrumbs();

  return (
    <header className="h-16 border-b border-kovex-border bg-kovex-bg flex items-center justify-between px-6 relative z-20 select-none">
      {/* View Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-kovex-surface text-kovex-muted hover:text-white transition-colors"
        >
          <Menu size={18} />
        </button>
        <div className="flex flex-col">
          <h2 className="font-display font-extrabold text-sm text-white leading-tight">{title}</h2>
          <span className="text-[10px] text-kovex-muted font-medium mt-0.5">{crumb}</span>
        </div>
      </div>

      {/* Global Search CMD+K Trigger */}
      <div
        onClick={() => setGlobalSearchOpen(true)}
        className="hidden sm:flex items-center gap-2 bg-kovex-surface border border-kovex-border hover:border-kovex-primary/30 rounded-xl px-4 py-2 w-72 text-kovex-muted hover:text-white transition-all cursor-pointer"
      >
        <Search size={14} />
        <span className="text-xs flex-1 text-left">Buscar prospectos, tratos...</span>
        <kbd className="bg-kovex-elevated border border-kovex-border text-[9px] px-1.5 py-0.5 rounded font-mono">
          ⌘K
        </kbd>
      </div>

      {/* Right Top Actions */}
      <div className="flex items-center gap-4">
        {/* Messages Shortcut */}
        <button
          onClick={() => navigate('/chat')}
          className="p-2 bg-kovex-surface border border-kovex-border hover:border-kovex-border/80 text-kovex-muted hover:text-white rounded-xl transition-all relative"
        >
          <MessageSquare size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-kovex-primary" />
        </button>

        {/* Notifications trigger */}
        <button
          onClick={() => setNotificationsOpen(true)}
          className="p-2 bg-kovex-surface border border-kovex-border hover:border-kovex-border/80 text-kovex-muted hover:text-white rounded-xl transition-all relative"
        >
          <Bell size={16} />
          {unreadNotifCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-kovex-primary text-white text-[9px] font-bold px-1 py-0.5 rounded-full min-w-4 h-4 flex items-center justify-center border border-kovex-bg">
              {unreadNotifCount}
            </span>
          )}
        </button>

        {/* User profile dropdown button */}
        <div className="flex items-center gap-2 border-l border-kovex-border pl-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kovex-primary to-[#7B0E55] flex items-center justify-center font-bold text-xs text-white">
            {profile ? getInitials(profile.full_name) : 'U'}
          </div>
          <ChevronDown size={12} className="text-kovex-muted" />
        </div>
      </div>
    </header>
  );
}
