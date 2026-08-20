import { useAuth } from "./useAuth";
import { Navigate } from "react-router";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, originalProfile, accessIssue, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#080D1C] text-[#D4AF37]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (accessIssue === "inactive" || originalProfile?.active === false) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#080D1C] text-center p-6 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500 bg-red-950/20 text-red-500 text-xl font-bold">
          !
        </div>
        <h1 className="text-xl font-title text-[#D4AF37] font-bold">Cuenta Inhabilitada</h1>
        <p className="text-xs text-[#94A3B8] max-w-sm leading-relaxed">
          Tu acceso al CRM fue desactivado. Contacta a un administrador si consideras que se trata de un error.
        </p>
        <button onClick={logout} className="gold-button-secondary px-4 py-2 text-xs font-semibold rounded">
          Cerrar Sesión
        </button>
      </div>
    );
  }

  // If the user is authenticated in Supabase Auth but has no usable profile.
  if (!originalProfile) {
    const loadFailed = accessIssue === "profile_load_failed";
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#080D1C] text-center p-6 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500 bg-red-950/20 text-red-500 text-xl font-bold">
          !
        </div>
        <h1 className="text-xl font-title text-[#D4AF37] font-bold">
          {loadFailed ? "No se pudo validar tu acceso" : "Perfil No Encontrado"}
        </h1>
        <p className="text-xs text-[#94A3B8] max-w-sm leading-relaxed">
          {loadFailed
            ? "No fue posible consultar tu perfil de seguridad. Recarga la página o vuelve a iniciar sesión."
            : <>Tu cuenta de autenticación está activa, pero no se encontró un perfil comercial asociado.</>}
        </p>
        <div className="flex gap-3">
          <button 
            onClick={logout}
            className="gold-button-secondary px-4 py-2 text-xs font-semibold rounded"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
