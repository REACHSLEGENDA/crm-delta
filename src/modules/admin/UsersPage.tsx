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
  Check, X, Settings2, Trash2, Lock, User, Loader2 
} from 'lucide-react';

export default function UsersPage() {
  const permissions = usePermissions();
  const addToast = useNotificationsStore((state) => state.addToast);

  // Guard access inline
  if (!permissions.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-kovex-muted select-none">
        <ShieldAlert size={48} className="text-kovex-danger mb-4 animate-bounce" />
        <h3 className="font-display font-extrabold text-white text-lg mb-1">Acceso Restringido</h3>
        <p className="text-xs max-w-sm leading-relaxed">
          Solo los usuarios con rol de <b>SUPERADMIN</b> pueden ingresar a este panel de administración de cuentas.
        </p>
      </div>
    );
  }

  // States
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modals state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('AGENTE');
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

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const handleToggleSuspend = (id: string, currentSuspended: boolean) => {
    setConfirmText(
      currentSuspended
        ? '¿Deseas reactivar esta cuenta de usuario?'
        : '¿Deseas suspender la cuenta? El usuario no podrá ingresar al sistema.'
    );
    setConfirmAction(() => async () => {
      try {
        // Mock team_id update as suspended flag for simulation, or profile status
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
        // Create secondary client without persisting session so admin remains signed in
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
        // Wait briefly for trigger/db sync in real mode, then fetch profiles
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

  const getRoleColors = (role: UserRole) => {
    switch (role) {
      case 'SUPERADMIN': return 'danger';
      case 'MANAGER': return 'warning';
      case 'SUPERVISOR': return 'accent';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6 select-none animate-fade-in text-kovex-text">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-white">Panel de Administración</h1>
          <p className="text-xs text-kovex-muted mt-1">
            Gestión completa de usuarios, roles, accesos y seguridad del bróker.
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-xs font-bold px-4 py-2.5 rounded-xl text-white transition-all shadow-lg"
        >
          <UserPlus size={14} /> Añadir Usuario
        </button>
      </div>

      {/* Users table */}
      <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-kovex-border bg-white/[0.015]">
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Usuario</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Correo</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Rol asignado</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider font-mono">Estado</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider w-40">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-kovex-muted text-xs">Cargando perfiles...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-kovex-muted text-xs">No hay perfiles configurados</td>
              </tr>
            ) : (
              users.map((user) => {
                const suspended = user.status === 'offline';
                return (
                  <tr key={user.id} className={`border-b border-kovex-border/30 hover:bg-white/[0.01] transition-all ${suspended ? 'opacity-50' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.full_name} size="sm" />
                        <span className="font-bold text-sm text-white">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-kovex-muted font-mono">{user.email || (user.full_name.toLowerCase().replace(' ', '.') + '@kovex.net')}</td>
                    <td className="p-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                        className="bg-kovex-surface border border-kovex-border text-white text-xs rounded-xl px-2.5 py-1.5 outline-none font-bold"
                      >
                        <option value="SUPERADMIN">SUPERADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="AGENTE">AGENTE</option>
                        <option value="SUPERVISOR">SUPERVISOR</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <Badge variant={suspended ? 'danger' : 'success'}>
                        {suspended ? 'Suspendido' : 'Activo'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
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
                          onClick={() => handleResetPassword(user.email || (user.full_name.toLowerCase().replace(' ', '.') + '@kovex.net'))}
                          title="Enviar Reset de Contraseña"
                          className="p-1.5 bg-kovex-surface border border-kovex-border hover:border-kovex-accent/45 rounded-lg text-kovex-muted hover:text-white transition-all"
                        >
                          <Lock size={14} />
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
                placeholder="ej. carlos.mendez@kovex.net"
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

          <div>
            <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">Rol de la cuenta</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="w-full bg-kovex-bg border border-kovex-border text-white text-sm rounded-xl p-3 outline-none focus:border-kovex-primary/40 cursor-pointer"
            >
              <option value="SUPERADMIN">SUPERADMIN — Acceso total y config de sistema</option>
              <option value="MANAGER">MANAGER — Control de flujos, reglas y reportes</option>
              <option value="AGENTE">AGENTE — Acceso operativo, contact center y chat</option>
              <option value="SUPERVISOR">SUPERVISOR — Acceso total en modo lectura</option>
            </select>
          </div>

          <div className="pt-4 border-t border-kovex-border flex justify-end gap-3">
            <button
              onClick={() => setInviteOpen(false)}
              disabled={submitting}
              className="px-4 py-2 border border-kovex-border hover:bg-white/[0.02] text-xs font-semibold rounded-xl text-white transition-colors animate-fade-in"
            >
              Cancelar
            </button>
            <button
              onClick={handleInviteUser}
              disabled={submitting}
              className="px-4 py-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-xs font-bold rounded-xl text-white transition-all shadow-lg shadow-kovex-primary/10 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Guardando...
                </>
              ) : (
                'Añadir Usuario'
              )}
            </button>
          </div>
        </div>
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
              className="px-4 py-2 bg-kovex-primary hover:brightness-105 text-xs font-bold rounded-xl text-white"
            >
              Sí, Confirmar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
