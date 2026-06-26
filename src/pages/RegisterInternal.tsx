import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole, Department } from '../types';
import { Shield, Mail, Lock, User, Briefcase, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RegisterInternal() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('AGENTE');
  const [department, setDepartment] = useState<Department>('ventas');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccess(false);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            department: department
          }
        }
      });

      if (error) throw error;

      if (data) {
        setSuccess(true);
        setFullName('');
        setEmail('');
        setPassword('');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al registrar el colaborador.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '500px',
        padding: '40px',
        border: '1px solid var(--border-gold)'
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src="/logo-delta.png" alt="Delta Capital" style={{ width: '120px', marginBottom: '15px' }} />
          <h2 className="gold-gradient-text" style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '1px', marginBottom: '5px' }}>
            REGISTRO INTERNO
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Alta de colaboradores y asignación de credenciales
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-gold)', marginBottom: '6px', fontWeight: 600 }}>
              Nombre Completo
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="text-input"
                style={{ paddingLeft: '40px' }}
                placeholder="Ej. Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-gold)', marginBottom: '6px', fontWeight: 600 }}>
              Correo Electrónico
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="text-input"
                style={{ paddingLeft: '40px' }}
                placeholder="juan@deltacapital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-gold)', marginBottom: '6px', fontWeight: 600 }}>
              Contraseña Temporal
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="text-input"
                style={{ paddingLeft: '40px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-gold)', marginBottom: '6px', fontWeight: 600 }}>
                Rol de Colaborador
              </label>
              <div style={{ position: 'relative' }}>
                <Shield size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select
                  className="text-input"
                  style={{ paddingLeft: '40px', WebkitAppearance: 'none' }}
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  <option value="SUPERADMIN">Superadmin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="AGENTE">Agente</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-gold)', marginBottom: '6px', fontWeight: 600 }}>
                Departamento
              </label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select
                  className="text-input"
                  style={{ paddingLeft: '40px', WebkitAppearance: 'none' }}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                >
                  <option value="ventas">Ventas</option>
                  <option value="retencion">Retención</option>
                  <option value="cumplimiento">Cumplimiento</option>
                  <option value="gerente">Gerente</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stable DOM for Success Alert */}
          <div 
            className={success ? "flex" : "hidden"} 
            style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.1)', 
              border: '1px solid #10b981', 
              borderRadius: '6px', 
              padding: '12px', 
              alignItems: 'center', 
              gap: '10px' 
            }}
          >
            <CheckCircle size={20} style={{ color: '#34d399', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', color: '#34d399' }}>Colaborador registrado exitosamente. ya puede iniciar sesión.</span>
          </div>

          {/* Stable DOM for Error Alert */}
          <div 
            className={errorMessage ? "flex" : "hidden"} 
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid #ef4444', 
              borderRadius: '6px', 
              padding: '12px', 
              alignItems: 'center', 
              gap: '10px' 
            }}
          >
            <AlertTriangle size={20} style={{ color: '#f87171', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', color: '#f87171' }}>{errorMessage}</span>
          </div>

          <button 
            type="submit" 
            className="gold-button" 
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '16px', marginTop: '10px' }}
          >
            <span className={loading ? "hidden" : "flex"}>Registrar Colaborador</span>
            <span className={loading ? "flex" : "hidden"}>Registrando...</span>
          </button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
            <ArrowLeft size={14} />
            Volver al Inicio de Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
