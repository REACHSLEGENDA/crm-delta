import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  Users,
  DollarSign,
  Award,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  Zap,
} from "lucide-react";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const PIPELINE_STAGES = [
  "Nuevo lead",
  "Contactado",
  "Interesado",
  "Asesoría",
  "Depósito pendiente",
];

const STAGE_SHORT: Record<string, string> = {
  "Nuevo lead": "Nuevo",
  "Contactado": "Contactado",
  "Interesado": "Interesado",
  "Asesoría": "Asesoría",
  "Depósito pendiente": "Depósito",
};

interface RevenuePoint {
  name: string;
  revenue: number;
}

interface PipelinePoint {
  stage: string;
  count: number;
}

export const Dashboard = () => {
  const { profile } = useAuth();
  const { isAgent } = usePermissions();
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeDeals: 0,
    conversionRate: 0,
    projectedRevenue: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [pipelineData, setPipelineData] = useState<PipelinePoint[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Build scoped queries depending on role
        let leadsQuery = supabase.from("leads").select("id, status", { count: "exact" });
        let dealsQuery = supabase.from("deals").select("id, value, stage, created_at");
        const activitiesQuery = supabase
          .from("activities")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        if (isAgent && profile?.id) {
          leadsQuery = leadsQuery.eq("agent_id", profile.id);
          dealsQuery = dealsQuery.eq("agent_id", profile.id);
        } else if (profile?.team_id && !isAgent) {
          leadsQuery = leadsQuery.eq("team_id", profile.team_id);
          dealsQuery = dealsQuery.eq("team_id", profile.team_id);
        }

        const [leadsRes, dealsRes, activitiesRes] = await Promise.all([
          leadsQuery,
          dealsQuery,
          activitiesQuery,
        ]);

        const leadsCount = leadsRes.count ?? 0;
        const dealsData = dealsRes.data ?? [];

        // KPI stats
        const activeDeals = dealsData.filter(
          (d) => !["Ganado", "Perdido"].includes(d.stage)
        ).length;
        const wonDeals = dealsData.filter((d) => d.stage === "Ganado");
        const totalDealsCount = dealsData.length;
        const conversionRate =
          totalDealsCount > 0
            ? Math.round((wonDeals.length / totalDealsCount) * 100)
            : 0;
        const projectedRevenue = dealsData
          .filter((d) => d.stage !== "Perdido")
          .reduce((sum, d) => sum + Number(d.value || 0), 0);

        setStats({ totalLeads: leadsCount, activeDeals, conversionRate, projectedRevenue });

        // Pipeline distribution — real counts per stage
        setPipelineData(
          PIPELINE_STAGES.map((stage) => ({
            stage: STAGE_SHORT[stage] ?? stage,
            count: dealsData.filter((d) => d.stage === stage).length,
          }))
        );

        // Revenue per month (last 6 months) — real deal values grouped by creation month
        const now = new Date();
        const buckets: Array<{ key: string; name: string; revenue: number }> = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          buckets.push({
            key: `${d.getFullYear()}-${d.getMonth()}`,
            name: MONTH_LABELS[d.getMonth()],
            revenue: 0,
          });
        }
        dealsData.forEach((deal) => {
          if (!deal.created_at) return;
          const d = new Date(deal.created_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const bucket = buckets.find((b) => b.key === key);
          if (bucket) bucket.revenue += Number(deal.value || 0);
        });
        setRevenueData(buckets.map(({ name, revenue }) => ({ name, revenue })));

        if (activitiesRes.data) setRecentActivities(activitiesRes.data);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (profile) fetchDashboardData();
  }, [profile, isAgent]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[rgba(212,175,55,0.2)] border-t-[#D4AF37] animate-spin" />
          <span className="text-xs text-[#4A6080] tracking-wider font-medium">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 min-h-screen text-[#F8FAFC]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-[rgba(212,175,55,0.1)]">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="live-dot" />
            <span className="text-[10px] font-semibold text-[#22C55E] tracking-[0.18em] uppercase">
              Monitoreo en Tiempo Real
            </span>
          </div>
          <h1 className="text-2xl font-title font-bold text-[#F8FAFC] tracking-tight">
            Sala de Operaciones
          </h1>
          <p className="text-xs text-[#4A6080] mt-1 font-medium">
            Delta Capital & Holding Street
          </p>
        </div>

        <div className="flex items-center gap-2 glass-card px-4 py-2.5 text-xs border-none rounded-xl">
          <ShieldCheck className="h-3.5 w-3.5 text-[#D4AF37]" />
          <span className="text-[#6B7FA3]">Acceso Privado:</span>
          <span className="text-[#D4AF37] font-bold tracking-wider">{profile?.role}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Prospectos */}
        <div className="glass-card card-accent-electric p-5 flex items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <p className="text-[10px] text-[#4A6080] font-semibold tracking-[0.15em] uppercase">
              Prospectos Totales
            </p>
            <h3 className="text-3xl font-mono-numbers font-bold text-[#F8FAFC] leading-none">
              {stats.totalLeads}
            </h3>
            {stats.totalLeads > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#22C55E] font-semibold">
                <TrendingUp className="h-3 w-3" />
                En seguimiento
              </span>
            ) : (
              <span className="text-[10px] text-[#4A6080] font-medium">Sin prospectos aún</span>
            )}
          </div>
          <div className="icon-wrap-electric flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Users className="h-5 w-5 text-[#00C9FF]" />
          </div>
        </div>

        {/* Negocios activos */}
        <div className="glass-card card-accent-gold p-5 flex items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <p className="text-[10px] text-[#4A6080] font-semibold tracking-[0.15em] uppercase">
              Negocios Activos
            </p>
            <h3 className="text-3xl font-mono-numbers font-bold text-[#F8FAFC] leading-none">
              {stats.activeDeals}
            </h3>
            <span className="text-[10px] text-[#D4AF37] font-semibold">
              {stats.activeDeals > 0 ? "En mesa de asesoría" : "Sin negocios abiertos"}
            </span>
          </div>
          <div className="icon-wrap-gold flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Award className="h-5 w-5 text-[#D4AF37]" />
          </div>
        </div>

        {/* Conversión */}
        <div className="glass-card card-accent-green p-5 flex items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <p className="text-[10px] text-[#4A6080] font-semibold tracking-[0.15em] uppercase">
              Tasa de Conversión
            </p>
            <h3 className="text-3xl font-mono-numbers font-bold text-[#F8FAFC] leading-none">
              {stats.conversionRate}
              <span className="text-lg text-[#4A6080]">%</span>
            </h3>
            {stats.conversionRate > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#22C55E] font-semibold">
                <ArrowUpRight className="h-3 w-3" />
                Negocios cerrados
              </span>
            ) : (
              <span className="text-[10px] text-[#4A6080] font-medium">Sin cierres aún</span>
            )}
          </div>
          <div className="icon-wrap-green flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <ArrowUpRight className="h-5 w-5 text-[#22C55E]" />
          </div>
        </div>

        {/* Revenue */}
        <div className="glass-card card-accent-violet p-5 flex items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <p className="text-[10px] text-[#4A6080] font-semibold tracking-[0.15em] uppercase">
              Revenue Proyectado
            </p>
            <h3 className="text-xl font-mono-numbers font-bold text-[#D4AF37] leading-none">
              ${stats.projectedRevenue.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
            </h3>
            <span className="text-[10px] text-[#4A6080] font-medium">Capital bajo gestión</span>
          </div>
          <div className="icon-wrap-violet flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <DollarSign className="h-5 w-5 text-[#A78BFA]" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue area chart — real deals by month */}
        <div className="glass-card p-5 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#D4AF37]" />
              <h3 className="text-sm font-title font-semibold text-[#E2E8F0]">
                Capital Captado por Mes
              </h3>
            </div>
            <span className="text-[10px] text-[#4A6080] bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.12)] px-2 py-0.5 rounded-md font-medium">
              Últimos 6 meses
            </span>
          </div>
          <div className="h-64">
            {revenueData.every((d) => d.revenue === 0) ? (
              <div className="h-full flex flex-col items-center justify-center gap-2">
                <TrendingUp className="h-8 w-8 text-[#1E2D4A]" />
                <p className="text-xs text-[#334155]">Sin negocios registrados en este período</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="name"
                    stroke="#334155"
                    tick={{ fill: "#4A6080", fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#334155"
                    tick={{ fill: "#4A6080", fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(8,15,32,0.95)",
                      border: "1px solid rgba(212,175,55,0.2)",
                      borderRadius: "0.625rem",
                      color: "#F8FAFC",
                      backdropFilter: "blur(16px)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}
                    labelStyle={{ color: "#D4AF37", fontFamily: "Outfit", fontWeight: 600 }}
                    itemStyle={{ color: "#94A3B8", fontFamily: "JetBrains Mono", fontSize: 12 }}
                    formatter={(val: number) =>
                      [`$${val.toLocaleString("es-MX")}`, "Capital"]
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#D4AF37"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 4, fill: "#D4AF37", stroke: "#050814", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pipeline bar chart — real stage counts */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-title font-semibold text-[#E2E8F0]">
              Embudo Comercial
            </h3>
            <span className="text-[10px] text-[#4A6080] bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.12)] px-2 py-0.5 rounded-md font-medium">
              Distribución
            </span>
          </div>
          <div className="h-64">
            {pipelineData.every((d) => d.count === 0) ? (
              <div className="h-full flex flex-col items-center justify-center gap-2">
                <Award className="h-8 w-8 text-[#1E2D4A]" />
                <p className="text-xs text-[#334155]">Sin negocios en el embudo</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="stage"
                    stroke="#334155"
                    tick={{ fill: "#4A6080", fontSize: 9, fontFamily: "Plus Jakarta Sans" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#334155"
                    tick={{ fill: "#4A6080", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(8,15,32,0.95)",
                      border: "1px solid rgba(212,175,55,0.2)",
                      borderRadius: "0.625rem",
                      color: "#F8FAFC",
                      backdropFilter: "blur(16px)",
                    }}
                    cursor={{ fill: "rgba(212,175,55,0.04)" }}
                    formatter={(val: number) => [val, "Negocios"]}
                  />
                  <Bar dataKey="count" fill="#00C9FF" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Activity log */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.15)]">
            <Clock className="h-3.5 w-3.5 text-[#D4AF37]" />
          </div>
          <h3 className="text-sm font-title font-semibold text-[#E2E8F0]">
            Bitácora de Actividad
          </h3>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="live-dot" />
            <span className="text-[9px] text-[#22C55E] font-semibold tracking-wider">LIVE</span>
          </div>
        </div>

        <div className="divide-y divide-[rgba(255,255,255,0.04)]">
          {recentActivities.length === 0 ? (
            <p className="text-xs text-[#4A6080] py-6 text-center">
              No se registran actividades recientes.
            </p>
          ) : (
            recentActivities.map((act) => (
              <div
                key={act.id}
                className="py-3 flex justify-between items-center gap-4 table-row-hover group"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#CBD5E1] truncate">{act.description}</p>
                  <span className="text-[10px] text-[#334155] font-mono-numbers mt-0.5 block">
                    {new Date(act.created_at).toLocaleString("es-MX")}
                  </span>
                </div>
                <span className="shrink-0 px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] rounded-md border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.04)] text-[#D4AF37] uppercase">
                  {act.type}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
