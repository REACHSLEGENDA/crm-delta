// auth/LoginPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '@/store/authStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { Eye, EyeOff, Loader2, Mail, Lock, ShieldCheck, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const loginSchema = z.object({
  email: z.string().email({ message: 'Ingresa un correo electrónico válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  remember: z.boolean(),
});

type LoginFields = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);
  const addToast = useNotificationsStore((state) => state.addToast);
  
  const [showPassword, setShowPassword] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: true,
    }
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Market Particle effect on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles: Array<{ x: number; y: number; speedX: number; speedY: number; radius: number; color: string }> = [];

    // Create particles (using gold/bronze palette)
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? '#c5a059' : '#dfc080',
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw simulated market chart line in background (Gold/Bronze)
      ctx.strokeStyle = 'rgba(197, 160, 89, 0.08)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.7);
      for (let i = 0; i < width; i += 20) {
        const yVal = height * 0.6 + Math.sin(i * 0.01 + Date.now() * 0.001) * 40 + Math.cos(i * 0.02) * 20;
        ctx.lineTo(i, yVal);
      }
      ctx.stroke();

      // Update and draw particles
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0 || p.x > width) p.speedX *= -1;
        if (p.y < 0 || p.y > height) p.speedY *= -1;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Connect near particles
        particles.forEach((other) => {
          const dist = Math.hypot(p.x - other.x, p.y - other.y);
          if (dist < 100) {
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = (1 - dist / 100) * 0.05;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const onSubmit = async (data: LoginFields) => {
    const res = await login(data.email, data.password, data.remember);
    if (res.success) {
      addToast({
        title: 'Acceso concedido',
        description: '¡Bienvenido de vuelta a DELTA CAPITAL!',
        type: 'success',
      });
      navigate('/');
    } else {
      addToast({
        title: 'Error de autenticación',
        description: res.error || 'Credenciales inválidas.',
        type: 'error',
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 h-screen w-screen bg-kovex-bg text-kovex-text font-body overflow-hidden">
      {/* BRAND PANEL - LEFT */}
      <div className="relative hidden md:flex flex-col justify-between p-12 bg-gradient-to-b from-[#060b16] via-[#0c1222] to-[#141d33] border-r border-kovex-border overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        
        {/* Top brand */}
        <div className="flex items-center gap-3 relative z-10">
          <img src="/delta.png" alt="Delta Logo" className="w-10 h-10 object-contain flex-shrink-0" />
          <div>
            <span className="font-display font-extrabold text-lg tracking-wider block leading-none text-white">DELTA CAPITAL</span>
            <span className="text-[10px] text-kovex-muted tracking-[3px] uppercase">Holding Street</span>
          </div>
        </div>

        {/* Center content */}
        <div className="max-w-md relative z-10 my-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-kovex-accent bg-kovex-primary/10 border border-kovex-primary/20 mb-6 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-kovex-primary animate-pulse" />
            Mesa de trading activa
          </span>
          <h1 className="font-display font-extrabold text-4xl lg:text-5xl leading-tight tracking-tight text-white mb-6">
            El centro de control de tu{' '}
            <span className="bg-gradient-to-r from-kovex-primary to-[#dfc080] bg-clip-text text-transparent">
              mesa de trading.
            </span>
          </h1>
          <p className="text-kovex-muted text-base leading-relaxed">
            Gestiona prospectos, negociaciones y tu contact center en un solo lugar. Automatización inteligente para que tu equipo cierre más rápido.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-white/[0.02] border border-kovex-border rounded-xl p-4 backdrop-blur-md">
              <div className="font-mono font-extrabold text-2xl text-kovex-primary">428</div>
              <div className="text-[10px] text-kovex-muted uppercase tracking-wider mt-1">Prospectos</div>
            </div>
            <div className="bg-white/[0.02] border border-kovex-border rounded-xl p-4 backdrop-blur-md">
              <div className="font-mono font-extrabold text-2xl text-kovex-accent">$184K</div>
              <div className="text-[10px] text-kovex-muted uppercase tracking-wider mt-1">Revenue Mes</div>
            </div>
            <div className="bg-white/[0.02] border border-kovex-border rounded-xl p-4 backdrop-blur-md">
              <div className="font-mono font-extrabold text-2xl text-white">23.8%</div>
              <div className="text-[10px] text-kovex-muted uppercase tracking-wider mt-1">Cierre</div>
            </div>
          </div>
        </div>

        {/* Foot info */}
        <div className="flex justify-between items-center text-xs text-kovex-muted relative z-10">
          <span>© 2026 DELTA CAPITAL & Holding Street</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-kovex-accent" /> SOC 2</span>
            <span>Cifrado E2E</span>
          </div>
        </div>
      </div>

      {/* LOGIN FORM PANEL - RIGHT */}
      <div className="flex items-center justify-center p-8 relative">
        <div className="absolute top-8 right-8 flex items-center gap-2 border border-kovex-border rounded-lg px-3 py-1.5 text-xs text-kovex-muted bg-kovex-surface">
          <Globe size={14} /> ES · México
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="font-display font-extrabold text-3xl text-white tracking-tight">Bienvenido</h2>
            <p className="text-kovex-muted text-sm mt-2">
              Ingresa tus credenciales para acceder a tu panel DELTA CAPITAL.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">
                Correo corporativo
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-kovex-muted">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  placeholder="ej. diego@kovex.net"
                  {...register('email')}
                  className="w-full bg-kovex-surface border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-all focus:ring-4 focus:ring-kovex-primary/10"
                />
              </div>
              {errors.email && (
                <span className="text-xs text-kovex-danger mt-1.5 block">{errors.email.message}</span>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider">
                  Contraseña
                </label>
                <a href="#" className="text-xs text-kovex-primary hover:underline font-semibold" onClick={(e) => e.preventDefault()}>
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-kovex-muted">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full bg-kovex-surface border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl py-3 pl-10 pr-10 text-sm outline-none transition-all focus:ring-4 focus:ring-kovex-primary/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-kovex-muted hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <span className="text-xs text-kovex-danger mt-1.5 block">{errors.password.message}</span>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                {...register('remember')}
                className="w-4 h-4 accent-kovex-primary rounded bg-kovex-surface border-kovex-border focus:ring-0"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-kovex-muted cursor-pointer select-none">
                Recordarme en este equipo
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-kovex-primary to-kovex-accent hover:brightness-105 active:scale-[0.99] text-[#060b16] font-bold py-3 px-4 rounded-xl transition-all shadow-[0_4px_16px_rgba(197,160,89,0.25)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-[#060b16]" /> Verificando acceso...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-kovex-muted">
            ¿No tienes cuenta? <span className="text-kovex-primary font-semibold">Solicítala a tu supervisor</span>
          </div>
        </div>
      </div>
    </div>
  );
}
