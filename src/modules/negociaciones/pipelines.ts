import type { DealStage } from "@/types";

/** The three operational pipelines an account moves through. */
export const DEAL_PIPELINES = ["Ventas", "Cumplimiento", "Retencion"] as const;
export type DealPipeline = (typeof DEAL_PIPELINES)[number];

export interface PipelineConfig {
  label: string;
  description: string;
  /** Department whose agents own this pipeline. */
  department: "Ventas" | "Cumplimiento" | "Retencion";
  stages: readonly DealStage[];
}

export const SALES_STAGES = [
  "Nuevo lead",
  "Contactado",
  "Interesado",
  "Asesoría",
  "Depósito pendiente",
  "Ganado",
  "Perdido",
] as const satisfies readonly DealStage[];

export const COMPLIANCE_STAGES = [
  "KYC pendiente",
  "Documentos en revisión",
  "Contrato pendiente",
  "Aprobado",
  "Rechazado",
] as const satisfies readonly DealStage[];

export const RETENTION_STAGES = [
  "R1 Bienvenida",
  "R2 Perfil de riesgo",
  "R3 Primera estrategia",
  "R4 Seguimiento inicial",
  "R5 Re-depósito",
  "R6 Consolidación",
  "R7 Fidelización",
] as const satisfies readonly DealStage[];

export const PIPELINE_CONFIG: Record<DealPipeline, PipelineConfig> = {
  Ventas: {
    label: "Ventas",
    description: "Captación y cierre de depósito",
    department: "Ventas",
    stages: SALES_STAGES,
  },
  Cumplimiento: {
    label: "Cumplimiento",
    description: "Validación documental y contratos",
    department: "Cumplimiento",
    stages: COMPLIANCE_STAGES,
  },
  Retencion: {
    label: "Retención",
    description: "Ciclo de vida del cliente, etapas 1 a 7",
    department: "Retencion",
    stages: RETENTION_STAGES,
  },
};

export const stagesForPipeline = (pipeline: DealPipeline): readonly DealStage[] =>
  PIPELINE_CONFIG[pipeline].stages;

export const isDealPipeline = (value: string): value is DealPipeline =>
  DEAL_PIPELINES.includes(value as DealPipeline);

/** Pipelines a user may open, given their role and department. */
export const visiblePipelines = (
  role: string | undefined,
  department: string | undefined,
): DealPipeline[] => {
  if (role === "SUPERADMIN" || role === "MANAGER") return [...DEAL_PIPELINES];
  if (department === "Cumplimiento") return ["Ventas", "Cumplimiento"];
  if (department === "Retencion") return ["Retencion"];
  return ["Ventas"];
};

/** Visual metadata for every stage across the three pipelines. */
export interface StageMeta {
  shortLabel: string;
  color: string;
}

const SALES_META: Record<string, StageMeta> = {
  "Nuevo lead": { shortLabel: "Nuevo", color: "var(--stage-new)" },
  Contactado: { shortLabel: "Contactado", color: "var(--stage-contacted)" },
  Interesado: { shortLabel: "Interesado", color: "var(--stage-interested)" },
  "Asesoría": { shortLabel: "Asesoría", color: "var(--stage-advisory)" },
  "Depósito pendiente": { shortLabel: "Depósito", color: "var(--stage-deposit)" },
  Ganado: { shortLabel: "Ganado", color: "var(--stage-won)" },
  Perdido: { shortLabel: "Perdido", color: "var(--stage-lost)" },
};

const COMPLIANCE_META: Record<string, StageMeta> = {
  "KYC pendiente": { shortLabel: "KYC", color: "var(--stage-new)" },
  "Documentos en revisión": { shortLabel: "Documentos", color: "var(--stage-contacted)" },
  "Contrato pendiente": { shortLabel: "Contrato", color: "var(--stage-interested)" },
  Aprobado: { shortLabel: "Aprobado", color: "var(--stage-won)" },
  Rechazado: { shortLabel: "Rechazado", color: "var(--stage-lost)" },
};

const RETENTION_META: Record<string, StageMeta> = {
  "R1 Bienvenida": { shortLabel: "1 · Bienvenida", color: "var(--stage-new)" },
  "R2 Perfil de riesgo": { shortLabel: "2 · Perfil", color: "var(--stage-contacted)" },
  "R3 Primera estrategia": { shortLabel: "3 · Estrategia", color: "var(--stage-interested)" },
  "R4 Seguimiento inicial": { shortLabel: "4 · Seguimiento", color: "var(--stage-advisory)" },
  "R5 Re-depósito": { shortLabel: "5 · Re-depósito", color: "var(--stage-deposit)" },
  "R6 Consolidación": { shortLabel: "6 · Consolidación", color: "var(--electric)" },
  "R7 Fidelización": { shortLabel: "7 · Premium", color: "var(--stage-won)" },
};

const ALL_STAGE_META: Record<string, StageMeta> = {
  ...SALES_META,
  ...COMPLIANCE_META,
  ...RETENTION_META,
};

export const stageMeta = (stage: string): StageMeta =>
  ALL_STAGE_META[stage] ?? { shortLabel: stage, color: "var(--muted-foreground)" };
