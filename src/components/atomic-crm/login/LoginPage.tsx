import { useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

export const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    const { data: profile, error: profileError } = userId
      ? await supabase.from("profiles").select("active").eq("id", userId).maybeSingle()
      : { data: null, error: null };

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setError("No se pudo validar el perfil asociado a esta cuenta.");
      setLoading(false);
      return;
    }

    if (!profile.active) {
      await supabase.auth.signOut();
      setError("Esta cuenta está inhabilitada. Contacta a un administrador.");
      setLoading(false);
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <div className="relative grid w-full lg:grid-cols-2">
        {/* Left Branding Panel */}
        <div className="relative hidden h-full flex-col justify-between border-r border-sidebar-border bg-sidebar p-12 text-sidebar-foreground lg:flex">
          {/* Top Logo */}
          <div className="relative z-20 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-primary/35 bg-primary/10 shadow-lg">
              <img src="/logo.png" alt="Delta Capital" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="font-title text-base font-bold tracking-[0.14em] text-primary">
                DELTA CAPITAL
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="live-dot" />
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/70">
                  Sistema Activo
                </span>
              </div>
            </div>
          </div>

          {/* Center Callout */}
          <div className="relative z-20 my-auto max-w-sm space-y-5">
            <h2 className="font-title text-4xl font-light leading-tight text-sidebar-foreground">
              Operaciones privadas de<br />
              <span className="font-normal text-primary">ventas e inversión</span>
            </h2>
            <div className="h-px w-24 bg-gradient-to-r from-primary via-info to-transparent" />
            <p className="text-sm leading-relaxed text-sidebar-foreground/75">
              Control institucional de prospectos, equipos, negociaciones y flujo financiero en un solo espacio.
            </p>
          </div>

          {/* Footer notice */}
          <div className="relative z-20 text-xs text-sidebar-foreground/60">
            © {new Date().getFullYear()} Delta Capital & Holding Street. Todos los derechos reservados.
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="relative flex w-full flex-col justify-center bg-background p-5 sm:p-8">
          <div className="absolute top-0 left-0 w-full">
            <div className="market-gradient-line" />
          </div>
          <div className="absolute right-5 top-5 z-20 sm:right-8 sm:top-8">
            <ThemeSwitcher />
          </div>

          <div className="w-full lg:mx-auto lg:w-[380px]">
            {/* Mobile logo */}
            <div className="mb-8 flex items-center gap-2.5 pr-14 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-primary/35">
                <img src="/logo.png" alt="Delta Capital" className="h-full w-full object-cover" />
              </div>
              <span className="font-title text-sm font-bold tracking-[0.14em] text-primary">DELTA CAPITAL</span>
            </div>

            <div className="space-y-7 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl sm:p-8">
              <div className="space-y-1.5">
                <h1 className="font-title text-2xl font-semibold tracking-tight">
                  Acceso Privado
                </h1>
                <p className="text-sm text-muted-foreground">
                  Ingresa tus credenciales para acceder al sistema
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-foreground/75">
                    Correo electrónico
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="nombre@empresa.com"
                    className="min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-foreground/75">
                    Contraseña
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="min-h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 sm:text-sm"
                  />
                </div>

                {error && (
                  <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="gold-button-primary min-h-11 w-full rounded-lg text-sm font-semibold"
                >
                  {loading ? (
                    <div className="flex items-center gap-2 justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/35 border-t-primary-foreground" />
                      <span>Verificando...</span>
                    </div>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </Button>
              </form>

              <div className="text-center">
                <a
                  href="/forgot-password"
                  className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
