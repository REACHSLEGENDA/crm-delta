import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, LogIn, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.session) {
        onLoginSuccess();
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Credenciales inválidas. Por favor intenta de nuevo.');
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
        maxWidth: '420px',
        padding: '40px',
        border: '1px solid var(--border-gold)',
        display: 'flex',
        flexDirection: 'column',
        gap: '25px'
      }}>
        {/* Logo Section */}
        <div style={{ textAlign: 'center' }}>
          <img 
            src="/logo-delta.png" 
            alt="Delta Capital" 
            style={{ width: '150px', height: 'auto', marginBottom: '15px' }} 
          />
          <h2 className="gold-gradient-text" style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '2px', fontFamily: 'var(--font-sans)' }}>
            DELTA CAPITAL
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            CRM &amp; HOLDING STREET
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-gold)', marginBottom: '6px', fontWeight: 600 }}>
              Correo Institucional
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="text-input"
                style={{ paddingLeft: '40px' }}
                placeholder="usuario@deltacapital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-gold)', marginBottom: '6px', fontWeight: 600 }}>
              Contraseña
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

          {/* Stable DOM for Error Alert (Safe from Translation Extensions) */}
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
            <span style={{ fontSize: '13px', color: '#f87171' }}>{errorMessage}</span>
          </div>

          <button 
            type="submit" 
            className="gold-button" 
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '10px' }}
          >
            <LogIn size={18} />
            <span className={loading ? "hidden" : "flex"}>Iniciar Sesión</span>
            <span className={loading ? "flex" : "hidden"}>Cargando...</span>
          </button>
        </form>

        <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-dark)', paddingTop: '15px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            Acceso exclusivo para colaboradores de Delta Capital.
          </p>
          <Link to="/register-kovex-internal" style={{ color: 'var(--text-gold)', fontSize: '12px', textDecoration: 'none', display: 'block', marginTop: '8px', fontWeight: 500 }}>
            ¿Nuevo colaborador? Regístrate aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
