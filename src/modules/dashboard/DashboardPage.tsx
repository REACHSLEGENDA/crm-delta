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
import Modal from '@/components/shared/Modal';
import ProspectoForm from '@/modules/prospectos/ProspectoForm';
import { usePermissions } from '@/hooks/usePermissions';

interface TaskItem {
  id: string;
  title: string;
  meta: string;
  done: boolean;
}

export default function DashboardPage() {
  const profile = useAuthStore((state) => state.profile);
  const addToast = useNotificationsStore((state) => state.addToast);
  const permissions = usePermissions();

  // Dropdown states
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [quickActionDropdownOpen, setQuickActionDropdownOpen] = useState(false);

  // Modal states
  const [prospectoFormOpen, setProspectoFormOpen] = useState(false);
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskMeta, setNewTaskMeta] = useState('');

  // Attendance states
  const [activeShift, setActiveShift] = useState<any | null>(null);
  const [loadingShift, setLoadingShift] = useState(false);

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
    const sourcesCount: Record<string, number> = {};
    leads?.forEach((l: any) => {
      if (l.source) {
        sourcesCount[l.source] = (sourcesCount[l.source] || 0) + 1;
      }
    });
    const dynamicSources = Object.keys(sourcesCount).map(key => {
      let fill = '#F59E0B';
      if (key === 'WhatsApp') fill = '#22C55E';
      else if (key === 'Web') fill = '#00E5CC';
      else if (key === 'Referido') fill = '#A78BFA';
      return {
        name: key,
        Cantidad: sourcesCount[key],
        fill
      };
    });
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

  const checkActiveShift = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('status', 'working');
      if (!error && data && data.length > 0) {
        setActiveShift(data[0]);
      } else {
        setActiveShift(null);
      }
    } catch (err) {
      console.error('Error fetching shift status', err);
    }
  };

  // Initialize and fetch data
  useEffect(() => {
    fetchData();
    checkActiveShift();

    const handleShiftChange = () => {
      checkActiveShift();
    };
    window.addEventListener('attendance-changed', handleShiftChange);

    // Default Today's Tasks
    const localTasks = localStorage.getItem('kovex_tasks_v4');
    if (localTasks) {
      setTasks(JSON.parse(localTasks));
    } else {
      const defaultTasks = [
        { id: '1', title: 'Completar perfil de usuario', meta: 'Sistema · Pendiente', done: false },
        { id: '2', title: 'Revisar prospectos asignados', meta: 'Diario', done: false },
      ];
      localStorage.setItem('kovex_tasks_v4', JSON.stringify(defaultTasks));
      setTasks(defaultTasks);
    }

    return () => {
      window.removeEventListener('attendance-changed', handleShiftChange);
    };
  }, [profile]);

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    localStorage.setItem('kovex_tasks_v4', JSON.stringify(updated));
    addToast({
      title: 'Tarea actualizada',
      description: 'El estado de la tarea ha sido guardado.',
      type: 'success',
    });
  };

  const handleToggleShift = async () => {
    if (!profile?.id) return;
    setLoadingShift(true);
    try {
      if (activeShift) {
        // Clock out
        const { error } = await supabase
          .from('attendance')
          .update({ clock_out: new Date().toISOString(), status: 'completed' })
          .eq('id', activeShift.id);
        if (!error) {
          addToast({
            title: 'Turno finalizado',
            description: 'Tu marca de salida ha sido registrada con éxito.',
            type: 'success',
          });
          setActiveShift(null);
          window.dispatchEvent(new Event('attendance-changed'));
        }
      } else {
        // Clock in
        const { data, error } = await supabase
          .from('attendance')
          .insert({ profile_id: profile.id, clock_in: new Date().toISOString(), status: 'working' });
        if (!error) {
          addToast({
            title: 'Turno iniciado',
            description: 'Tu marca de entrada ha sido registrada con éxito.',
            type: 'success',
          });
          window.dispatchEvent(new Event('attendance-changed'));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingShift(false);
    }
  };

  const handleExportLeads = async () => {
    try {
      const { data: leads } = await supabase.from('leads').select('*');
      if (!leads || leads.length === 0) {
        addToast({
          title: 'Exportación fallida',
          description: 'No hay datos de prospectos para exportar.',
          type: 'error',
        });
        return;
      }

      const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'País', 'Inversión', 'Fuente', 'Estado', 'Score', 'Notas', 'Creado En'];
      const rows = leads.map((l: any) => [
        l.id,
        l.full_name,
        l.email,
        l.phone || '',
        l.country || '',
        l.investment_amount || 0,
        l.source,
        l.status,
        l.score || 0,
        l.notes || '',
        l.created_at
      ]);

      const csvContent = '\uFEFF' + [
        headers.join(','),
        ...rows.map((row: any[]) => row.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte_prospectos_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({
        title: 'Exportación completada',
        description: 'Se ha descargado el archivo CSV de prospectos.',
        type: 'success',
      });
    } catch (error: any) {
      addToast({
        title: 'Error de exportación',
        description: error.message || 'Hubo un problema al generar la descarga.',
        type: 'error',
      });
    }
  };

  const handleExportDeals = async () => {
    try {
      const { data: deals } = await supabase.from('deals').select('*');
      if (!deals || deals.length === 0) {
        addToast({
          title: 'Exportación fallida',
          description: 'No hay datos de negociaciones para exportar.',
          type: 'error',
        });
        return;
      }

      const headers = ['ID', 'Lead ID', 'Etapa', 'Monto', 'Temperatura', 'Agente ID', 'Creado En', 'Cierre Estimado'];
      const rows = deals.map((d: any) => [
        d.id,
        d.lead_id,
        d.stage,
        d.amount || 0,
        d.temperature,
        d.agent_id || '',
        d.created_at,
        d.expected_close || ''
      ]);

      const csvContent = '\uFEFF' + [
        headers.join(','),
        ...rows.map((row: any[]) => row.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte_negociaciones_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({
        title: 'Exportación completada',
        description: 'Se ha descargado el archivo CSV de negociaciones.',
        type: 'success',
      });
    } catch (error: any) {
      addToast({
        title: 'Error de exportación',
        description: error.message || 'Hubo un problema al generar la descarga.',
        type: 'error',
      });
    }
  };

  const handleExportSummary = () => {
    try {
      const headers = ['Métrica', 'Valor'];
      const rows = [
        ['Total Prospectos', kpis.totalLeads],
        ['Negocios Activos', kpis.activeDeals],
        ['Tasa de Cierre', kpis.winRate],
        ['Revenue Proyectado', kpis.revenue],
        ['Fecha de Reporte', new Date().toLocaleString()]
      ];

      const csvContent = '\uFEFF' + [
        headers.join(','),
        ...rows.map((row: any[]) => row.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `resumen_kpis_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({
        title: 'Reporte descargado',
        description: 'Se ha descargado el archivo CSV del resumen de KPIs.',
        type: 'success',
      });
    } catch (error: any) {
      addToast({
        title: 'Error de exportación',
        description: error.message || 'Hubo un problema al generar la descarga.',
        type: 'error',
      });
    }
  };

  const openPrintWindow = (title: string, htmlBody: string) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const now = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
    win.document.write(`
      <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>${title} – Delta Capital</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Inter', sans-serif; background: #fff; color: #0c1222; }
        .header { background: linear-gradient(135deg, #060b16 0%, #141d33 100%); color: #fff; padding: 32px 40px 24px; }
        .logo-row { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
        .logo-circle { width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,#c5a059,#dfc080); display:flex; align-items:center; justify-content:center; font-weight:900; font-size:16px; color:#060b16; }
        .brand { font-size:18px; font-weight:900; letter-spacing:2px; }
        .brand-sub { font-size:9px; letter-spacing:4px; color:#c5a059; text-transform:uppercase; }
        .report-title { font-size:28px; font-weight:900; margin-bottom:4px; }
        .report-date { font-size:11px; color:#dfc08099; }
        .badge { display:inline-block; background:#c5a059; color:#060b16; font-size:9px; font-weight:800; padding:3px 10px; border-radius:20px; letter-spacing:1px; text-transform:uppercase; margin-top:10px; }
        .content { padding: 32px 40px; }
        .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:32px; }
        .kpi-card { border:2px solid #e8e0d0; border-radius:12px; padding:16px 20px; background:#fdfaf6; }
        .kpi-label { font-size:9px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
        .kpi-value { font-size:24px; font-weight:900; color:#060b16; }
        .section-title { font-size:13px; font-weight:800; color:#060b16; text-transform:uppercase; letter-spacing:1px; border-bottom:2px solid #c5a059; padding-bottom:8px; margin-bottom:16px; }
        table { width:100%; border-collapse:collapse; font-size:11px; }
        thead tr { background:#060b16; color:#fff; }
        thead th { padding:10px 14px; font-weight:700; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.5px; }
        tbody tr:nth-child(odd) { background:#f9f6f1; }
        tbody tr:nth-child(even) { background:#fff; }
        tbody tr:hover { background:#f0ebe0; }
        td { padding:9px 14px; color:#333; border-bottom:1px solid #ece6d8; }
        .status-pill { display:inline-block; padding:2px 8px; border-radius:20px; font-size:9px; font-weight:700; text-transform:uppercase; }
        .status-activo { background:#d1fae5; color:#065f46; }
        .status-descartado { background:#fee2e2; color:#991b1b; }
        .status-negociando { background:#fef3c7; color:#92400e; }
        .status-cerrado { background:#dbeafe; color:#1e40af; }
        .footer { margin-top:40px; padding:16px 40px; background:#f9f6f1; border-top:2px solid #e8e0d0; display:flex; justify-content:space-between; font-size:10px; color:#888; }
        @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
      </style></head><body>
      <div class="header">
        <div class="logo-row">
          <div class="logo-circle">DC</div>
          <div><div class="brand">DELTA CAPITAL</div><div class="brand-sub">Holding Street</div></div>
        </div>
        <div class="report-title">${title}</div>
        <div class="report-date">Generado el ${now}</div>
        <div class="badge">Reporte Oficial</div>
      </div>
      <div class="content">${htmlBody}</div>
      <div class="footer">
        <span>© ${new Date().getFullYear()} Delta Capital &amp; Holding Street – Confidencial</span>
        <span>CRM Delta Capital – Generado automáticamente</span>
      </div>
      <script>window.onload=()=>{ window.print(); }<\/script>
      </body></html>
    `);
    win.document.close();
  };

  const handleExportLeadsPDF = async () => {
    const { data: leads } = await supabase.from('leads').select('*');
    if (!leads || leads.length === 0) { addToast({ title: 'Sin datos', description: 'No hay prospectos para exportar.', type: 'error' }); return; }
    const kpiHtml = `
      <div class="kpi-grid" style="margin-bottom:28px">
        <div class="kpi-card"><div class="kpi-label">Total Prospectos</div><div class="kpi-value">${leads.length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Activos</div><div class="kpi-value">${leads.filter((l:any)=>l.status==='activo').length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Cerrados</div><div class="kpi-value">${leads.filter((l:any)=>l.status==='cerrado').length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Inv. Total</div><div class="kpi-value">$${leads.reduce((s:number,l:any)=>s+(parseFloat(l.investment_amount)||0),0).toLocaleString('en-US',{minimumFractionDigits:0})}</div></div>
      </div>`;
    const rows = leads.map((l:any) => `<tr>
      <td>${l.full_name||''}</td>
      <td>${l.email||''}</td>
      <td>${l.phone||''}</td>
      <td>${l.country||''}</td>
      <td>$${parseFloat(l.investment_amount||0).toLocaleString('en-US')}</td>
      <td>${l.source||''}</td>
      <td><span class="status-pill status-${l.status||'activo'}">${l.status||''}</span></td>
      <td>${l.score||0}</td>
      <td>${new Date(l.created_at).toLocaleDateString('es-MX')}</td>
    </tr>`).join('');
    openPrintWindow('Reporte de Prospectos', `
      ${kpiHtml}
      <div class="section-title">Listado de Prospectos</div>
      <table><thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>País</th><th>Inversión</th><th>Fuente</th><th>Estado</th><th>Score</th><th>Fecha</th></tr></thead><tbody>${rows}</tbody></table>
    `);
  };

  const handleExportDealsPDF = async () => {
    const { data: deals } = await supabase.from('deals').select('*');
    if (!deals || deals.length === 0) { addToast({ title: 'Sin datos', description: 'No hay negociaciones para exportar.', type: 'error' }); return; }
    const total = deals.reduce((s:number,d:any)=>s+(parseFloat(d.amount)||0),0);
    const kpiHtml = `
      <div class="kpi-grid" style="margin-bottom:28px">
        <div class="kpi-card"><div class="kpi-label">Total Deals</div><div class="kpi-value">${deals.length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Monto Total</div><div class="kpi-value">$${total.toLocaleString('en-US')}</div></div>
        <div class="kpi-card"><div class="kpi-label">Calientes</div><div class="kpi-value">${deals.filter((d:any)=>d.temperature==='hot').length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Promedio</div><div class="kpi-value">$${deals.length>0?Math.round(total/deals.length).toLocaleString('en-US'):'0'}</div></div>
      </div>`;
    const rows = deals.map((d:any)=>`<tr>
      <td>${d.id?.slice(0,8)}...</td>
      <td>${d.stage||''}</td>
      <td>$${parseFloat(d.amount||0).toLocaleString('en-US')}</td>
      <td>${d.temperature||''}</td>
      <td>${d.expected_close?new Date(d.expected_close).toLocaleDateString('es-MX'):''}</td>
      <td>${new Date(d.created_at).toLocaleDateString('es-MX')}</td>
    </tr>`).join('');
    openPrintWindow('Reporte de Negociaciones', `
      ${kpiHtml}
      <div class="section-title">Pipeline de Negociaciones</div>
      <table><thead><tr><th>ID</th><th>Etapa</th><th>Monto</th><th>Temperatura</th><th>Cierre Estimado</th><th>Creado</th></tr></thead><tbody>${rows}</tbody></table>
    `);
  };

  const handleExportKPIsPDF = () => {
    const kpiHtml = `
      <div class="kpi-grid" style="margin-bottom:28px">
        <div class="kpi-card"><div class="kpi-label">Total Prospectos</div><div class="kpi-value">${kpis.totalLeads}</div></div>
        <div class="kpi-card"><div class="kpi-label">Negocios Activos</div><div class="kpi-value">${kpis.activeDeals}</div></div>
        <div class="kpi-card"><div class="kpi-label">Tasa de Cierre</div><div class="kpi-value">${kpis.winRate}</div></div>
        <div class="kpi-card"><div class="kpi-label">Revenue Proyectado</div><div class="kpi-value">${kpis.revenue}</div></div>
      </div>`;
    openPrintWindow('Resumen Ejecutivo de KPIs', `
      ${kpiHtml}
      <div class="section-title">Detalle de Métricas</div>
      <table><thead><tr><th>Métrica</th><th>Valor</th></tr></thead><tbody>
        <tr><td>Total Prospectos</td><td>${kpis.totalLeads}</td></tr>
        <tr><td>Negocios Activos</td><td>${kpis.activeDeals}</td></tr>
        <tr><td>Tasa de Cierre</td><td>${kpis.winRate}</td></tr>
        <tr><td>Revenue Proyectado</td><td>${kpis.revenue}</td></tr>
        <tr><td>Fecha de Reporte</td><td>${new Date().toLocaleString('es-MX')}</td></tr>
      </tbody></table>
    `);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      title: newTaskTitle,
      meta: newTaskMeta.trim() || 'General',
      done: false
    };

    const updated = [newTask, ...tasks];
    setTasks(updated);
    localStorage.setItem('kovex_tasks_v4', JSON.stringify(updated));
    setNewTaskTitle('');
    setNewTaskMeta('');
    setNewTaskModalOpen(false);

    addToast({
      title: 'Tarea agregada',
      description: 'La tarea ha sido creada correctamente.',
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
        <div className="flex gap-3 relative">
          {/* Export button and dropdown */}
          {permissions.canExportLeads && (
            <div className="relative">
              <button 
                onClick={() => {
                  setExportDropdownOpen(!exportDropdownOpen);
                  setQuickActionDropdownOpen(false);
                }}
                className="flex items-center gap-2 border border-kovex-border hover:bg-white/[0.02] text-xs font-semibold px-4 py-2 rounded-xl text-kovex-text transition-colors"
              >
                <Download size={14} /> Exportar
              </button>
              
              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-kovex-surface border border-kovex-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                  <div className="p-2 space-y-1">
                    <div className="px-3 py-1 text-[9px] font-bold text-kovex-muted uppercase tracking-widest">PDF con Diseño</div>
                    <button
                      onClick={() => { handleExportLeadsPDF(); setExportDropdownOpen(false); }}
                      className="w-full text-left text-xs text-white hover:bg-kovex-primary/10 hover:text-kovex-primary px-3 py-2 rounded-lg transition-all flex items-center gap-2 font-semibold"
                    >
                      <UserPlus size={12} className="text-kovex-primary" /> Prospectos (PDF)
                    </button>
                    <button
                      onClick={() => { handleExportDealsPDF(); setExportDropdownOpen(false); }}
                      className="w-full text-left text-xs text-white hover:bg-kovex-primary/10 hover:text-kovex-primary px-3 py-2 rounded-lg transition-all flex items-center gap-2 font-semibold"
                    >
                      <Briefcase size={12} className="text-kovex-primary" /> Negociaciones (PDF)
                    </button>
                    <button
                      onClick={() => { handleExportKPIsPDF(); setExportDropdownOpen(false); }}
                      className="w-full text-left text-xs text-white hover:bg-kovex-primary/10 hover:text-kovex-primary px-3 py-2 rounded-lg transition-all flex items-center gap-2 font-semibold"
                    >
                      <Target size={12} className="text-kovex-primary" /> KPIs Ejecutivo (PDF)
                    </button>
                    <div className="border-t border-kovex-border/40 my-1" />
                    <div className="px-3 py-1 text-[9px] font-bold text-kovex-muted uppercase tracking-widest">CSV Datos</div>
                    <button
                      onClick={() => {
                        handleExportLeads();
                        setExportDropdownOpen(false);
                      }}
                      className="w-full text-left text-xs text-white hover:bg-kovex-primary/10 hover:text-kovex-primary px-3 py-2 rounded-lg transition-all flex items-center gap-2 font-semibold"
                    >
                      <UserPlus size={12} className="text-kovex-muted" /> Prospectos (CSV)
                    </button>
                    <button
                      onClick={() => {
                        handleExportDeals();
                        setExportDropdownOpen(false);
                      }}
                      className="w-full text-left text-xs text-white hover:bg-kovex-primary/10 hover:text-kovex-primary px-3 py-2 rounded-lg transition-all flex items-center gap-2 font-semibold"
                    >
                      <Briefcase size={12} className="text-kovex-muted" /> Negociaciones (CSV)
                    </button>
                    <button
                      onClick={() => {
                        handleExportSummary();
                        setExportDropdownOpen(false);
                      }}
                      className="w-full text-left text-xs text-white hover:bg-kovex-primary/10 hover:text-kovex-primary px-3 py-2 rounded-lg transition-all flex items-center gap-2 font-semibold"
                    >
                      <Target size={12} className="text-kovex-muted" /> KPIs (CSV)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Action button and dropdown */}
          <div className="relative">
            <button 
              onClick={() => {
                setQuickActionDropdownOpen(!quickActionDropdownOpen);
                setExportDropdownOpen(false);
              }}
              className="flex items-center gap-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-xs font-bold px-4 py-2 rounded-xl text-white transition-all shadow-lg shadow-kovex-primary/10"
            >
              <Sparkles size={14} /> Acción Rápida
            </button>
            
            {quickActionDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-kovex-surface border border-kovex-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                <div className="p-2 space-y-1">
                  {/* Attendance toggle */}
                  <button
                    disabled={loadingShift}
                    onClick={() => {
                      handleToggleShift();
                      setQuickActionDropdownOpen(false);
                    }}
                    className="w-full text-left text-xs text-white hover:bg-kovex-primary/10 hover:text-kovex-primary px-3 py-2 rounded-lg transition-all flex items-center gap-2 font-bold disabled:opacity-40"
                  >
                    <ActivityIcon size={12} className="text-kovex-accent" /> {activeShift ? 'Finalizar Turno' : 'Iniciar Turno'}
                  </button>
                  
                  {/* Create Lead */}
                  {permissions.canCreateLead && (
                    <button
                      onClick={() => {
                        setProspectoFormOpen(true);
                        setQuickActionDropdownOpen(false);
                      }}
                      className="w-full text-left text-xs text-white hover:bg-kovex-primary/10 hover:text-kovex-primary px-3 py-2 rounded-lg transition-all flex items-center gap-2 font-bold"
                    >
                      <UserPlus size={12} className="text-kovex-accent" /> Registrar Prospecto
                    </button>
                  )}

                  {/* Add Task */}
                  <button
                    onClick={() => {
                      setNewTaskModalOpen(true);
                      setQuickActionDropdownOpen(false);
                    }}
                    className="w-full text-left text-xs text-white hover:bg-kovex-primary/10 hover:text-kovex-primary px-3 py-2 rounded-lg transition-all flex items-center gap-2 font-bold"
                  >
                    <CheckSquare size={12} className="text-kovex-accent" /> Agregar Tarea Pendiente
                  </button>
                </div>
              </div>
            )}
          </div>
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

      {/* Nuevo Prospecto Modal */}
      <Modal
        isOpen={prospectoFormOpen}
        onClose={() => setProspectoFormOpen(false)}
        title="Nuevo Prospecto"
      >
        <ProspectoForm
          onClose={() => {
            setProspectoFormOpen(false);
            fetchData();
          }}
        />
      </Modal>

      {/* Nueva Tarea Modal */}
      <Modal
        isOpen={newTaskModalOpen}
        onClose={() => setNewTaskModalOpen(false)}
        title="Agregar Nueva Tarea"
      >
        <form onSubmit={handleAddTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">Título de la Tarea</label>
            <input
              type="text"
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Ej. Llamar a prospecto VIP..."
              className="w-full bg-[#060b16] border border-kovex-border text-white text-xs rounded-xl p-3 outline-none focus:border-kovex-primary/45"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">Categoría / Meta</label>
            <input
              type="text"
              value={newTaskMeta}
              onChange={(e) => setNewTaskMeta(e.target.value)}
              placeholder="Ej. Llamada, Seguimiento, Sistema"
              className="w-full bg-[#060b16] border border-kovex-border text-white text-xs rounded-xl p-3 outline-none focus:border-kovex-primary/45"
            />
          </div>
          <div className="pt-4 border-t border-kovex-border flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setNewTaskModalOpen(false)}
              className="px-4 py-2 border border-kovex-border text-xs rounded-xl text-white font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-[#060b16] text-xs font-bold rounded-xl transition-all"
            >
              Guardar Tarea
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
