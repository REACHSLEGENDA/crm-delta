// modules/dashboard/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import StatCard from '@/components/shared/StatCard';
import { supabase } from '@/lib/supabase';
import { 
  UserPlus, Briefcase, Target, DollarSign, Bell, CheckSquare, 
  ArrowRight, Activity as ActivityIcon, Download, Sparkles 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  LineChart, Line, CartesianGrid 
} from 'recharts';
import { useAuthStore } from '@/store/authStore';
import { useNotificationsStore } from '@/store/notificationsStore';

interface TaskItem {
  id: string;
  title: string;
  meta: string;
  done: boolean;
}

export default function DashboardPage() {
  const profile = useAuthStore((state) => state.profile);
  const addToast = useNotificationsStore((state) => state.addToast);

  // States
  const [kpis, setKpis] = useState({
    totalLeads: 0,
    activeDeals: 0,
    winRate: '0%',
    revenue: '$0',
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  // Chart States
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [conversionData, setConversionData] = useState<any[]>([]);
  const [sourcesData, setSourcesData] = useState<any[]>([]);
  const [countriesData, setCountriesData] = useState<any[]>([]);
  const [temperatureData, setTemperatureData] = useState<any[]>([]);

  // Initialize and fetch data
  useEffect(() => {
    const fetchData = async () => {
      // Fetch Leads
      const { data: leads } = await supabase.from('leads').select('*');
      const leadsCount = leads?.length || 0;

      // Fetch Deals
      const { data: deals } = await supabase.from('deals').select('*');
      const activeDeals = deals?.filter((d: any) => d.stage !== 'won' && d.stage !== 'lost').length || 0;
      
      // Calculate win rate
      const wonDeals = deals?.filter((d: any) => d.stage === 'won').length || 0;
      const totalClosed = deals?.filter((d: any) => d.stage === 'won' || d.stage === 'lost').length || 0;
      const winRatePercent = totalClosed > 0 ? ((wonDeals / totalClosed) * 100).toFixed(1) + '%' : '0%';

      // Calculate revenue
      const totalRevenue = deals
        ?.filter((d: any) => d.stage !== 'lost')
        ?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0;
      
      setKpis({
        totalLeads: leadsCount,
        activeDeals,
        winRate: winRatePercent,
        revenue: '$' + (totalRevenue / 1000).toFixed(1) + 'K',
      });

      // Fetch activities
      const { data: acts } = await supabase.from('activities').select('*').order('created_at', { ascending: false });
      setActivities(acts?.slice(0, 5) || []);

      // 1. Calculate funnel stages dynamically
      const countContacted = leads?.filter((l: any) => l.status === 'Contactado').length || 0;
      const countCalificado = leads?.filter((l: any) => l.status === 'Calificado').length || 0;
      const countInterested = deals?.filter((d: any) => d.stage === 'int').length || 0;
      const countDemo = deals?.filter((d: any) => d.stage === 'demo').length || 0;
      const countWon = deals?.filter((d: any) => d.stage === 'won').length || 0;

      const dynamicFunnel = [
        { name: 'Total Leads', cantidad: leadsCount, fill: '#64748B' },
        { name: 'Contactados', cantidad: countContacted, fill: '#A78BFA' },
        { name: 'Calificados', cantidad: countCalificado, fill: '#818CF8' },
        { name: 'Interesados', cantidad: countInterested, fill: '#E91E8C' },
        { name: 'Demos / Presentación', cantidad: countDemo, fill: '#F59E0B' },
        { name: 'Depósito / Ganados', cantidad: countWon, fill: '#22C55E' },
      ];
      setFunnelData(dynamicFunnel);

      // 2. Weekly conversion/revenue trend dynamically
      const weeklyTrend = [
        { name: 'Sem 1', Conversiones: 0, Revenue: 0 },
        { name: 'Sem 2', Conversiones: 0, Revenue: 0 },
        { name: 'Sem 3', Conversiones: 0, Revenue: 0 },
        { name: 'Sem 4', Conversiones: 0, Revenue: 0 },
      ];
      deals?.forEach((deal: any) => {
        const dealDate = new Date(deal.created_at || Date.now());
        const diffDays = Math.floor((Date.now() - dealDate.getTime()) / (1000 * 60 * 60 * 24));
        const weekIdx = Math.floor(diffDays / 7);
        if (weekIdx >= 0 && weekIdx < 4) {
          const targetIdx = 3 - weekIdx;
          if (deal.stage === 'won') {
            weeklyTrend[targetIdx].Conversiones += 1;
            weeklyTrend[targetIdx].Revenue += Number(deal.amount || 0) / 1000; // in thousands
          }
        }
      });
      setConversionData(weeklyTrend);

      // 3. Lead Sources dynamically
      const sourcesCount: Record<string, number> = { WhatsApp: 0, Web: 0, Referido: 0, Llamada: 0 };
      leads?.forEach((l: any) => {
        if (sourcesCount[l.source] !== undefined) {
          sourcesCount[l.source]++;
        }
      });
      const dynamicSources = Object.keys(sourcesCount).map(key => ({
        name: key,
        Cantidad: sourcesCount[key],
        fill: key === 'WhatsApp' ? '#22C55E' : key === 'Web' ? '#00E5CC' : key === 'Referido' ? '#A78BFA' : '#F59E0B'
      }));
      setSourcesData(dynamicSources);

      // 4. Countries dynamically
      const countriesCount: Record<string, number> = {};
      leads?.forEach((l: any) => {
        if (l.country) {
          countriesCount[l.country] = (countriesCount[l.country] || 0) + 1;
        }
      });
      const dynamicCountries = Object.keys(countriesCount)
        .map(key => ({ name: key, Cantidad: countriesCount[key] }))
        .sort((a, b) => b.Cantidad - a.Cantidad)
        .slice(0, 5);
      setCountriesData(dynamicCountries);

      // 5. Pipeline Temperature dynamically
      const tempCount: Record<string, number> = { cold: 0, warm: 0, hot: 0 };
      deals?.forEach((d: any) => {
        if (tempCount[d.temperature] !== undefined) {
          tempCount[d.temperature]++;
        }
      });
      const dynamicTemp = [
        { name: 'Frío (Cold)', Cantidad: tempCount.cold, fill: '#64748B' },
        { name: 'Templado (Warm)', Cantidad: tempCount.warm, fill: '#F59E0B' },
        { name: 'Caliente (Hot)', Cantidad: tempCount.hot, fill: '#E91E8C' }
      ];
      setTemperatureData(dynamicTemp);
    };

    fetchData();

    // Default Today's Tasks
    const localTasks = localStorage.getItem('kovex_tasks');
    if (localTasks) {
      setTasks(JSON.parse(localTasks));
    } else {
      const defaultTasks = [
        { id: '1', title: 'Llamar a Juan Manuel Acosta · seguimiento depósito', meta: '10:00 · Alta', done: false },
        { id: '2', title: 'Demo virtual con Mariana Velázquez', meta: '12:30 · Hoy', done: false },
        { id: '3', title: 'Revisar pipeline MX con Ana Q.', meta: '16:00 · 1:1', done: false },
        { id: '4', title: 'Aprobar campaña WhatsApp LATAM', meta: '17:00', done: false },
        { id: '5', title: 'Cerrar reporte semanal', meta: '18:00', done: false },
      ];
      localStorage.setItem('kovex_tasks', JSON.stringify(defaultTasks));
      setTasks(defaultTasks);
    }
  }, []);

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    localStorage.setItem('kovex_tasks', JSON.stringify(updated));
    addToast({
      title: 'Tarea actualizada',
      description: 'El estado de la tarea ha sido guardado.',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-white">
            Buen día, {profile?.full_name?.split(' ')[0] || 'Diego'} 👋
          </h1>
          <p className="text-xs text-kovex-muted mt-1">
            Esto pasó en KOVEX durante las últimas 24h
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 border border-kovex-border hover:bg-white/[0.02] text-xs font-semibold px-4 py-2 rounded-xl text-kovex-text transition-colors">
            <Download size={14} /> Exportar
          </button>
          <button className="flex items-center gap-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-xs font-bold px-4 py-2 rounded-xl text-white transition-all shadow-lg shadow-kovex-primary/10">
            <Sparkles size={14} /> Acción Rápida
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Prospectos"
          value={kpis.totalLeads}
          icon={<UserPlus size={18} />}
          trend={{ value: '+12.4% vs mes ant.', isUp: true }}
          variant="primary"
        />
        <StatCard
          title="Negocios Activos"
          value={kpis.activeDeals}
          icon={<Briefcase size={18} />}
          trend={{ value: '+5 esta semana', isUp: true }}
          variant="accent"
        />
        <StatCard
          title="Tasa de Cierre"
          value={kpis.winRate}
          icon={<Target size={18} />}
          trend={{ value: '+2.1pp', isUp: true }}
          variant="success"
        />
        <StatCard
          title="Revenue Proyectado"
          value={kpis.revenue}
          icon={<DollarSign size={18} />}
          trend={{ value: '-3.2% objetivo', isUp: false }}
          variant="warning"
        />
      </div>

      {/* Charts Grid 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl p-5 backdrop-blur-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-white text-sm">Embudo de Ventas (Dinámico)</h3>
            <span className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider">Flujo de Conversión</span>
          </div>
          <div className="h-64">
            {kpis.totalLeads === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-kovex-muted">
                Sin datos suficientes para mostrar el embudo.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={funnelData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" stroke="#64748B" fontSize={10} hide />
                  <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A2035', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Conversion History */}
        <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl p-5 backdrop-blur-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-white text-sm">Crecimiento y Rendimiento</h3>
            <span className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider">Historial Mensual</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={conversionData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A2035', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '8px' }}
                />
                <Line type="monotone" name="Conversiones" dataKey="Conversiones" stroke="#E91E8C" strokeWidth={2} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Revenue ($K)" dataKey="Revenue" stroke="#00E5CC" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Grid 2 - Broker Specific Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lead Sources */}
        <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl p-5 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-white text-sm">Distribución por Origen</h3>
            <span className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider">Campaña</span>
          </div>
          <div className="h-48">
            {kpis.totalLeads === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-kovex-muted">
                Sin datos de leads
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourcesData}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={9} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={9} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A2035', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '8px' }} />
                  <Bar dataKey="Cantidad" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pipeline Temperature */}
        <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl p-5 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-white text-sm">Temperatura del Trato</h3>
            <span className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider">Intención</span>
          </div>
          <div className="h-48">
            {kpis.activeDeals === 0 && funnelData.find(f => f.name === 'Depósito / Ganados')?.cantidad === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-kovex-muted">
                Sin negocios activos
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={temperatureData} layout="vertical">
                  <XAxis type="number" stroke="#64748B" fontSize={9} hide />
                  <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={9} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A2035', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '8px' }} />
                  <Bar dataKey="Cantidad" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Countries */}
        <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl p-5 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-white text-sm">Top Países (Región)</h3>
            <span className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider">Traders</span>
          </div>
          <div className="h-48">
            {countriesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-kovex-muted">
                Sin datos geográficos
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countriesData}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={9} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={9} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A2035', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '8px' }} />
                  <Bar dataKey="Cantidad" fill="#A78BFA" radius={[4, 4, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Activities and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Feed */}
        <div className="lg:col-span-2 bg-[#0F1525]/40 border border-kovex-border rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
                <ActivityIcon size={16} className="text-kovex-primary" /> Actividad Reciente
              </h3>
              <span className="text-[10px] text-kovex-accent font-bold uppercase tracking-wider">En vivo</span>
            </div>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-kovex-muted text-xs">No hay actividades recientes</div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex gap-3 items-start border-b border-kovex-border/30 pb-3 last:border-0 last:pb-0">
                    <div className="w-7 h-7 rounded-lg bg-kovex-elevated flex items-center justify-center text-kovex-primary flex-shrink-0 mt-0.5">
                      <Bell size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-kovex-text leading-relaxed">{act.description}</p>
                      <span className="text-[10px] text-kovex-muted mt-1 block">
                        {new Date(act.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <button 
            onClick={() => useNotificationsStore.getState().addToast({ title: 'Historial', description: 'Redirigiendo a auditoría de logs...', type: 'info' })}
            className="w-full text-center text-xs font-bold text-kovex-primary hover:text-[#FF7AC2] transition-colors mt-4"
          >
            Ver todo el historial
          </button>
        </div>

        {/* Tasks Widget */}
        <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl p-5 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
              <CheckSquare size={16} className="text-kovex-accent" /> Tareas Pendientes
            </h3>
            <span className="bg-kovex-accent/10 text-kovex-accent text-[9px] font-extrabold px-2 py-0.5 rounded-full">
              {tasks.filter((t) => !t.done).length} Activas
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-56 pr-1">
            {tasks.map((t) => (
              <div
                key={t.id}
                onClick={() => handleToggleTask(t.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  t.done
                    ? 'bg-transparent border-transparent opacity-50'
                    : 'bg-kovex-elevated/20 border-kovex-border hover:border-kovex-primary/20'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    t.done
                      ? 'bg-kovex-primary border-kovex-primary'
                      : 'border-kovex-muted hover:border-kovex-primary'
                  }`}
                >
                  {t.done && <span className="block w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold leading-snug ${t.done ? 'line-through text-kovex-muted' : 'text-white'}`}>
                    {t.title}
                  </p>
                  <span className="text-[10px] text-kovex-muted block mt-1">{t.meta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
