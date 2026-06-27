import { useAuth } from "@/auth/useAuth";

export const usePermissions = () => {
  const { profile } = useAuth();
  const role = profile?.role;

  const isSuperAdmin = role === "SUPERADMIN"; // Admin — acceso total
  const isManager    = role === "MANAGER";    // Gerente
  const isSupervisor = role === "SUPERVISOR"; // Supervisor
  const isAgent      = role === "AGENT";      // Ejecutivo

  return {
    role,
    isSuperAdmin,
    isManager,
    isSupervisor,
    isAgent,

    // Solo ADMIN puede auditar / impersonar perspectivas
    canAudit: isSuperAdmin,

    // Solo ADMIN puede eliminar registros
    canDelete: isSuperAdmin,

    // Exportar datos — solo ADMIN (Gerente puede importar pero NO exportar)
    canExport: isSuperAdmin,

    // Importar datos — ADMIN + GERENTE
    canImport: isSuperAdmin || isManager,

    // Asignar leads a agentes — ADMIN + GERENTE + SUPERVISOR
    canAssignLeads: isSuperAdmin || isManager || isSupervisor,

    // Crear / registrar usuarios — ADMIN + GERENTE
    canCreateUsers: isSuperAdmin || isManager,

    // Modificar cualquier lead — ADMIN + GERENTE
    canEditAll: isSuperAdmin || isManager,

    // Ver todos los leads (sin filtro de equipo/agente) — ADMIN + GERENTE
    canViewAll: isSuperAdmin || isManager,

    // Ver leads del equipo — ADMIN + GERENTE + SUPERVISOR
    canViewTeam: isSuperAdmin || isManager || isSupervisor,

    // Ver solo los propios — todos, pero es el scope de EJECUTIVO
    canEditOwn: isAgent,

    // Dashboard de monitoreo completo — ADMIN + GERENTE
    canMonitor: isSuperAdmin || isManager,

    // Alias retrocompatible
    canReadTeam: isSuperAdmin || isManager || isSupervisor,
  };
};
