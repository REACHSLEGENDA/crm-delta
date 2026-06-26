// auth/RegisterPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { useNotificationsStore } from '@/store/notificationsStore';
import { Eye, EyeOff, Loader2, Mail, Lock, User, UserCheck, Shield, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const registerSchema = z.object({
  fullName: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  email: z.string().email({ message: 'Ingresa un correo electrónico válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  role: z.enum(['SUPERADMIN', 'MANAGER', 'SUPERVISOR', 'AGENTE']),
  department: z.enum(['ventas', 'retencion', 'cumplimiento', 'gerente']),
});

type RegisterFields = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const addToast = useNotificationsStore((state) => state.addToast);
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      role: 'AGENTE',
      department: 'ventas',
    }
  });

  // Particle background effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles: Array<{ x: number; y: number; speedX: number; speedY: number; radius: number; color: string }> = [];

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 0.6,
        speedY: (Math.random() - 0.5) * 0.6,
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
      
      // Draw cybernetic grids
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 50;
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

      // Update and draw glowing connections
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0 || p.x > width) p.speedX *= -1;
        if (p.y < 0 || p.y > height) p.speedY *= -1;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        particles.forEach((other) => {
          const dist = Math.hypot(p.x - other.x, p.y - other.y);
          if (dist < 120) {
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = (1 - dist / 120) * 0.03;
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

  const onSubmit = async (data: RegisterFields) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: data.role,
            department: data.department,
          }
        }
      });

      if (error) {
        addToast({
          title: 'Error de registro',
          description: error.message,
          type: 'error'
        });
      } else {
        setSuccess(true);
        addToast({
          title: 'Usuario Creado',
          description: `El usuario ${data.fullName} fue registrado con éxito.`,
          type: 'success'
        });
      }
    } catch (err: any) {
      addToast({
        title: 'Error inesperado',
        description: err.message || 'Ocurrió un error al intentar crear el usuario.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAnother = () => {
    setSuccess(false);
    reset();
  };

  return (
    <div className="relative w-screen h-screen bg-kovex-bg text-kovex-text font-body overflow-hidden flex items-center justify-center p-4">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      
      {/* Decorative Glow */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-kovex-primary/10 blur-[120px] top-1/4 left-1/4 pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-kovex-accent/5 blur-[120px] bottom-1/4 right-1/4 pointer-events-none" />

      {/* Floating Header */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <img src="/delta.png" alt="Delta Logo" className="w-9 h-9 object-contain flex-shrink-0" />
        <div>
          <span className="font-display font-extrabold text-sm tracking-wider block leading-none text-white">DELTA CAPITAL</span>
          <span className="text-[9px] text-kovex-muted tracking-[2px] uppercase">Control Panel</span>
        </div>
      </div>

      <div className="absolute top-8 right-8 flex items-center gap-2 border border-kovex-border rounded-lg px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-kovex-muted bg-kovex-surface/40 backdrop-blur-md">
        <Globe size={12} /> Portal Interno
      </div>

      {/* Main card */}
      <div className="w-full max-w-md bg-[#0F1525]/60 border border-kovex-border/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl shadow-black/40 relative z-10">
        {!success ? (
          <>
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-kovex-accent bg-kovex-primary/10 border border-kovex-primary/20 mb-3 uppercase tracking-wider">
                <Shield size={10} /> Registro Restringido
              </span>
              <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">Alta de Usuarios</h2>
              <p className="text-kovex-muted text-xs mt-1">
                Registra una nueva cuenta en la base de datos con asignación de rol y departamento.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-kovex-muted uppercase tracking-wider">
                  Nombre Completo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-kovex-muted">
                    <User size={15} />
                  </span>
                  <input
                    type="text"
                    placeholder="ej. Juan Pérez"
                    {...register('fullName')}
                    className="w-full bg-kovex-surface border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl py-2.5 pl-9 pr-4 text-xs outline-none transition-all focus:ring-4 focus:ring-kovex-primary/10"
                  />
                </div>
                {errors.fullName && (
                  <span className="text-[10px] text-kovex-danger mt-1 block">{errors.fullName.message}</span>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-kovex-muted uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-kovex-muted">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    placeholder="ej. jperez@kovex.net"
                    {...register('email')}
                    className="w-full bg-kovex-surface border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl py-2.5 pl-9 pr-4 text-xs outline-none transition-all focus:ring-4 focus:ring-kovex-primary/10"
                  />
                </div>
                {errors.email && (
                  <span className="text-[10px] text-kovex-danger mt-1 block">{errors.email.message}</span>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-kovex-muted uppercase tracking-wider">
                  Contraseña Temporal
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-kovex-muted">
                    <Lock size={15} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className="w-full bg-kovex-surface border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl py-2.5 pl-9 pr-9 text-xs outline-none transition-all focus:ring-4 focus:ring-kovex-primary/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-kovex-muted hover:text-white"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && (
                  <span className="text-[10px] text-kovex-danger mt-1 block">{errors.password.message}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Role Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-kovex-muted uppercase tracking-wider">
                    Rol
                  </label>
                  <select
                    {...register('role')}
                    className="w-full bg-kovex-surface border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl py-2.5 px-3 text-xs outline-none transition-all focus:ring-4 focus:ring-kovex-primary/10 cursor-pointer"
                  >
                    <option value="AGENTE">AGENTE</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="SUPERADMIN">SUPERADMIN</option>
                  </select>
                </div>

                {/* Department Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-kovex-muted uppercase tracking-wider">
                    Departamento
                  </label>
                  <select
                    {...register('department')}
                    className="w-full bg-kovex-surface border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl py-2.5 px-3 text-xs outline-none transition-all focus:ring-4 focus:ring-kovex-primary/10 cursor-pointer"
                  >
                    <option value="ventas">Ventas</option>
                    <option value="retencion">Retención</option>
                    <option value="cumplimiento">Cumplimiento</option>
                    <option value="gerente">Gerencia</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-kovex-primary to-kovex-accent hover:brightness-105 active:scale-[0.99] text-[#060b16] font-bold py-3 px-4 rounded-xl transition-all shadow-[0_4px_16px_rgba(197,160,89,0.25)] flex items-center justify-center gap-2 text-xs mt-6 notranslate"
              >
                <span className={loading ? "flex items-center gap-2" : "hidden"}>
                  <Loader2 size={14} className="animate-spin text-[#060b16]" /> Registrando usuario...
                </span>
                <span className={!loading ? "block" : "hidden"}>
                  Registrar Nuevo Usuario
                </span>
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-kovex-success/10 border border-kovex-success/30 flex items-center justify-center text-kovex-success mx-auto mb-4 animate-bounce">
              <UserCheck size={28} />
            </div>
            <h2 className="font-display font-extrabold text-xl text-white tracking-tight">¡Registro Exitoso!</h2>
            <p className="text-kovex-muted text-xs mt-2 px-4 leading-relaxed">
              El usuario ha sido registrado y su perfil público fue creado correctamente con el rol y departamento especificados.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={handleRegisterAnother}
                className="w-full bg-kovex-surface border border-kovex-border hover:border-kovex-border/80 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
              >
                Registrar otro usuario
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-kovex-primary to-kovex-accent hover:brightness-105 text-[#060b16] font-bold py-2.5 px-4 rounded-xl text-xs transition-all"
              >
                Ir a Iniciar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
