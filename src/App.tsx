import { lazy, Suspense, type ComponentType } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "@/auth/useAuth";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { RoleGuard } from "@/auth/RoleGuard";
import { DashboardLayout } from "@/auth/DashboardLayout";
import { CumplimientoGuard } from "@/auth/CumplimientoGuard";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const namedLazy = <T extends Record<string, unknown>, K extends keyof T>(loader: () => Promise<T>, name: K) =>
  lazy(async () => ({ default: (await loader())[name] as ComponentType }));

const LoginPage = namedLazy(() => import("@/components/atomic-crm/login/LoginPage"), "LoginPage");
const Dashboard = namedLazy(() => import("@/modules/dashboard/Dashboard"), "Dashboard");
const ProspectosList = namedLazy(() => import("@/modules/prospectos/ProspectosList"), "ProspectosList");
const BurnList = namedLazy(() => import("@/modules/prospectos/BurnList"), "BurnList");
const NegociacionesKanban = namedLazy(() => import("@/modules/negociaciones/NegociacionesKanban"), "NegociacionesKanban");
const ContactosList = namedLazy(() => import("@/modules/contactos/ContactosList"), "ContactosList");
const EquipoDirectory = namedLazy(() => import("@/modules/equipo/EquipoDirectory"), "EquipoDirectory");
const ContactCenter = namedLazy(() => import("@/modules/contact-center/ContactCenter"), "ContactCenter");
const ChatInterno = namedLazy(() => import("@/modules/chat/ChatInterno"), "ChatInterno");
const AdminPanel = namedLazy(() => import("@/modules/admin/AdminPanel"), "AdminPanel");
const RegisterInternal = namedLazy(() => import("@/modules/admin/RegisterInternal"), "RegisterInternal");
const ImportExportPage = namedLazy(() => import("@/modules/import-export/ImportExportPage"), "ImportExportPage");
const CumplimientoDashboard = namedLazy(() => import("@/modules/cumplimiento/CumplimientoDashboard"), "CumplimientoDashboard");

const PageFallback = () => (
  <div className="grid min-h-[55vh] place-items-center">
    <div className="text-center">
      <span className="mx-auto mb-3 block h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Cargando módulo…</p>
    </div>
  </div>
);

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected CRM Routes inside DashboardLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prospectos"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProspectosList />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/negociaciones"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <NegociacionesKanban />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/burn"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["SUPERADMIN"]}>
                  <DashboardLayout>
                    <BurnList />
                  </DashboardLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contactos"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ContactosList />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipo"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EquipoDirectory />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact-center"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ContactCenter />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ChatInterno />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/import-export"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["SUPERADMIN"]}>
                  <DashboardLayout>
                    <ImportExportPage />
                  </DashboardLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cumplimiento"
            element={
              <ProtectedRoute>
                <CumplimientoGuard>
                  <DashboardLayout>
                    <CumplimientoDashboard />
                  </DashboardLayout>
                </CumplimientoGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/register-kovex-internal"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["SUPERADMIN", "MANAGER"]}>
                  <DashboardLayout>
                    <RegisterInternal />
                  </DashboardLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["SUPERADMIN"]}>
                  <DashboardLayout>
                    <AdminPanel />
                  </DashboardLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
