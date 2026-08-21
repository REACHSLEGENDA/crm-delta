import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CircleDollarSign, Trophy, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Deal, Lead, Profile } from "@/types";
import { ACTIVE_STAGES, LOSS_REASONS, type PipelineStage } from "./pipeline";

export interface DealFormPayload {
  name: string;
  value: number;
  currency: string;
  stage: PipelineStage;
  lead_id: string | null;
  agent_id: string | null;
  expected_closing_date: string | null;
}

interface DealFormDialogProps {
  open: boolean;
  saving: boolean;
  deal: Deal | null;
  preferredLead: Lead | null;
  leads: Lead[];
  agents: Profile[];
  defaultAgentId?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: DealFormPayload) => Promise<void>;
}

const amountFromDeal = (deal: Deal | null) => deal ? String(Number(deal.value || 0)) : "";

export const DealFormDialog = ({
  open,
  saving,
  deal,
  preferredLead,
  leads,
  agents,
  defaultAgentId,
  onOpenChange,
  onSubmit,
}: DealFormDialogProps) => {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [stage, setStage] = useState<PipelineStage>("Nuevo lead");
  const [leadId, setLeadId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const lead = preferredLead ?? leads.find((item) => item.id === deal?.lead_id) ?? null;
    setName(deal?.name ?? (lead ? `${lead.first_name} ${lead.last_name}`.trim() : ""));
    setValue(amountFromDeal(deal));
    setCurrency(deal?.currency ?? "USD");
    setStage(deal && ACTIVE_STAGES.some((activeStage) => activeStage === deal.stage) ? deal.stage as PipelineStage : "Nuevo lead");
    setLeadId(deal?.lead_id ?? lead?.id ?? "");
    setAgentId(deal?.agent_id ?? lead?.agent_id ?? defaultAgentId ?? "");
    setExpectedDate(deal?.expected_closing_date?.slice(0, 10) ?? "");
    setError("");
  }, [deal, defaultAgentId, leads, open, preferredLead]);

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === leadId), [leadId, leads]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(value || 0);
    if (!name.trim()) {
      setError("El nombre de la negociación es obligatorio.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setError("El monto debe ser un número válido mayor o igual a cero.");
      return;
    }
    if ((stage === "Depósito pendiente" || deal?.stage === "Ganado") && amount <= 0) {
      setError("Captura el monto del depósito para esta etapa.");
      return;
    }
    setError("");
    await onSubmit({
      name: name.trim(),
      value: amount,
      currency,
      stage,
      lead_id: leadId || null,
      agent_id: agentId || selectedLead?.agent_id || defaultAgentId || null,
      expected_closing_date: expectedDate || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{deal ? "Editar negociación" : "Nueva negociación"}</DialogTitle>
          <DialogDescription>Registra el importe desde el inicio; podrás corregirlo antes de cerrar la operación.</DialogDescription>
        </DialogHeader>
        <form id="deal-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-foreground sm:col-span-2">
            Nombre de la negociación
            <input value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground sm:col-span-2">
            Prospecto asociado
            <select value={leadId} onChange={(event) => { const nextLead = leads.find((item) => item.id === event.target.value); setLeadId(event.target.value); if (nextLead && !name) setName(`${nextLead.first_name} ${nextLead.last_name}`.trim()); if (nextLead?.agent_id) setAgentId(nextLead.agent_id); }} className="h-11 rounded-lg border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Sin prospecto asociado</option>
              {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.first_name} {lead.last_name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Monto del depósito / negociación
            <span className="relative">
              <CircleDollarSign className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <input type="number" min="0" step="0.01" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} placeholder="0.00" className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Moneda
            <select value={currency} onChange={(event) => setCurrency(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="USD">USD</option>
              <option value="MXN">MXN</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Etapa activa
            <select value={stage} onChange={(event) => setStage(event.target.value as PipelineStage)} className="h-11 rounded-lg border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {ACTIVE_STAGES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Cierre estimado
            <input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground sm:col-span-2">
            Agente responsable
            <select value={agentId} onChange={(event) => setAgentId(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Sin asignar</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.first_name} {agent.last_name}</option>)}
            </select>
          </label>
          {error && <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2">{error}</p>}
        </form>
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-accent">Cancelar</button>
          <button form="deal-form" type="submit" disabled={saving} className="gold-button-primary min-h-11 rounded-lg px-4 text-sm font-bold disabled:opacity-50">{saving ? "Guardando…" : "Guardar negociación"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface CloseDealDialogProps {
  open: boolean;
  saving: boolean;
  deal: Deal | null;
  targetStage: "Ganado" | "Perdido" | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { finalAmount: number; closeReason: string; lossReason: string }) => Promise<void>;
}

export const CloseDealDialog = ({ open, saving, deal, targetStage, onOpenChange, onConfirm }: CloseDealDialogProps) => {
  const [amount, setAmount] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount(String(Number(deal?.value || 0)));
    setCloseReason("");
    setLossReason("");
    setError("");
  }, [deal, open, targetStage]);

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    const finalAmount = Number(amount || 0);
    if (targetStage === "Ganado" && (!Number.isFinite(finalAmount) || finalAmount <= 0)) {
      setError("Para marcar como Ganado debes confirmar un monto mayor a cero.");
      return;
    }
    if (targetStage === "Perdido" && !lossReason) {
      setError("Selecciona el motivo de pérdida para mantener métricas confiables.");
      return;
    }
    setError("");
    await onConfirm({ finalAmount, closeReason: closeReason.trim(), lossReason });
  };

  const won = targetStage === "Ganado";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className={`mb-1 grid h-11 w-11 place-items-center rounded-xl ${won ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
            {won ? <Trophy className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </div>
          <DialogTitle>{won ? "Cerrar como Ganado" : "Cerrar como Perdido"}</DialogTitle>
          <DialogDescription>{deal?.name}. Este cierre actualizará también el estado del prospecto asociado.</DialogDescription>
        </DialogHeader>
        <form id="close-deal-form" onSubmit={confirm} className="grid gap-4">
          {won ? (
            <>
              <label className="grid gap-1.5 text-sm font-medium text-foreground">Monto final confirmado<input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
              <label className="grid gap-1.5 text-sm font-medium text-foreground">Nota de cierre<textarea rows={3} value={closeReason} onChange={(event) => setCloseReason(event.target.value)} placeholder="Depósito confirmado, producto contratado…" className="rounded-lg border border-input bg-background px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
            </>
          ) : (
            <>
              <label className="grid gap-1.5 text-sm font-medium text-foreground">Motivo de pérdida<select value={lossReason} onChange={(event) => setLossReason(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Seleccionar motivo…</option>{LOSS_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></label>
              <label className="grid gap-1.5 text-sm font-medium text-foreground">Contexto adicional<textarea rows={3} value={closeReason} onChange={(event) => setCloseReason(event.target.value)} placeholder="Información útil para análisis posterior" className="rounded-lg border border-input bg-background px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
            </>
          )}
          {error && <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-accent">Cancelar</button>
          <button form="close-deal-form" type="submit" disabled={saving} className={`min-h-11 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-50 ${won ? "bg-emerald-600 hover:bg-emerald-700" : "bg-destructive hover:bg-destructive/90"}`}>{saving ? "Cerrando…" : won ? "Confirmar ganado" : "Confirmar perdido"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface PostponeDialogProps {
  open: boolean;
  saving: boolean;
  currentDueAt?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dueAt: string) => Promise<void>;
}

const localDateTime = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export const PostponeDialog = ({ open, saving, currentDueAt, onOpenChange, onConfirm }: PostponeDialogProps) => {
  const [dueAt, setDueAt] = useState("");
  useEffect(() => {
    if (!open) return;
    const base = currentDueAt ? new Date(currentDueAt) : new Date();
    if (!currentDueAt || base.getTime() < Date.now()) base.setDate(base.getDate() + 1);
    setDueAt(localDateTime(base));
  }, [currentDueAt, open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><div className="mb-1 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarClock className="h-5 w-5" /></div><DialogTitle>Posponer actividad</DialogTitle><DialogDescription>Selecciona la nueva fecha y hora de seguimiento.</DialogDescription></DialogHeader>
        <label className="grid gap-1.5 text-sm font-medium text-foreground">Nueva fecha y hora<input type="datetime-local" value={dueAt} min={localDateTime(new Date())} onChange={(event) => setDueAt(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
        <DialogFooter><button type="button" onClick={() => onOpenChange(false)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-accent">Cancelar</button><button type="button" onClick={() => dueAt && void onConfirm(dueAt)} disabled={!dueAt || saving} className="gold-button-primary min-h-11 rounded-lg px-4 text-sm font-bold disabled:opacity-50">{saving ? "Guardando…" : "Posponer"}</button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
