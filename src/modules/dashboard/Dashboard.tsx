import { useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, Users, Award, Clock, ShieldCheck, Zap, XCircle, Target,
} from "lucide-react";

const MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const PIPELINE_STAGES = ["Nuevo lead","Contactado","Interesado","Asesoría","Depósito pendiente"];
const STAGE_SHORT: Record<string, string> = {
  "Nuevo lead": "Nuevo","Contactado": "Contactado","Interesado": "Interesado","Asesoría": "Asesoría","Depósito pendiente": "Depósito",
};
const STAGE_COLORS = ["var(--stage-new)","var(--stage-contacted)","var(--stage-interested)","var(--stage-advisory)","var(--stage-deposit)"];

interface RevenuePoint { name: string; revenue: number; }
interface PipelinePoint { stage: string; count: number; }

interface ChartColors { primary: string; axis: string; grid: string; tooltipBg: string; border: string; }

const money = (n: number) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;

export const Dashboard = () => {
  const { profile } = useAuth();
  const { isAgent, isSupervisor, isSuperAdmin, isManager } = usePermissions();
  const canSeeActivityLog = isSuperAdmin || isManager || isSupervisor;

  const [stats, setStats] = useState({
    totalLeads: 0,
    activeDeals: 0,
    conversionRate: 0,
    projectedRevenue: 0,
    totalCommissions: 0,
    lostDeposits: 0,
    commissionPercentage: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [pipelineData, setPipelineData] = useState<PipelinePoint[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Charts render in SVG where CSS variables don't resolve — read the resolved
  // theme colors and re-read them whenever the light/dark class flips.
  const [chartColors, setChartColors] = useState<ChartColors>({
    primary: "#D4AF37", axis: "#94a3b8", grid: "rgba(148,163,184,0.14)", tooltipBg: "#0d1428", border: "rgba(212,175,55,0.2)",
  });
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const g = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
      setChartColors({
        primary: g("--primary", "#D4AF37"),
        axis: g("--muted-foreground", "#94a3b8"),
        grid: g("--border-soft", g("--border", "rgba(148,163,184,0.14)")),
        tooltipBg: g("--popover", "#0d1428"),
        border: g("--border", "rgba(212,175,55,0.2)"),
      });
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      let leadsQuery = supabase.from("leads").select("id, status", { count: "exact" }).eq("is_burned", false);
      let dealsQuery = supabase.from("deals").select("id, value, stage, created_at, lead_id");
      const activitiesQuery = supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);

      if (isAgent && profile?.id) {
        leadsQuery = leadsQuery.eq("agent_id", profile.id);
        dealsQuery = dealsQuery.eq("agent_id", profile.id);
      } else if (isSupervisor && profile?.team_id) {
        leadsQuery = leadsQuery.eq("team_id", profile.team_id);
        dealsQuery = dealsQuery.eq("team_id", profile.team_id);
      }

      const [leadsRes, dealsRes, activitiesRes] = await Promise.all([leadsQuery, dealsQuery, activitiesQuery]);

      const leadsCount = leadsRes.count ?? 0;
      const activeLeadIds = new Set((leadsRes.data ?? []).map((lead) => lead.id));
      const dealsData = (dealsRes.data ?? []).filter((deal) => !deal.lead_id || activeLeadIds.has(deal.lead_id));

      const activeDeals = dealsData.filter((d) => !["Ganado", "Perdido"].includes(d.stage)).length;
      const wonDeals = dealsData.filter((d) => d.stage === "Ganado");
      const lostDeals = dealsData.filter((d) => d.stage === "Perdido");
      const totalDealsCount = dealsData.length;
      const conversionRate = totalDealsCount > 0 ? Math.round((wonDeals.length / totalDealsCount) * 100) : 0;
      const projectedRevenue = dealsData.filter((d) => d.stage !== "Perdido").reduce((sum, d) => sum + Number(d.value || 0), 0);

      const wonDealsCount = wonDeals.length;
      let commissionPercentage = 0;
      if (wonDealsCount >= 1 && wonDealsCount <= 3) commissionPercentage = 0.10;
      else if (wonDealsCount >= 4 && wonDealsCount <= 6) commissionPercentage = 0.15;
      else if (wonDealsCount >= 7) commissionPercentage = 0.20;

      const totalWonValue = wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
      const totalCommissions = totalWonValue * commissionPercentage;
      const lostDeposits = lostDeals.length;

      setStats({ totalLeads: leadsCount, activeDeals, conversionRate, projectedRevenue, totalCommissions, lostDeposits, commissionPercentage });

      setPipelineData(PIPELINE_STAGES.map((stage) => ({
        stage: STAGE_SHORT[stage] ?? stage,
        count: dealsData.filter((d) => d.stage === stage).length,
      })));

      const now = new Date();
      const buckets: Array<{ key: string; name: string; revenue: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, name: MONTH_LABELS[d.getMonth()], revenue: 0 });
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
  }, [profile, isAgent, isSupervisor]);

  useEffect(() => {
    if (profile) fetchDashboardData();
  }, [fetchDashboardData, profile]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard_deals_realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "deals" }, () => {
        if (profile) fetchDashboardData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
          <span className="text-xs text-muted-foreground tracking-wider font-medium">Cargando...</span>
        </div>
      </div>
    );
  }

  const commissionTier = stats.commissionPercentage >= 0.20 ? 3 : stats.commissionPercentage >= 0.15 ? 2 : stats.commissionPercentage >= 0.10 ? 1 : 0;
  const funnelTop = pipelineData.length ? Math.max(pipelineData[0].count, 1) : 1;
  const noRevenue = revenueData.every((d) => d.revenue === 0);
  const noPipeline = pipelineData.every((d) => d.count === 0);

  return (
    <div className="app-page flex flex-col gap-4">
      {/* ===== Command bar ===== */}
      <header className="rise-in flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="live-dot" />
            <span className="text-[10px] font-bold text-success tracking-[0.18em] uppercase">Monitoreo en tiempo real</span>
          </div>
          <h1 className="font-title text-[clamp(1.6rem,3vw,2.1rem)] font-extrabold text-foreground leading-none">Sala de Operaciones</h1>
          <p className="text-xs text-muted-foreground mt-2 font-medium">Delta Capital &amp; Holding Street</p>
        </div>
        <div className="flex items-center gap-2 surface-card px-4 py-2.5 text-xs !rounded-xl">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">Acceso privado</span>
          <span className="text-primary font-bold tracking-wider">{profile?.role}</span>
        </div>
      </header>

      <div className="market-gradient-line rise-in !rounded-full" />

      {/* ===== Hero band ===== */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        <div
          className="rise-in surface-card p-6 flex flex-col justify-between gap-6"
          style={{ background: "radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--primary) 9%, transparent) 0%, transparent 55%), var(--card)" }}
        >
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-foreground">Capital bajo gestión</p>
            <h2 className="font-display text-[clamp(2.6rem,6vw,3.9rem)] font-extrabold text-primary leading-[0.92] mt-2">
              <span className="text-muted-foreground text-[0.5em] font-semibold align-top mr-1">$</span>
              {stats.projectedRevenue.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
            </h2>
          </div>
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">Negocios en mesa</p>
              <p className="font-display text-xl font-bold text-foreground mt-1">{stats.activeDeals}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">Conversión</p>
              <p className="font-display text-xl font-bold text-success mt-1">{stats.conversionRate}%</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">Prospectos</p>
              <p className="font-display text-xl font-bold text-foreground mt-1">{stats.totalLeads.toLocaleString("es-MX")}</p>
            </div>
          </div>
        </div>

        {/* Commission gauge */}
        <div className="rise-in surface-card p-6 flex flex-col justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-foreground">Comisiones ganadas</p>
            <p className="font-display text-[2.2rem] font-extrabold text-success leading-none mt-2">{money(stats.totalCommissions)}</p>
          </div>
          <div>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((seg) => (
                <div key={seg} className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ background: seg <= commissionTier ? "linear-gradient(90deg, var(--success), color-mix(in srgb, var(--success) 55%, var(--primary)))" : "transparent" }} />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2.5">
              Tramo <b className="text-success">{(stats.commissionPercentage * 100).toFixed(0)}%</b> sobre capital captado
            </p>
          </div>
        </div>
      </section>

      {/* ===== KPI rail ===== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Prospectos" value={stats.totalLeads.toLocaleString("es-MX")} tone="electric"
          foot="En seguimiento activo" footTone="success" icon={<Users />} />
        <KpiCard label="Negocios activos" value={stats.activeDeals} tone="primary"
          foot={stats.activeDeals > 0 ? "En mesa de asesoría" : "Sin negocios abiertos"} footTone="primary" icon={<Award />} />
        <KpiCard label="Conversión" value={<>{stats.conversionRate}<span className="text-[0.55em] text-muted-foreground">%</span></>} tone="success"
          foot="Negocios cerrados" footTone="success" icon={<Target />} />
        <KpiCard label="Dep. perdidos" value={stats.lostDeposits} tone="danger"
          foot="Feedback de cierre" footTone="danger" icon={<XCircle />} />
      </section>

      {/* ===== Charts ===== */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4">
        {/* Area chart */}
        <div className="rise-in surface-card">
          <div className="flex justify-between items-center px-6 pt-5 pb-1">
            <h3 className="font-title text-sm font-bold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Capital captado por mes
            </h3>
            <span className="text-[10px] text-muted-foreground border border-border px-2 py-0.5 rounded-md font-semibold">Últimos 6 meses</span>
          </div>
          <div className="h-64 px-3 pb-4">
            {noRevenue ? (
              <EmptyState icon={<TrendingUp className="h-8 w-8" />} text="Sin negocios registrados en este período" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.32} />
                      <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="name" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={48}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.border}`, borderRadius: "0.75rem", color: chartColors.axis, fontSize: "12px" }}
                    labelStyle={{ color: chartColors.primary, fontWeight: 700 }}
                    formatter={(val) => [money(Number(val ?? 0)), "Capital"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={chartColors.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" dot={false} activeDot={{ r: 4, fill: chartColors.primary }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Funnel */}
        <div className="rise-in surface-card">
          <div className="flex justify-between items-center px-6 pt-5 pb-1">
            <h3 className="font-title text-sm font-bold text-foreground">Embudo comercial</h3>
            <span className="text-[10px] text-muted-foreground border border-border px-2 py-0.5 rounded-md font-semibold">Distribución</span>
          </div>
          <div className="px-6 py-4 flex flex-col gap-3">
            {noPipeline ? (
              <EmptyState icon={<Award className="h-8 w-8" />} text="Sin negocios en el embudo" />
            ) : (
              pipelineData.map((s, i) => {
                const pct = Math.round((s.count / funnelTop) * 100);
                const conv = i === 0 ? 100 : pipelineData[i - 1].count > 0 ? Math.round((s.count / pipelineData[i - 1].count) * 100) : 0;
                const color = STAGE_COLORS[i] ?? "var(--primary)";
                return (
                  <div key={s.stage} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground font-semibold flex items-center gap-2">
                        <i className="w-2 h-2 rounded-sm inline-block" style={{ background: color }} />{s.stage}
                      </span>
                      <span className="font-display font-bold text-foreground">
                        {s.count}<span className="text-muted-foreground font-medium ml-1.5">{conv}%</span>
                      </span>
                    </div>
                    <div className="h-3 rounded-md bg-muted overflow-hidden">
                      <div className="h-full rounded-md transition-[width] duration-700 ease-out"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 55%, transparent))` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ===== Activity feed ===== */}
      {canSeeActivityLog && (
        <section className="rise-in surface-card">
          <div className="flex items-center gap-2.5 px-6 pt-5 pb-1">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-title text-sm font-bold text-foreground">Bitácora de actividad</h3>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="live-dot" />
              <span className="text-[9px] text-success font-bold tracking-[0.14em]">LIVE</span>
            </span>
          </div>
          <div className="px-3 py-2">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No se registran actividades recientes.</p>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="table-row-hover flex justify-between items-center gap-4 px-3 py-3 rounded-lg border-l-2 border-transparent">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground/90 truncate">{act.description}</p>
                    <span className="text-[10px] text-muted-foreground font-mono-numbers mt-0.5 block">
                      {new Date(act.created_at).toLocaleString("es-MX")}
                    </span>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] rounded-md border border-border bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-primary uppercase">
                    {act.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
};

/* ---------- Sub-components ---------- */

type Tone = "electric" | "primary" | "success" | "danger";
const TONE_TEXT: Record<Tone, string> = { electric: "text-electric", primary: "text-primary", success: "text-success", danger: "text-destructive" };
const TONE_VAR: Record<Tone, string> = { electric: "--electric", primary: "--primary", success: "--success", danger: "--destructive" };

interface KpiCardProps {
  label: string;
  value: ReactNode;
  tone: Tone;
  foot: string;
  footTone: Tone;
  icon: ReactNode;
}

function KpiCard({ label, value, tone, foot, footTone, icon }: KpiCardProps) {
  const v = TONE_VAR[tone];
  return (
    <div className="surface-card surface-lift rise-in p-[1.15rem] flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-foreground">{label}</p>
        <p className={`font-display text-[2.1rem] font-extrabold leading-none my-2 ${TONE_TEXT[tone]}`}>{value}</p>
        <p className={`text-[10.5px] font-semibold inline-flex items-center gap-1 ${TONE_TEXT[footTone]}`}>{foot}</p>
      </div>
      <div className="w-[38px] h-[38px] rounded-xl grid place-items-center shrink-0 [&_svg]:w-[19px] [&_svg]:h-[19px]"
        style={{ background: `color-mix(in srgb, var(${v}) 12%, transparent)`, border: `1px solid color-mix(in srgb, var(${v}) 22%, transparent)` }}>
        <span className={TONE_TEXT[tone]}>{icon}</span>
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
      {icon}
      <p className="text-xs">{text}</p>
    </div>
  );
}
