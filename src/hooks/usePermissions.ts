// hooks/usePermissions.ts
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';

export function usePermissions() {
  const profile = useAuthStore((state) => state.profile);

  const role = profile?.role || 'AGENTE';

  return {
    role,
    isSuperAdmin: role === 'SUPERADMIN',
    isManager: role === 'MANAGER',
    isAgente: role === 'AGENTE',
    isSupervisor: role === 'SUPERVISOR',
    
    // Module permissions
    canAccessAdmin: role === 'SUPERADMIN',
    canAccessAutomations: role === 'SUPERADMIN' || role === 'MANAGER',
    canAccessRules: role === 'SUPERADMIN' || role === 'MANAGER',
    
    // Action permissions
    canCreateLead: role !== 'SUPERVISOR',
    canEditLead: (agentId: string | null) => {
      if (role === 'SUPERVISOR') return false;
      if (role === 'SUPERADMIN' || role === 'MANAGER') return true;
      return profile?.id === agentId; // Agents only edit their own
    },
    canDeleteLead: role === 'SUPERADMIN' || role === 'MANAGER',
    
    canCreateDeal: role !== 'SUPERVISOR',
    canEditDeal: (agentId: string | null) => {
      if (role === 'SUPERVISOR') return false;
      if (role === 'SUPERADMIN' || role === 'MANAGER') return true;
      return profile?.id === agentId;
    },
    canDeleteDeal: role === 'SUPERADMIN' || role === 'MANAGER',
  };
}
