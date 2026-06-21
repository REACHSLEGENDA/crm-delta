import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { useAuthStore } from '@/store/authStore';
import { Menu, Search, Bell, MessageSquare, Plus, ChevronDown, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Topbar() {
  const navigate = useNavigate();
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const activeView = useUIStore((state) => state.activeView);
  const setNotificationsOpen = useUIStore((state) => state.setNotificationsOpen);
  const setGlobalSearchOpen = useUIStore((state) => state.setGlobalSearchOpen);
  const addToast = useNotificationsStore((state) => state.addToast);
  
  const profile = useAuthStore((state) => state.profile);
  const notifications = useNotificationsStore((state) => state.notifications);
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const [activeShift, setActiveShift] = useState<any | null>(null);
  const [loadingShift, setLoadingShift] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  };

  const checkActiveShift = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('status', 'working');
      if (!error && data && data.length > 0) {
        setActiveShift(data[0]);
      } else {
        setActiveShift(null);
      }
    } catch (err) {
      console.error('Error fetching shift status', err);
    }
  };

  useEffect(() => {
    checkActiveShift();
  }, [profile]);

  const handleClockToggle = async () => {
    if (!profile?.id) return;
    setLoadingShift(true);
    try {
      if (activeShift) {
        // Clock out
        const { error } = await supabase
          .from('attendance')
          .update({ clock_out: new Date().toISOString(), status: 'completed' })
          .eq('id', activeShift.id);
        if (!error) {
          addToast({
            title: 'Turno finalizado',
            description: 'Tu marca de salida ha sido registrada con éxito.',
            type: 'success',
          });
          setActiveShift(null);
        }
      } else {
        // Clock in
        const { data, error } = await supabase
          .from('attendance')
          .insert({ profile_id: profile.id, clock_in: new Date().toISOString(), status: 'working' });
        if (!error) {
          addToast({
            title: 'Turno iniciado',
            description: 'Tu marca de entrada ha sido registrada con éxito.',
            type: 'success',
          });
          const insertedRecord = Array.isArray(data) ? data[0] : data;
          if (insertedRecord) {
            setActiveShift(insertedRecord);
          } else {
            checkActiveShift();
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingShift(false);
    }
  };

  const getBreadcrumbs = () => {
    switch (activeView) {
      case 'dashboard':
        return { title: 'Dashboard', crumb: 'Vista general · Delta Capital' };
      case 'prospectos':
        return { title: 'Prospectos', crumb: 'Gestión de captación · Leads activos' };
      case 'negociaciones':
        return { title: 'Negociaciones', crumb: 'Pipeline comercial · Tablero Kanban' };
      case 'contactos':
        return { title: 'Contactos', crumb: 'Directorio de clientes y traders' };
      case 'cumplimiento':
        return { title: 'Cumplimiento', crumb: 'Expedientes legales y KYC' };
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
        return { title: 'DELTA CAPITAL', crumb: 'Panel operativo' };
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
        {/* Attendance Button */}
        {profile && (
          <button
            onClick={handleClockToggle}
            disabled={loadingShift}
            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-bold transition-all ${
              activeShift 
                ? 'bg-kovex-danger/10 border-kovex-danger/30 text-kovex-danger hover:bg-kovex-danger/20' 
                : 'bg-kovex-primary/10 border-kovex-primary/30 text-kovex-primary hover:bg-kovex-primary/20'
            }`}
          >
            <Clock size={14} />
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeShift ? 'bg-kovex-danger animate-ping' : 'bg-kovex-success'}`} />
            {activeShift ? 'Finalizar Turno' : 'Iniciar Turno'}
          </button>
        )}

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
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kovex-primary to-kovex-accent flex items-center justify-center font-bold text-xs text-white">
            {profile ? getInitials(profile.full_name) : 'U'}
          </div>
          <ChevronDown size={12} className="text-kovex-muted" />
        </div>
      </div>
    </header>
  );
}
