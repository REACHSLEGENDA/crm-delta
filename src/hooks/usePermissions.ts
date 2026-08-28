import { useAuth } from "@/auth/useAuth";

export const usePermissions = () => {
  const { profile, originalProfile } = useAuth();
  const role = profile?.role;
  const isAuditMode = Boolean(originalProfile && profile && originalProfile.id !== profile.id);

  const isSuperAdmin = role === "SUPERADMIN"; // Admin — acceso total
  const isManager    = role === "MANAGER";    // Gerente
  const isSupervisor = role === "SUPERVISOR"; // Supervisor
  const isAgent      = role === "AGENT";      // Ejecutivo

  // While auditing, `profile` is the impersonated user, so `role` reports the
  // borrowed role. The real identity lives in originalProfile, and an admin
  // keeps full control even while looking through someone else's eyes.
  const isRealSuperAdmin = (originalProfile ?? profile)?.role === "SUPERADMIN";
  const auditBlocked = isAuditMode && !isRealSuperAdmin;

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
    isRealSuperAdmin,
    auditBlocked,

    // ADMIN, GERENTE y SUPERVISOR pueden auditar / impersonar perspectivas
    canAudit: isSuperAdmin || isManager || isSupervisor,

    // Solo ADMIN puede eliminar registros
    canDelete: !auditBlocked && (isSuperAdmin || isRealSuperAdmin),

    // Exportar datos — solo ADMIN
    canExport: !auditBlocked && (isSuperAdmin || isRealSuperAdmin),

    // Importar datos — solo ADMIN
    canImport: !auditBlocked && (isSuperAdmin || isRealSuperAdmin),

    // Asignar leads a agentes — ADMIN + GERENTE + SUPERVISOR (o si el auditor original lo es)
    canAssignLeads: isSuperAdmin || isManager || isSupervisor || (isAuditMode && (originalProfile?.role === "SUPERADMIN" || originalProfile?.role === "MANAGER" || originalProfile?.role === "SUPERVISOR")),

    // Crear / registrar usuarios — ADMIN + GERENTE
    canCreateUsers: !auditBlocked && (isSuperAdmin || isManager || isRealSuperAdmin),

    // Modificar leads visibles — RLS limita a SUPERVISOR a su equipo.
    canEditAll: !auditBlocked && (isSuperAdmin || isManager || isSupervisor || isRealSuperAdmin),

    // Ver todos los leads (sin filtro de equipo/agente) — ADMIN + GERENTE + SUPERVISOR (o si el auditor original lo es)
    canViewAll: isSuperAdmin || isManager || isSupervisor || (isAuditMode && (originalProfile?.role === "SUPERADMIN" || originalProfile?.role === "MANAGER" || originalProfile?.role === "SUPERVISOR")),

    // Ver leads del equipo — ADMIN + GERENTE + SUPERVISOR
    canViewTeam: isSuperAdmin || isManager || isSupervisor,

    // Ver solo los propios — todos, pero es el scope de EJECUTIVO
    canEditOwn: !auditBlocked && isAgent,

    // Dashboard de monitoreo completo — ADMIN + GERENTE
    canMonitor: isSuperAdmin || isManager,

    // Alias retrocompatible
    canReadTeam: isSuperAdmin || isManager || isSupervisor,
  };
};
