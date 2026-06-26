import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Attendance, Profile } from '../types';
import { Clock, Play, CheckCircle } from 'lucide-react';

interface AttendanceProps {
  currentProfile: Profile | null;
}

export default function AttendancePage({ currentProfile }: AttendanceProps) {
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<'working' | 'completed' | 'none'>('none');
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [activeClockIn, setActiveClockIn] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [currentProfile]);

  const fetchLogs = async () => {
    if (!currentProfile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', currentProfile.id)
        .order('clock_in', { ascending: false });

      if (error) throw error;
      setLogs(data || []);

      // Check if there's an open session today
      const today = new Date().toISOString().split('T')[0];
      const openSession = data?.find(
        (log: any) => log.clock_in.startsWith(today) && log.status === 'working'
      );

      if (openSession) {
        setCurrentStatus('working');
        setActiveLogId(openSession.id);
        setActiveClockIn(openSession.clock_in);
      } else {
        const completedSession = data?.find((log: any) => log.clock_in.startsWith(today));
        if (completedSession) {
          setCurrentStatus('completed');
        } else {
          setCurrentStatus('none');
        }
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!currentProfile) return;
    try {
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          profile_id: currentProfile.id,
          status: 'working',
          clock_in: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentStatus('working');
      setActiveLogId(data.id);
      setActiveClockIn(data.clock_in);
      fetchLogs();
    } catch (err) {
      console.error('Error clocking in:', err);
    }
  };

  const handleClockOut = async () => {
    if (!activeLogId) return;
    try {
      const { error } = await supabase
        .from('attendance')
        .update({
          clock_out: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', activeLogId);

      if (error) throw error;

      setCurrentStatus('completed');
      fetchLogs();
    } catch (err) {
      console.error('Error clocking out:', err);
    }
  };

  const calculateHours = (inStr: string, outStr?: string) => {
    if (!outStr) return 'En curso';
    const diffMs = new Date(outStr).getTime() - new Date(inStr).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return `${diffHours.toFixed(2)} hrs`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '26px', fontWeight: 700 }} className="gold-gradient-text">Registro de Asistencia</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Controla el inicio y fin de tu jornada laboral diaria en Delta Capital.</p>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Left Side: Status Control */}
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-gold)' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} /> Control de Asistencia
          </h3>

          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div className={currentStatus === 'none' ? 'flex' : 'hidden'} style={{ flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: 'var(--text-gold)' }}>
                <Play size={24} style={{ marginLeft: '4px' }} />
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No has iniciado jornada el día de hoy.</p>
              <button onClick={handleClockIn} className="gold-button" style={{ width: '100%' }}>
                Marcar Entrada (Clock In)
              </button>
            </div>

            <div className={currentStatus === 'working' ? 'flex' : 'hidden'} style={{ flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: '#34d399' }}>
                <Clock size={24} />
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-white)', fontWeight: 600 }}>Jornada Activa</p>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Entrada: {activeClockIn ? new Date(activeClockIn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
              <button onClick={handleClockOut} className="gold-button" style={{ width: '100%', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' }}>
                Marcar Salida (Clock Out)
              </button>
            </div>

            <div className={currentStatus === 'completed' ? 'flex' : 'hidden'} style={{ flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <CheckCircle size={24} />
              </div>
              <p style={{ fontSize: '14px', color: '#60a5fa', fontWeight: 600 }}>Jornada Completada</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Has completado tu registro de asistencia de hoy. ¡Gracias por tu esfuerzo!
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Logs History */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>Historial de Asistencia</h3>

          <div className={loading ? "flex" : "hidden"} style={{ padding: '30px', justifyContent: 'center' }}>
            <span>Cargando registros...</span>
          </div>

          <div className={loading ? "hidden" : "flex"} style={{ flexDirection: 'column', gap: '10px' }}>
            {logs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No tienes registros de asistencia en la base de datos.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '450px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-dark)', color: 'var(--text-gold)', fontSize: '12px' }}>
                      <th style={{ padding: '12px' }}>Fecha</th>
                      <th style={{ padding: '12px' }}>Entrada</th>
                      <th style={{ padding: '12px' }}>Salida</th>
                      <th style={{ padding: '12px' }}>Horas Trabajadas</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '13px' }}>
                        <td style={{ padding: '12px', fontWeight: 500 }}>
                          {new Date(log.clock_in).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {new Date(log.clock_in).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {log.clock_out ? new Date(log.clock_out).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-gold)' }}>
                          {calculateHours(log.clock_in, log.clock_out)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <span className={`badge ${log.status === 'working' ? 'badge-info' : 'badge-success'}`}>
                            {log.status === 'working' ? 'En curso' : 'Completado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
