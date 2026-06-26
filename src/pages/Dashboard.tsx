import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, Lead } from '../types';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  ArrowUpRight, 
  Calendar, 
  Clock, 
  LogOut, 
  Play, 
  CheckCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardProps {
  profile: Profile | null;
}

export default function Dashboard({ profile }: DashboardProps) {
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    activeDeals: 0,
    totalSales: 0,
    activeAgents: 0
  });
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<{
    id?: string;
    clock_in?: string;
    status: 'working' | 'completed' | 'none';
  }>({ status: 'none' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Fetch leads count
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      // 2. Fetch active deals count
      const { count: dealsCount } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .not('stage', 'in', '("won","lost")');

      // 3. Fetch total sales amount (won deals)
      const { data: wonDeals } = await supabase
        .from('deals')
        .select('amount')
        .eq('stage', 'won');
      const salesSum = wonDeals?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      // 4. Fetch online agents
      const { count: agentsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online');

      setMetrics({
        totalLeads: leadsCount || 0,
        activeDeals: dealsCount || 0,
        totalSales: salesSum,
        activeAgents: agentsCount || 0
      });

      // 5. Fetch 5 recent leads
      const { data: leads } = await supabase
        .from('leads')
        .select('*, agent:agent_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentLeads((leads || []) as any);

      // 6. Fetch today's attendance for the user
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', profile.id)
        .gte('clock_in', `${today}T00:00:00Z`)
        .order('clock_in', { ascending: false })
        .limit(1);

      if (attendanceData && attendanceData.length > 0) {
        setAttendanceStatus({
          id: attendanceData[0].id,
          clock_in: attendanceData[0].clock_in,
          status: attendanceData[0].status
        });
      } else {
        setAttendanceStatus({ status: 'none' });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          profile_id: profile.id,
          status: 'working',
          clock_in: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setAttendanceStatus({
        id: data.id,
        clock_in: data.clock_in,
        status: 'working'
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Error clocking in:', err);
    }
  };

  const handleClockOut = async () => {
    if (!attendanceStatus.id) return;
    try {
      const { error } = await supabase
        .from('attendance')
        .update({
          clock_out: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', attendanceStatus.id);

      if (error) throw error;

      setAttendanceStatus({
        ...attendanceStatus,
        status: 'completed'
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Error clocking out:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Header Greeting */}
      <div className="glass-panel" style={{
        padding: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(14, 21, 37, 0.9) 0%, rgba(21, 30, 51, 0.7) 100%)'
      }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>
            <span>Bienvenido, </span>
            <span className="gold-gradient-text">{profile?.full_name || 'Colaborador'}</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            Delta Capital CRM - Panel de control general y analítica
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={18} style={{ color: 'var(--text-gold)' }} />
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-white)' }}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Main Grid: Content Left, Sidebar Right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '30px'
      }}>
        {/* Left Section: Stats Grid and Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Metrics Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px'
          }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid var(--border-gold-subtle)',
                borderRadius: '12px',
                padding: '16px',
                color: 'var(--text-gold)'
              }}>
                <Users size={24} />
              </div>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Leads</span>
                <h3 style={{ fontSize: '26px', fontWeight: 700, marginTop: '4px' }}>
                  {loading ? '...' : metrics.totalLeads}
                </h3>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                color: '#60a5fa'
              }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deals Activos</span>
                <h3 style={{ fontSize: '26px', fontWeight: 700, marginTop: '4px' }}>
                  {loading ? '...' : metrics.activeDeals}
                </h3>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                color: '#34d399'
              }}>
                <DollarSign size={24} />
              </div>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Ventas</span>
                <h3 style={{ fontSize: '26px', fontWeight: 700, marginTop: '4px' }}>
                  {loading ? '...' : `$${metrics.totalSales.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
                </h3>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                color: '#f87171'
              }}>
                <Activity size={24} />
              </div>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agentes Online</span>
                <h3 style={{ fontSize: '26px', fontWeight: 700, marginTop: '4px' }}>
                  {loading ? '...' : metrics.activeAgents}
                </h3>
              </div>
            </div>
          </div>

          {/* Recent Leads */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Prospectos Recientes</h3>
              <Link to="/leads" style={{ color: 'var(--text-gold)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Ver todos <ArrowUpRight size={14} />
              </Link>
            </div>

            {/* Stable loading view */}
            <div className={loading ? "flex" : "hidden"} style={{ padding: '30px', justifyContent: 'center' }}>
              <span>Cargando prospectos...</span>
            </div>

            {/* Leads list */}
            <div className={loading ? "hidden" : "flex"} style={{ flexDirection: 'column', gap: '12px' }}>
              {recentLeads.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay prospectos registrados aún.
                </div>
              ) : (
                recentLeads.map((lead) => (
                  <div key={lead.id} style={{
                    padding: '14px 18px',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-dark)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-white)' }}>{lead.full_name}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {lead.email} | {lead.country || 'Sin País'} | Source: <span style={{ color: 'var(--text-gold)' }}>{lead.source}</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span className={`badge ${
                        lead.status === 'Nuevo' ? 'badge-gold' : 
                        lead.status === 'Contactado' ? 'badge-info' : 
                        lead.status === 'Calificado' ? 'badge-success' : 'badge-danger'
                      }`}>
                        {lead.status}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-gold)' }}>
                        {lead.score} pts
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Attendance and Notifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Quick Attendance Control Widget */}
          <div className="glass-panel" style={{
            padding: '24px',
            border: '1px solid var(--border-gold)',
            background: 'linear-gradient(180deg, rgba(14, 21, 37, 0.95) 0%, rgba(6, 10, 19, 0.95) 100%)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '15px', color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} /> Control de Asistencia
            </h3>

            {/* Stable clock states (Safe from translation software error) */}
            <div style={{ textAlign: 'center', padding: '15px 0' }}>
              <div 
                className={attendanceStatus.status === 'none' ? 'flex' : 'hidden'}
                style={{ flexDirection: 'column', alignItems: 'center', gap: '15px' }}
              >
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: 'var(--text-gold)' }}>
                  <Play size={24} style={{ marginLeft: '4px' }} />
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No has iniciado jornada el día de hoy.</p>
                <button onClick={handleClockIn} className="gold-button" style={{ width: '100%' }}>
                  Marcar Entrada (Clock In)
                </button>
              </div>

              <div 
                className={attendanceStatus.status === 'working' ? 'flex' : 'hidden'}
                style={{ flexDirection: 'column', alignItems: 'center', gap: '15px' }}
              >
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: '#34d399' }}>
                  <Clock size={24} />
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-white)', fontWeight: 600 }}>
                  Jornada Activa
                </p>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Entrada: {attendanceStatus.clock_in ? new Date(attendanceStatus.clock_in).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
                <button onClick={handleClockOut} className="gold-button" style={{ width: '100%', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' }}>
                  <LogOut size={16} /> Marcar Salida (Clock Out)
                </button>
              </div>

              <div 
                className={attendanceStatus.status === 'completed' ? 'flex' : 'hidden'}
                style={{ flexDirection: 'column', alignItems: 'center', gap: '15px' }}
              >
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                  <CheckCircle size={24} />
                </div>
                <p style={{ fontSize: '14px', color: '#60a5fa', fontWeight: 600 }}>
                  Jornada Completada
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Has marcado salida correctamente por el día de hoy. ¡Buen trabajo!
                </p>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '15px' }}>Atajos Rápidos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              <Link to="/leads" className="secondary-button" style={{ justifyContent: 'flex-start', fontSize: '13px' }}>
                + Agregar Prospecto
              </Link>
              <Link to="/pipeline" className="secondary-button" style={{ justifyContent: 'flex-start', fontSize: '13px' }}>
                Ver Embudo de Negociaciones
              </Link>
              <Link to="/chat" className="secondary-button" style={{ justifyContent: 'flex-start', fontSize: '13px' }}>
                Mensajes Internos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
