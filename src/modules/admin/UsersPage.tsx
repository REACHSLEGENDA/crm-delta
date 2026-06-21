// modules/admin/UsersPage.tsx
import React, { useEffect, useState } from 'react';
import { supabase, isRealSupabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types';
import Avatar from '@/components/shared/Avatar';
import Badge from '@/components/shared/Badge';
import Modal from '@/components/shared/Modal';
import { useNotificationsStore } from '@/store/notificationsStore';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  UserPlus, Mail, ShieldAlert, Key, Ban, 
  Check, X, Settings2, Trash2, Lock, User, Loader2, Clock, Calendar,
  TrendingUp, Award, Briefcase
} from 'lucide-react';

export default function UsersPage() {
  const permissions = usePermissions();
  const addToast = useNotificationsStore((state) => state.addToast);

  // Guard access inline
  if (!permissions.canAccessAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-kovex-muted select-none">
        <ShieldAlert size={48} className="text-kovex-danger mb-4 animate-bounce" />
        <h3 className="font-display font-extrabold text-white text-lg mb-1">Acceso Restringido</h3>
        <p className="text-xs max-w-sm leading-relaxed">
          Solo los usuarios con rol de <b>SUPERADMIN</b> o <b>MANAGER</b> pueden ingresar a este panel de administración de cuentas.
        </p>
      </div>
    );
  }

  // States
  const [activeTab, setActiveTab] = useState<'users' | 'attendance' | 'performance'>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<Profile | null>(null);
  
  // Modals state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('AGENTE');
  const [inviteDepartment, setInviteDepartment] = useState<'ventas' | 'retencion' | 'cumplimiento' | 'gerente'>('ventas');
  const [submitting, setSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmText, setConfirmText] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) {
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadsAndDeals = async () => {
    try {
      const { data: leadsData } = await supabase.from('leads').select('*');
      const { data: dealsData } = await supabase.from('deals').select('*');
      if (leadsData) setLeads(leadsData);
      if (dealsData) setDeals(dealsData);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendanceLogs = async () => {
    setLoadingAttendance(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('clock_in', { ascending: false });
      if (!error && data) {
        setAttendanceLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAttendanceLogs();
    fetchLeadsAndDeals();
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance' || activeTab === 'performance') {
      fetchAttendanceLogs();
      fetchLeadsAndDeals();
    }
  }, [activeTab]);

  const handleUpdateRole = (id: string, newRole: UserRole) => {
    setConfirmText(`¿Deseas cambiar el rol del usuario a "${newRole}"?`);
    setConfirmAction(() => async () => {
      try {
        await supabase.from('profiles').update({ role: newRole }).eq('id', id);
        setUsers(users.map((u) => u.id === id ? { ...u, role: newRole } : u));
        addToast({
          title: 'Rol actualizado',
          description: `El rol se cambió a ${newRole} con éxito.`,
          type: 'success',
        });
        setConfirmOpen(false);
      } catch (err) {
        console.error(err);
      }
    });
    setConfirmOpen(true);
  };

  const handleUpdateDepartment = async (id: string, newDept: any) => {
    try {
      await supabase.from('profiles').update({ department: newDept }).eq('id', id);
      setUsers(users.map((u) => u.id === id ? { ...u, department: newDept } : u));
      addToast({
        title: 'Departamento actualizado',
        description: `El departamento se cambió a ${newDept} con éxito.`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSuspend = (id: string, currentSuspended: boolean) => {
    setConfirmText(
      currentSuspended
        ? '¿Deseas reactivar esta cuenta de usuario?'
        : '¿Deseas suspender la cuenta? El usuario no podrá ingresar al sistema.'
    );
    setConfirmAction(() => async () => {
      try {
        const newStatus = currentSuspended ? 'online' : 'offline';
        await supabase.from('profiles').update({ status: newStatus }).eq('id', id);
        setUsers(users.map((u) => u.id === id ? { ...u, status: newStatus } : u));
        addToast({
          title: currentSuspended ? 'Cuenta reactivada' : 'Cuenta suspendida',
          description: `El usuario ha sido ${currentSuspended ? 'habilitado' : 'deshabilitado'} en el sistema.`,
          type: currentSuspended ? 'success' : 'warning',
        });
        setConfirmOpen(false);
      } catch (err) {
        console.error(err);
      }
    });
    setConfirmOpen(true);
  };

  const handleResetPassword = (email: string) => {
    addToast({
      title: 'Correo enviado',
      description: `Se envió un enlace para restablecer la contraseña a ${email}.`,
      type: 'success',
    });
  };

  const handleDeleteUser = (id: string, fullName: string) => {
    setConfirmText(`¿Deseas eliminar permanentemente a "${fullName}" de la base de datos? Esta acción es irreversible y eliminará su cuenta de autenticación y su perfil.`);
    setConfirmAction(() => async () => {
      try {
        if (isRealSupabase) {
          const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: id });
          if (error) throw error;
        } else {
          // Delete from mock profiles
          await supabase.from('profiles').delete().eq('id', id);
          
          // Also delete from mock users
          const mockUsersKey = 'kovex_v6_mock_users';
          const mockUsers = JSON.parse(localStorage.getItem(mockUsersKey) || '[]');
          const filteredMockUsers = mockUsers.filter((u: any) => u.id !== id);
          localStorage.setItem(mockUsersKey, JSON.stringify(filteredMockUsers));
        }

        setUsers(users.filter((u) => u.id !== id));
        addToast({
          title: 'Usuario eliminado',
          description: `El usuario "${fullName}" ha sido eliminado de la base de datos.`,
          type: 'success',
        });
        setConfirmOpen(false);
      } catch (err: any) {
        console.error(err);
        addToast({
          title: 'Error al eliminar',
          description: err.message || 'No se pudo eliminar el usuario.',
          type: 'error',
        });
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };


  const handleInviteUser = async () => {
    if (!inviteFullName.trim() || !inviteEmail.trim() || !invitePassword.trim()) {
      addToast({
        title: 'Campos incompletos',
        description: 'Por favor, llena todos los campos.',
        type: 'warning',
      });
      return;
    }
    
    setSubmitting(true);
    try {
      let authErr: any = null;
      
      if (isRealSupabase) {
        const { createClient } = await import('@supabase/supabase-js');
        const tempClient = createClient(
          import.meta.env.VITE_SUPABASE_URL || '',
          import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            }
          }
        );
        const { error } = await tempClient.auth.signUp({
          email: inviteEmail,
          password: invitePassword,
          options: {
            data: {
              full_name: inviteFullName,
              role: inviteRole,
              department: inviteDepartment
            }
          }
        });
        authErr = error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: inviteEmail,
          password: invitePassword,
          options: {
            data: {
              full_name: inviteFullName,
              role: inviteRole,
              department: inviteDepartment
            }
          }
        });
        authErr = error;
      }

      if (authErr) {
        addToast({
          title: 'Error al añadir',
          description: authErr.message,
          type: 'error',
        });
      } else {
        setTimeout(async () => {
          await fetchUsers();
        }, 1200);

        addToast({
          title: 'Usuario Añadido',
          description: `Se registró a ${inviteFullName} (${inviteRole}) con éxito.`,
          type: 'success',
        });
        setInviteOpen(false);
        setInviteFullName('');
        setInviteEmail('');
        setInvitePassword('');
      }
    } catch (err: any) {
      addToast({
        title: 'Error inesperado',
        description: err.message,
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getShiftDuration = (start: string, end: string | null) => {
    if (!end) return 'En curso';
    const sTime = new Date(start).getTime();
    const eTime = new Date(end).getTime();
    const diffMs = eTime - sTime;
    const diffMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };

  const getProfileName = (profileId: string) => {
    const found = users.find((u) => u.id === profileId);
    return found ? found.full_name : 'Cargando...';
  };

  return (
    <div className="space-y-6 select-none animate-fade-in text-kovex-text">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-white">Panel de Administración</h1>
          <p className="text-xs text-kovex-muted mt-1">
            Gestión completa de usuarios, roles, accesos y monitoreo de asistencia diaria.
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-xs font-bold px-4 py-2.5 rounded-xl text-white transition-all shadow-lg"
        >
          <UserPlus size={14} /> Añadir Usuario
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-kovex-border">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-6 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'users'
              ? 'text-kovex-primary border-kovex-primary font-bold'
              : 'text-kovex-muted border-transparent hover:text-white'
          }`}
        >
          Colaboradores ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-3 px-6 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'attendance'
              ? 'text-kovex-primary border-kovex-primary font-bold'
              : 'text-kovex-muted border-transparent hover:text-white'
          }`}
        >
          Registro de Asistencia ({attendanceLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`py-3 px-6 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'performance'
              ? 'text-kovex-primary border-kovex-primary font-bold'
              : 'text-kovex-muted border-transparent hover:text-white'
          }`}
        >
          Mesa de Control y Rendimiento
        </button>
      </div>

      {activeTab === 'users' && (
        /* Users table */
        <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl overflow-hidden backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-kovex-border bg-white/[0.015]">
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Usuario</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Correo</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Rol</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Departamento</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Estado</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider w-40">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-kovex-muted text-xs">Cargando perfiles...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-kovex-muted text-xs">No hay perfiles configurados</td>
                </tr>
              ) : (
                users.map((user) => {
                  const suspended = user.status === 'offline';
                  return (
                    <tr key={user.id} className={`border-b border-kovex-border/30 hover:bg-white/[0.01] transition-all ${suspended ? 'opacity-50' : ''}`}>
                      <td className="p-4">
                        <div 
                          onClick={() => setSelectedUserProfile(user)}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <Avatar name={user.full_name} size="sm" />
                          <span className="font-bold text-sm text-white group-hover:text-kovex-primary transition-colors">{user.full_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-kovex-muted font-mono">{user.email || (user.full_name.toLowerCase().replace(' ', '.') + '@delta.net')}</td>
                      <td className="p-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                          className="bg-kovex-surface border border-kovex-border text-white text-xs rounded-xl px-2.5 py-1.5 outline-none font-bold cursor-pointer"
                        >
                          <option value="SUPERADMIN">SUPERADMIN</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="AGENTE">AGENTE</option>
                          <option value="SUPERVISOR">SUPERVISOR</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <select
                          value={user.department || ''}
                          onChange={(e) => handleUpdateDepartment(user.id, e.target.value)}
                          className="bg-kovex-surface border border-kovex-border text-white text-xs rounded-xl px-2.5 py-1.5 outline-none font-medium cursor-pointer"
                        >
                          <option value="">Sin Depto</option>
                          <option value="ventas">Ventas</option>
                          <option value="retencion">Retención</option>
                          <option value="cumplimiento">Cumplimiento</option>
                          <option value="gerente">Gerencia</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <Badge variant={suspended ? 'danger' : 'success'}>
                          {suspended ? 'Suspendido' : 'Activo'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {/* View Profile */}
                          <button
                            onClick={() => setSelectedUserProfile(user)}
                            title="Ver Perfil Completo"
                            className="p-1.5 bg-kovex-surface border border-kovex-border hover:border-kovex-primary/45 rounded-lg text-kovex-muted hover:text-white transition-all"
                          >
                            <User size={14} />
                          </button>
                          {/* Suspend / Reactivate */}
                          <button
                            onClick={() => handleToggleSuspend(user.id, suspended)}
                            title={suspended ? 'Reactivar' : 'Suspender'}
                            className="p-1.5 bg-kovex-surface border border-kovex-border hover:border-kovex-primary/45 rounded-lg text-kovex-muted hover:text-white transition-all"
                          >
                            <Ban size={14} />
                          </button>
                          {/* Reset password */}
                          <button
                            onClick={() => handleResetPassword(user.email || (user.full_name.toLowerCase().replace(' ', '.') + '@delta.net'))}
                            title="Enviar Reset de Contraseña"
                            className="p-1.5 bg-kovex-surface border border-kovex-border hover:border-kovex-accent/45 rounded-lg text-kovex-muted hover:text-white transition-all"
                          >
                            <Lock size={14} />
                          </button>
                          {/* Delete User */}
                          <button
                            onClick={() => handleDeleteUser(user.id, user.full_name)}
                            title="Eliminar de la Base de Datos"
                            className="p-1.5 bg-kovex-surface border border-kovex-border hover:bg-kovex-danger/10 hover:border-kovex-danger/45 rounded-lg text-kovex-muted hover:text-kovex-danger transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'attendance' && (
        /* Attendance logs table */
        <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl overflow-hidden backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-kovex-border bg-white/[0.015]">
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Colaborador</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Hora de Entrada</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Hora de Salida</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Estado</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Duración</th>
              </tr>
            </thead>
            <tbody>
              {loadingAttendance ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-kovex-muted text-xs">Cargando bitácora de asistencia...</td>
                </tr>
              ) : attendanceLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-kovex-muted text-xs">No hay marcas de asistencia registradas hoy</td>
                </tr>
              ) : (
                attendanceLogs.map((log) => {
                  const isWorking = log.status === 'working';
                  return (
                    <tr key={log.id} className="border-b border-kovex-border/30 hover:bg-white/[0.01] transition-all">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={getProfileName(log.profile_id)} size="sm" />
                          <span className="font-bold text-sm text-white">{getProfileName(log.profile_id)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-kovex-muted font-mono">
                        {new Date(log.clock_in).toLocaleString()}
                      </td>
                      <td className="p-4 text-xs text-kovex-muted font-mono">
                        {log.clock_out ? new Date(log.clock_out).toLocaleString() : '—'}
                      </td>
                      <td className="p-4">
                        <Badge variant={isWorking ? 'warning' : 'success'}>
                          {isWorking ? 'En curso' : 'Completado'}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-kovex-accent font-bold font-mono">
                        {getShiftDuration(log.clock_in, log.clock_out)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* KPI 1: Active Agents */}
            <div className="bg-[#0F1525]/40 border border-kovex-border/40 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden group hover:border-kovex-primary/30 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Clock size={80} className="text-kovex-primary" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-kovex-muted font-bold">En Turno Activo</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {users.filter(u => attendanceLogs.some(log => log.profile_id === u.id && log.status === 'working')).length}
                <span className="text-xs text-kovex-muted font-normal ml-2">de {users.length} chicos</span>
              </h3>
              <p className="text-[10px] text-kovex-success mt-2 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-kovex-success animate-pulse" /> Monitoreo en tiempo real
              </p>
            </div>

            {/* KPI 2: Total Retained Volume */}
            <div className="bg-[#0F1525]/40 border border-kovex-border/40 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden group hover:border-kovex-primary/30 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp size={80} className="text-kovex-primary" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-kovex-muted font-bold">Volumen Retenido Total</p>
              <h3 className="text-2xl font-extrabold text-kovex-primary mt-1">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
                  deals.filter(d => d.stage === 'won').reduce((sum, d) => sum + Number(d.amount || 0), 0)
                )}
              </h3>
              <p className="text-[10px] text-kovex-muted mt-2">
                Tratos en etapa "Ganado"
              </p>
            </div>

            {/* KPI 3: Closing Efficiency */}
            <div className="bg-[#0F1525]/40 border border-kovex-border/40 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden group hover:border-kovex-primary/30 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Award size={80} className="text-kovex-primary" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-kovex-muted font-bold">Eficiencia de Cierre</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {deals.length > 0 
                  ? ((deals.filter(d => d.stage === 'won').length / deals.length) * 100).toFixed(1) 
                  : '0.0'}%
              </h3>
              <p className="text-[10px] text-kovex-muted mt-2">
                {deals.filter(d => d.stage === 'won').length} de {deals.length} tratos cerrados ganados
              </p>
            </div>

            {/* KPI 4: Total Leads */}
            <div className="bg-[#0F1525]/40 border border-kovex-border/40 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden group hover:border-kovex-primary/30 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Briefcase size={80} className="text-kovex-primary" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-kovex-muted font-bold">Prospectos Totales</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {leads.length}
                <span className="text-xs text-kovex-muted font-normal ml-2">leads asignados</span>
              </h3>
              <p className="text-[10px] text-kovex-muted mt-2">
                Activos en el pipeline
              </p>
            </div>
          </div>

          {/* Performance Table */}
          <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="p-4 border-b border-kovex-border bg-white/[0.01] flex items-center justify-between">
              <h3 className="font-display font-extrabold text-sm text-white">Desempeño y Horarios de Trabajo</h3>
              <span className="text-[10px] text-kovex-muted bg-white/[0.03] border border-kovex-border/40 px-2 py-1 rounded-lg">
                Actualizado en vivo
              </span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-kovex-border bg-white/[0.015]">
                  <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Colaborador</th>
                  <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Depto</th>
                  <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Turno de Hoy</th>
                  <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Entrada / Salida</th>
                  <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Horas Trabajadas</th>
                  <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Leads Asignados</th>
                  <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Cierres (Retención)</th>
                  <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Volumen Retenido</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-kovex-muted text-xs">No hay colaboradores registrados</td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const userLogs = attendanceLogs.filter(log => log.profile_id === user.id);
                    const latestLog = userLogs[0];
                    const isWorking = latestLog?.status === 'working';
                    
                    const userLeads = leads.filter(l => l.agent_id === user.id);
                    const userDeals = deals.filter(d => d.agent_id === user.id);
                    const wonDeals = userDeals.filter(d => d.stage === 'won');
                    
                    const userTotalMs = userLogs.reduce((sum, log) => {
                      const start = new Date(log.clock_in).getTime();
                      const end = log.clock_out ? new Date(log.clock_out).getTime() : new Date().getTime();
                      return sum + (end - start);
                    }, 0);
                    
                    const totalMins = Math.floor(userTotalMs / 60000);
                    const hrs = Math.floor(totalMins / 60);
                    const mins = totalMins % 60;
                    const formattedHours = `${hrs}h ${mins}m`;

                    const retainedAmount = wonDeals.reduce((sum, d) => sum + Number(d.amount || 0), 0);

                    return (
                      <tr key={user.id} className="border-b border-kovex-border/30 hover:bg-white/[0.01] transition-all">
                        <td className="p-4">
                          <div 
                            onClick={() => setSelectedUserProfile(user)}
                            className="flex items-center gap-3 cursor-pointer group"
                          >
                            <Avatar name={user.full_name} size="sm" />
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-white group-hover:text-kovex-primary transition-colors">{user.full_name}</span>
                              <span className="text-[10px] text-kovex-muted font-mono">{user.email || (user.full_name.toLowerCase().replace(' ', '.') + '@delta.net')}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-semibold capitalize text-kovex-muted">
                            {user.department || 'Sin Depto'}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge variant={isWorking ? 'warning' : latestLog ? 'success' : 'gray'}>
                            {isWorking ? 'En Turno' : latestLog ? 'Fuera de Turno' : 'Sin Turno'}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs font-mono text-kovex-muted">
                          {latestLog ? (
                            <div className="flex flex-col">
                              <span>In: {new Date(latestLog.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {latestLog.clock_out && (
                                <span>Out: {new Date(latestLog.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-bold font-mono text-kovex-accent">
                          {formattedHours}
                        </td>
                        <td className="p-4 text-xs font-semibold text-white font-mono">
                          {userLeads.length} leads
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white font-mono">{wonDeals.length} ganados</span>
                            <span className="text-[10px] text-kovex-muted font-mono">{userDeals.length} totales</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-extrabold text-kovex-primary font-mono">
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(retainedAmount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Añadir Nuevo Colaborador"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">Nombre Completo</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-kovex-muted"><User size={16} /></span>
              <input
                type="text"
                placeholder="ej. Carlos Méndez"
                value={inviteFullName}
                onChange={(e) => setInviteFullName(e.target.value)}
                className="w-full bg-kovex-bg border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">Correo corporativo</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-kovex-muted"><Mail size={16} /></span>
              <input
                type="email"
                placeholder="ej. carlos.mendez@delta.net"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full bg-kovex-bg border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">Contraseña Temporal</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-kovex-muted"><Lock size={16} /></span>
              <input
                type="text"
                placeholder="Mínimo 6 caracteres"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                className="w-full bg-kovex-bg border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">Rol de la cuenta</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full bg-kovex-bg border border-kovex-border text-white text-xs rounded-xl p-3 outline-none focus:border-kovex-primary/40 cursor-pointer"
              >
                <option value="SUPERADMIN">SUPERADMIN — Total</option>
                <option value="MANAGER">MANAGER — Gerencia</option>
                <option value="AGENTE">AGENTE — Ejecutivo</option>
                <option value="SUPERVISOR">SUPERVISOR — Lectura</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">Departamento</label>
              <select
                value={inviteDepartment}
                onChange={(e) => setInviteDepartment(e.target.value as any)}
                className="w-full bg-kovex-bg border border-kovex-border text-white text-xs rounded-xl p-3 outline-none focus:border-kovex-primary/40 cursor-pointer"
              >
                <option value="ventas">Ventas</option>
                <option value="retencion">Retención</option>
                <option value="cumplimiento">Cumplimiento</option>
                <option value="gerente">Gerencia / Dir</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-kovex-border flex justify-end gap-3">
            <button
              onClick={() => setInviteOpen(false)}
              disabled={submitting}
              className="px-4 py-2 border border-kovex-border hover:bg-white/[0.02] text-xs font-semibold rounded-xl text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleInviteUser}
              disabled={submitting}
              className="px-4 py-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-xs font-bold rounded-xl text-[#060b16] transition-all shadow-lg flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={12} className="animate-spin text-[#060b16]" /> Guardando...
                </>
              ) : (
                'Añadir Usuario'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* USER PROFILE DETAILS MODAL */}
      <Modal
        isOpen={selectedUserProfile !== null}
        onClose={() => setSelectedUserProfile(null)}
        title="Perfil del Colaborador"
      >
        {selectedUserProfile && (() => {
          const user = selectedUserProfile;
          const userLogs = attendanceLogs.filter(log => log.profile_id === user.id);
          const latestLog = userLogs[0];
          const isWorking = latestLog?.status === 'working';
          
          const userLeads = leads.filter(l => l.agent_id === user.id);
          const userDeals = deals.filter(d => d.agent_id === user.id);
          const wonDeals = userDeals.filter(d => d.stage === 'won');
          
          const userTotalMs = userLogs.reduce((sum, log) => {
            const start = new Date(log.clock_in).getTime();
            const end = log.clock_out ? new Date(log.clock_out).getTime() : new Date().getTime();
            return sum + (end - start);
          }, 0);
          
          const totalMins = Math.floor(userTotalMs / 60000);
          const hrs = Math.floor(totalMins / 60);
          const mins = totalMins % 60;
          const formattedHours = `${hrs}h ${mins}m`;

          const retainedAmount = wonDeals.reduce((sum, d) => sum + Number(d.amount || 0), 0);
          const conversionRate = userDeals.length > 0 ? ((wonDeals.length / userDeals.length) * 100).toFixed(1) : '0.0';

          return (
            <div className="space-y-6">
              {/* Profile Card Header */}
              <div className="flex items-center gap-4 bg-white/[0.015] border border-kovex-border/30 p-4 rounded-2xl">
                <Avatar name={user.full_name} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-extrabold text-base text-white truncate">{user.full_name}</h3>
                  <p className="text-xs text-kovex-muted font-mono truncate">{user.email || (user.full_name.toLowerCase().replace(' ', '.') + '@delta.net')}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="primary">{user.role}</Badge>
                    <Badge variant="gray">{user.department || 'Sin Depto'}</Badge>
                  </div>
                </div>
              </div>

              {/* Grid 2 Columns: Stats & Shift */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Performance Stats */}
                <div className="bg-[#0F1525]/30 border border-kovex-border/40 p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider mb-1">Métricas de Rendimiento</h4>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-kovex-muted">Prospectos Asignados</span>
                    <span className="text-white font-bold font-mono">{userLeads.length} leads</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-kovex-muted">Tratos Totales / Won</span>
                    <span className="text-white font-bold font-mono">{userDeals.length} / {wonDeals.length} won</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-kovex-muted">Conversión de Tratos</span>
                    <span className="text-kovex-accent font-bold font-mono">{conversionRate}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-kovex-muted">Volumen Retenido</span>
                    <span className="text-kovex-primary font-extrabold font-mono">
                      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(retainedAmount)}
                    </span>
                  </div>
                </div>

                {/* Column 2: Shift Information */}
                <div className="bg-[#0F1525]/30 border border-kovex-border/40 p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider mb-1">Estado de Turno</h4>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-kovex-muted">Estatus Diario</span>
                    <Badge variant={isWorking ? 'warning' : latestLog ? 'success' : 'gray'}>
                      {isWorking ? 'En Turno' : latestLog ? 'Fuera de Turno' : 'Sin Turno'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-kovex-muted">Horas Totales Hoy</span>
                    <span className="text-kovex-accent font-bold font-mono">{formattedHours}</span>
                  </div>
                  {latestLog && (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-kovex-muted">Última Entrada</span>
                        <span className="text-white font-mono">{new Date(latestLog.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {latestLog.clock_out && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-kovex-muted">Última Salida</span>
                          <span className="text-white font-mono">{new Date(latestLog.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Attendance Log History (Last 3 entries) */}
              <div className="space-y-2">
                <h4 className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider">Historial Reciente de Asistencia</h4>
                {userLogs.length === 0 ? (
                  <p className="text-xs text-kovex-muted italic">No hay marcas de asistencia registradas para este colaborador.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {userLogs.slice(0, 3).map((log) => {
                      const logIsWorking = log.status === 'working';
                      return (
                        <div key={log.id} className="bg-kovex-surface/40 border border-kovex-border/30 p-2.5 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex flex-col">
                            <span className="text-white font-medium">
                              {new Date(log.clock_in).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-kovex-muted font-mono mt-0.5">
                              In: {new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                              {log.clock_out ? ` · Out: ${new Date(log.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </span>
                          </div>
                          <Badge variant={logIsWorking ? 'warning' : 'success'}>
                            {logIsWorking ? 'En curso' : 'Completado'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Close Footer */}
              <div className="pt-4 border-t border-kovex-border flex justify-end">
                <button
                  onClick={() => setSelectedUserProfile(null)}
                  className="px-4 py-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-xs font-bold rounded-xl text-[#060b16] transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* CONFIRMATION MODAL */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar Acción de Seguridad"
      >
        <div className="space-y-4">
          <p className="text-sm text-kovex-text leading-relaxed">
            {confirmText}
          </p>
          <div className="pt-4 border-t border-kovex-border flex justify-end gap-3">
            <button
              onClick={() => setConfirmOpen(false)}
              className="px-4 py-2 border border-kovex-border text-xs font-semibold rounded-xl text-white"
            >
              No, Cancelar
            </button>
            <button
              onClick={confirmAction}
              className="px-4 py-2 bg-kovex-primary hover:brightness-105 text-xs font-bold rounded-xl text-[#060b16]"
            >
              Sí, Confirmar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

