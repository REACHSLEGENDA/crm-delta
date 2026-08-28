import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import type { ComplianceDocument, Deal, Lead } from "@/types";

type DocStatus = "pendiente" | "aprobado" | "rechazado";
type ScopeFilter = "cumplimiento" | "todos";

interface RequiredDocument {
  document_type: string;
  label: string;
  sort_order: number;
}

type ReviewLead = Pick<Lead, "id" | "first_name" | "last_name" | "email" | "phone" | "status" | "agent_id" | "created_at">;

interface ReviewRow extends ReviewLead {
  agent_name: string;
  docs: ComplianceDocument[];
  deal?: Deal;
}

const STATUS_COLOR: Record<DocStatus, string> = {
  pendiente: "var(--warning)",
  aprobado: "var(--success)",
  rechazado: "var(--danger)",
};

export const CumplimientoDashboard = () => {
  const { profile } = useAuth();
  const { isSuperAdmin, isCompliance, isManager } = usePermissions();
  const canManage = isSuperAdmin || isCompliance || isManager;

  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [required, setRequired] = useState<RequiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<ScopeFilter>("cumplimiento");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [leadResult, reqResult, dealResult] = await Promise.all([
      supabase
        .from("leads")
        .select("id,first_name,last_name,email,phone,status,agent_id,is_burned,created_at, agent:profiles!leads_agent_id_fkey(first_name, last_name), compliance_documents(*)")
        .eq("is_burned", false)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("compliance_required_documents").select("*").eq("active", true).order("sort_order"),
      supabase.from("deals").select("id,lead_id,stage,pipeline").eq("pipeline", "Cumplimiento").limit(1000),
    ]);

    if (leadResult.error) {
      setError(leadResult.error.message);
      setLoading(false);
      return;
    }

    const dealByLead = new Map<string, Deal>();
    (dealResult.data ?? []).forEach((deal) => {
      const item = deal as Deal;
      if (item.lead_id) dealByLead.set(item.lead_id, item);
    });

    const mapped: ReviewRow[] = (leadResult.data ?? []).map((item) => {
      const record = item as unknown as ReviewLead & {
        agent?: { first_name?: string; last_name?: string } | null;
        compliance_documents?: ComplianceDocument[] | null;
      };
      return {
        ...record,
        agent_name: record.agent
          ? `${record.agent.first_name ?? ""} ${record.agent.last_name ?? ""}`.trim() || "Sin asignar"
          : "Sin asignar",
        docs: record.compliance_documents ?? [],
        deal: dealByLead.get(record.id),
      };
    });

    setRows(mapped);
    if (reqResult.data) setRequired(reqResult.data as RequiredDocument[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDoc = async (doc: ComplianceDocument) => {
    const { data, error: signError } = await supabase.storage
      .from("compliance_docs")
      .createSignedUrl(doc.file_path, 60);
    if (signError || !data?.signedUrl) {
      setError(signError?.message ?? "No se pudo abrir el archivo.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const review = async (documentId: string, status: DocStatus) => {
    if (!profile?.id) return;
    setBusy(documentId);
    const { error: reviewError } = await supabase
      .from("compliance_documents")
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq("id", documentId);
    setBusy(null);
    if (reviewError) {
      setError(reviewError.message);
      return;
    }
    await load();
  };

  /** Opens a Cumplimiento file for a prospect that never came through the tunnel. */
  const sendToCompliance = async (row: ReviewRow) => {
    setBusy(row.id);
    setError("");
    const { error: insertError } = await supabase.from("deals").insert({
      name: `${row.first_name} ${row.last_name}`.trim(),
      value: 0,
      stage: "KYC pendiente",
      pipeline: "Cumplimiento",
      lead_id: row.id,
      agent_id: profile?.id ?? null,
      sales_agent_id: row.agent_id ?? null,
    });
    setBusy(null);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await load();
  };

  const approvedCount = (row: ReviewRow) =>
    required.filter((item) =>
      row.docs.some((doc) => doc.document_type === item.document_type && doc.status === "aprobado"),
    ).length;

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (scope === "cumplimiento" && !row.deal) return false;
      if (onlyIncomplete && approvedCount(row) === required.length && required.length > 0) return false;
      if (!term) return true;
      return `${row.first_name} ${row.last_name} ${row.email ?? ""} ${row.phone ?? ""} ${row.agent_name}`
        .toLowerCase()
        .includes(term);
    });
    // approvedCount depends on `required`, which is in the dependency list.
  }, [onlyIncomplete, required, rows, scope, search]);

  const inCompliance = rows.filter((row) => row.deal).length;
  const complete = rows.filter((row) => row.deal && required.length > 0 && approvedCount(row) === required.length).length;

  return (
    <div className="app-page flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="h-4 w-4" /> Cumplimiento
          </p>
          <h1 className="font-title text-2xl font-extrabold leading-none text-foreground sm:text-[1.9rem]">Revisión total</h1>
          <p className="mt-2 text-sm text-muted-foreground">Expedientes documentales y su estado de validación.</p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "En cumplimiento", value: inCompliance, tone: "--primary", text: "text-primary" },
          { label: "Expedientes completos", value: complete, tone: "--success", text: "text-success" },
          { label: "Pendientes", value: Math.max(inCompliance - complete, 0), tone: "--warning", text: "text-warning" },
        ].map((card) => (
          <div key={card.label} className="surface-card flex items-start justify-between gap-3 p-[1.15rem]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{card.label}</p>
              <p className={`font-display mt-2 text-[1.7rem] font-extrabold leading-none ${card.text}`}>{card.value}</p>
            </div>
            <span
              className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl"
              style={{
                background: `color-mix(in srgb, var(${card.tone}) 12%, transparent)`,
                border: `1px solid color-mix(in srgb, var(${card.tone}) 22%, transparent)`,
              }}
            >
              <ShieldCheck className={`h-[19px] w-[19px] ${card.text}`} />
            </span>
          </div>
        ))}
      </section>

      <div className="surface-card grid gap-3 p-3 lg:grid-cols-[minmax(240px,1fr)_auto_auto]">
        <label className="relative">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, correo, teléfono o agente…"
            className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <select
          value={scope}
          onChange={(event) => setScope(event.target.value as ScopeFilter)}
          className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Alcance"
        >
          <option value="cumplimiento">Solo en Cumplimiento</option>
          <option value="todos">Todos los prospectos</option>
        </select>
        <button
          type="button"
          onClick={() => setOnlyIncomplete((value) => !value)}
          className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
            onlyIncomplete ? "border-warning bg-warning/10 text-warning" : "border-border text-muted-foreground hover:bg-accent"
          }`}
        >
          <AlertCircle className="h-4 w-4" /> Solo incompletos
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {visibleRows.length} expediente{visibleRows.length === 1 ? "" : "s"}
        {scope === "cumplimiento" ? " en Cumplimiento" : " en total"}
      </p>

      {loading ? (
        <div className="grid place-items-center gap-3 p-20 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <span className="text-xs text-muted-foreground">Cargando expedientes…</span>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="surface-card grid place-items-center gap-2 p-14 text-center text-sm text-muted-foreground">
          <ShieldCheck className="h-8 w-8 text-primary/40" />
          {scope === "cumplimiento"
            ? "Ningún expediente en Cumplimiento todavía."
            : "No hay prospectos que coincidan con la búsqueda."}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleRows.map((row) => {
            const done = approvedCount(row);
            const isOpen = expanded === row.id;
            const allDone = required.length > 0 && done === required.length;

            return (
              <article key={row.id} className="surface-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : row.id)}
                  className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition-colors hover:bg-accent/40"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {row.first_name} {row.last_name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.email || "Sin correo"} · {row.agent_name}
                    </span>
                  </span>
                  {row.deal ? (
                    <span className="shrink-0 rounded-md border border-border bg-primary/8 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {row.deal.stage}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Fuera de cumplimiento
                    </span>
                  )}
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{
                      color: allDone ? "var(--success)" : "var(--warning)",
                      background: `color-mix(in srgb, ${allDone ? "var(--success)" : "var(--warning)"} 14%, transparent)`,
                    }}
                  >
                    {done} / {required.length}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-border p-4">
                    {!row.deal && canManage && (
                      <button
                        type="button"
                        onClick={() => void sendToCompliance(row)}
                        disabled={busy === row.id}
                        className="gold-button-primary mb-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" /> Enviar a Cumplimiento
                      </button>
                    )}

                    <ul className="flex flex-col gap-2">
                      {required.map((item) => {
                        const files = row.docs.filter((doc) => doc.document_type === item.document_type);
                        const satisfied = files.some((doc) => doc.status === "aprobado");
                        return (
                          <li key={item.document_type} className="rounded-lg border border-border bg-background p-3">
                            <div className="flex items-center gap-2">
                              {satisfied ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--success)" }} />
                              ) : (
                                <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                              )}
                              <span className="flex-1 text-sm font-semibold text-foreground">{item.label}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {files.length === 0 ? "Sin archivos" : `${files.length} archivo${files.length === 1 ? "" : "s"}`}
                              </span>
                            </div>

                            {files.length > 0 && (
                              <ul className="mt-2 flex flex-col gap-1.5">
                                {files.map((doc) => {
                                  const status = (doc.status as DocStatus | undefined) ?? "pendiente";
                                  return (
                                    <li
                                      key={doc.id}
                                      className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-card px-2 py-1.5"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => void openDoc(doc)}
                                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[11px] text-primary hover:underline"
                                      >
                                        <FileText className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{doc.file_name}</span>
                                      </button>
                                      <span
                                        className="shrink-0 text-[9px] font-bold uppercase tracking-wider"
                                        style={{ color: STATUS_COLOR[status] }}
                                      >
                                        {status}
                                      </span>
                                      {canManage && (
                                        <span className="flex shrink-0 gap-1">
                                          {status !== "aprobado" && (
                                            <button
                                              type="button"
                                              onClick={() => void review(doc.id, "aprobado")}
                                              disabled={busy === doc.id}
                                              className="rounded border border-success/35 px-1.5 py-0.5 text-success transition-colors hover:bg-success/10 disabled:opacity-50"
                                              title="Aprobar"
                                            >
                                              <CheckCircle2 className="h-3 w-3" />
                                            </button>
                                          )}
                                          {status !== "rechazado" && (
                                            <button
                                              type="button"
                                              onClick={() => void review(doc.id, "rechazado")}
                                              disabled={busy === doc.id}
                                              className="rounded border border-destructive/35 px-1.5 py-0.5 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                                              title="Rechazar"
                                            >
                                              <XCircle className="h-3 w-3" />
                                            </button>
                                          )}
                                        </span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
