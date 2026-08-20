import { useAuth } from "@/auth/useAuth";

export const usePermissions = () => {
  const { profile, originalProfile } = useAuth();
  const role = profile?.role;
  const isAuditMode = Boolean(originalProfile && profile && originalProfile.id !== profile.id);

  const isSuperAdmin = role === "SUPERADMIN"; // Admin — acceso total
  const isManager    = role === "MANAGER";    // Gerente
  const isSupervisor = role === "SUPERVISOR"; // Supervisor
  const isAgent      = role === "AGENT";      // Ejecutivo

  const department = profile?.department || 'Ventas';
  
  const isSales = department === 'Ventas';
  const isRetention = department === 'Retencion';
  const isCompliance = department === 'Cumplimiento';

  return {
    role,
    department,
    isSuperAdmin,
    isManager,
    isSupervisor,
    isAgent,
    isSales,
    isRetention,
    isCompliance,
    isAuditMode,

    // Solo ADMIN puede auditar / impersonar perspectivas
    canAudit: isSuperAdmin,

    // Solo ADMIN puede eliminar registros
    canDelete: !isAuditMode && isSuperAdmin,

    // Exportar datos — solo ADMIN
    canExport: !isAuditMode && isSuperAdmin,

    // Importar datos — solo ADMIN
    canImport: !isAuditMode && isSuperAdmin,

    // Asignar leads a agentes — ADMIN + GERENTE + SUPERVISOR
    canAssignLeads: !isAuditMode && (isSuperAdmin || isManager || isSupervisor),

    // Crear / registrar usuarios — ADMIN + GERENTE
    canCreateUsers: !isAuditMode && (isSuperAdmin || isManager),

    // Modificar cualquier lead — ADMIN + GERENTE
    canEditAll: !isAuditMode && (isSuperAdmin || isManager),

    // Ver todos los leads (sin filtro de equipo/agente) — ADMIN + GERENTE
    canViewAll: isSuperAdmin || isManager,

    // Ver leads del equipo — ADMIN + GERENTE + SUPERVISOR
    canViewTeam: isSuperAdmin || isManager || isSupervisor,

    // Ver solo los propios — todos, pero es el scope de EJECUTIVO
    canEditOwn: !isAuditMode && isAgent,

    // Dashboard de monitoreo completo — ADMIN + GERENTE
    canMonitor: isSuperAdmin || isManager,

    // Alias retrocompatible
    canReadTeam: isSuperAdmin || isManager || isSupervisor,
  };
};
