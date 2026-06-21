// hooks/usePermissions.ts
import { useAuthStore } from '@/store/authStore';

export function usePermissions() {
  const profile = useAuthStore((state) => state.profile);

  const role = profile?.role || 'AGENTE';
  const department = profile?.department || null;

  const isSuperAdmin = role === 'SUPERADMIN';
  const isManager = role === 'MANAGER';
  const isSupervisor = role === 'SUPERVISOR';
  const isAgente = role === 'AGENTE';

  const isVentas = department === 'ventas';
  const isRetencion = department === 'retencion';
  const isCumplimiento = department === 'cumplimiento';

  // If the agent is in Sales or Retention, they are subject to restricted view/edit of their own leads
  const isSalesOrRetentionAgent = isAgente && (isVentas || isRetencion);

  return {
    role,
    department,
    isSuperAdmin,
    isManager,
    isSupervisor,
    isAgente,
    isVentas,
    isRetencion,
    isCumplimiento,
    isSalesOrRetentionAgent,
    
    // Module permissions
    canAccessAdmin: isSuperAdmin || isManager, // Gerente can also see user management (create users)
    canAccessAutomations: isSuperAdmin || isManager,
    canAccessRules: isSuperAdmin || isManager,
    canAccessCompliance: isSuperAdmin || isManager || isSupervisor || isCumplimiento,
    
    // Action permissions
    canCreateLead: !isSupervisor && department !== 'ventas',
    canViewLead: (agentId: string | null) => {
      if (isSuperAdmin || isManager || isSupervisor || isCumplimiento) return true;
      if (!agentId) return false;
      return profile?.id === agentId;
    },
    canEditLead: (agentId: string | null) => {
      if (isSupervisor || department === 'ventas') return false;
      if (isSuperAdmin || isManager) return true;
      return profile?.id === agentId; // Agents only edit their own
    },
    canDeleteLead: (isSuperAdmin || isManager) && department !== 'ventas',
    
    canCreateDeal: !isSupervisor && department !== 'ventas',
    canEditDeal: (agentId: string | null) => {
      if (isSupervisor || department === 'ventas') return false;
      if (isSuperAdmin || isManager) return true;
      return profile?.id === agentId;
    },
    canDeleteDeal: (isSuperAdmin || isManager) && department !== 'ventas',

    canAssignLeads: (isSuperAdmin || isManager || isSupervisor) && department !== 'ventas',
    canImportLeads: (isSuperAdmin || isManager) && department !== 'ventas',
    canExportLeads: isSuperAdmin && department !== 'ventas', // SUPERADMIN only
    canViewAllAttendance: (isSuperAdmin || isManager) && department !== 'ventas',
    canViewAllLeads: (isSuperAdmin || isManager || isSupervisor || isCumplimiento) && department !== 'ventas',
  };
}

