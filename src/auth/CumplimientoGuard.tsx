import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const CumplimientoGuard = ({ children, fallback }: PermissionGuardProps) => {
  const { isSuperAdmin, isCompliance } = usePermissions();
  const hasAccess = isSuperAdmin || isCompliance;

  if (!hasAccess) {
    return (
      fallback ? <>{fallback}</> : (
        <div className="flex flex-col items-center justify-center p-8 text-center text-red-500">
          <p className="font-semibold text-lg">Acceso Denegado</p>
          <p className="text-sm text-[#94A3B8]">No tienes permisos para ver el módulo de cumplimiento.</p>
        </div>
      )
    );
  }

  return <>{children}</>;
};
