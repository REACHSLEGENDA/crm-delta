import type { DealStage, LeadContactOutcome, LeadStatus } from "@/types";

export const PIPELINE_STAGES = [
  "Nuevo lead",
  "Contactado",
  "Interesado",
  "Asesoría",
  "Depósito pendiente",
  "Ganado",
  "Perdido",
] as const satisfies readonly DealStage[];

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface StageConfig {
  label: string;
  shortLabel: string;
  color: string;
  token: string;
  leadStatus: LeadStatus;
}

export const STAGE_CONFIG: Record<PipelineStage, StageConfig> = {
  "Nuevo lead": {
    label: "Nuevo lead",
    shortLabel: "Nuevo",
    color: "var(--stage-new)",
    token: "new",
    leadStatus: "Nuevo",
  },
  Contactado: {
    label: "Contactado",
    shortLabel: "Contactado",
    color: "var(--stage-contacted)",
    token: "contacted",
    leadStatus: "Contactado",
  },
  Interesado: {
    label: "Interesado",
    shortLabel: "Interesado",
    color: "var(--stage-interested)",
    token: "interested",
    leadStatus: "Interesado",
  },
  Asesoría: {
    label: "Asesoría",
    shortLabel: "Asesoría",
    color: "var(--stage-advisory)",
    token: "advisory",
    leadStatus: "Asesoría",
  },
  "Depósito pendiente": {
    label: "Depósito pendiente",
    shortLabel: "Depósito",
    color: "var(--stage-deposit)",
    token: "deposit",
    leadStatus: "Depósito pendiente",
  },
  Ganado: {
    label: "Cerrado ganado",
    shortLabel: "Ganado",
    color: "var(--stage-won)",
    token: "won",
    leadStatus: "Ganado",
  },
  Perdido: {
    label: "Cerrado perdido",
    shortLabel: "Perdido",
    color: "var(--stage-lost)",
    token: "lost",
    leadStatus: "Perdido",
  },
};

export const ACTIVE_STAGES = PIPELINE_STAGES.filter(
  (stage) => stage !== "Ganado" && stage !== "Perdido",
);

/** Call-quality typification carried by the prospect (leads.contact_outcome). */
export interface ContactOutcomeConfig {
  label: string;
  color: string;
}

export const CONTACT_OUTCOME_CONFIG: Record<LeadContactOutcome, ContactOutcomeConfig> = {
  pending: { label: "Sin clasificar", color: "var(--muted-foreground)" },
  valid: { label: "Número válido", color: "var(--success)" },
  no_answer: { label: "No contestó", color: "var(--warning)" },
  direct_voicemail: { label: "Buzón directo", color: "var(--warning)" },
  invalid_number: { label: "Número inexistente", color: "var(--danger)" },
};

export const CONTACT_OUTCOMES = Object.keys(CONTACT_OUTCOME_CONFIG) as LeadContactOutcome[];

export const LOSS_REASONS = [
  "No respondió",
  "Sin capacidad de inversión",
  "No interesado",
  "Eligió otra plataforma",
  "Datos incorrectos",
  "Seguimiento fuera de tiempo",
  "Otro",
] as const;

export const formatCurrency = (value: number | string | null | undefined, currency = "USD") =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const isPipelineStage = (value: string): value is PipelineStage =>
  PIPELINE_STAGES.includes(value as PipelineStage);
