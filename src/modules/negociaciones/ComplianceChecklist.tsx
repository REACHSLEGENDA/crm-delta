import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, FileText, Loader2, UploadCloud, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { openAttachment } from "@/lib/attachments";
import type { ComplianceDocument } from "@/types";

type DocStatus = "pendiente" | "aprobado" | "rechazado";

interface RequiredDocument {
  document_type: string;
  label: string;
  sort_order: number;
}

interface ComplianceChecklistProps {
  leadId: string;
  canReview: boolean;
}

const STATUS_META: Record<DocStatus, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "var(--warning)" },
  aprobado: { label: "Aprobado", color: "var(--success)" },
  rechazado: { label: "Rechazado", color: "var(--danger)" },
};

/**
 * Document checklist for the Cumplimiento pipeline. The database refuses to move
 * a deal to "Aprobado" while any required document is unapproved, so this view
 * mirrors that rule instead of owning it.
 */
export const ComplianceChecklist = ({ leadId, canReview }: ComplianceChecklistProps) => {
  const { profile } = useAuth();
  const [required, setRequired] = useState<RequiredDocument[]>([]);
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [reqResult, docResult] = await Promise.all([
      supabase.from("compliance_required_documents").select("*").eq("active", true).order("sort_order"),
      supabase.from("compliance_documents").select("*").eq("lead_id", leadId),
    ]);
    if (reqResult.data) setRequired(reqResult.data as RequiredDocument[]);
    if (docResult.data) setDocuments(docResult.data as ComplianceDocument[]);
  }, [leadId]);

  useEffect(() => {
    if (leadId) void load();
  }, [leadId, load]);

  const docFor = (type: string) => documents.find((item) => item.document_type === type);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile?.id) return;
    setBusy(type);
    setError("");
    try {
      const extension = file.name.split(".").pop() ?? "bin";
      const path = `${leadId}/${type}_${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("compliance_docs").upload(path, file);
      if (uploadError) throw uploadError;

      const existing = docFor(type);
      if (existing) {
        await supabase
          .from("compliance_documents")
          .update({ file_path: path, file_name: file.name, status: "pendiente", reviewed_by: null, reviewed_at: null })
          .eq("id", existing.id);
      } else {
        await supabase.from("compliance_documents").insert({
          lead_id: leadId,
          document_type: type,
          file_path: path,
          file_name: file.name,
          uploaded_by: profile.id,
          status: "pendiente",
        });
      }
      await load();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No se pudo subir el archivo.");
    } finally {
      setBusy(null);
    }
  };

  const review = async (documentId: string, status: DocStatus) => {
    if (!profile?.id) return;
    setBusy(documentId);
    setError("");
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

  const approved = required.filter((item) => docFor(item.document_type)?.status === "aprobado").length;
  const complete = required.length > 0 && approved === required.length;
  const accentColor = complete ? "var(--success)" : "var(--warning)";

  return (
    <section className="surface-card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Expediente documental</h2>
        <span
          className="rounded-full px-2 py-1 text-[11px] font-bold"
          style={{ color: accentColor, background: `color-mix(in srgb, ${accentColor} 14%, transparent)` }}
        >
          {approved} / {required.length}
        </span>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-destructive/25 bg-destructive/10 p-2 text-xs text-destructive">{error}</p>
      )}

      <ul className="flex flex-col gap-2">
        {required.map((item) => {
          const doc = docFor(item.document_type);
          const status = (doc?.status as DocStatus | undefined) ?? "pendiente";
          const meta = STATUS_META[status];
          const isBusy = busy === item.document_type || (doc ? busy === doc.id : false);

          return (
            <li key={item.document_type} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  {doc && status === "aprobado" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: meta.color }} />}
                  {doc && status === "rechazado" && <XCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: meta.color }} />}
                  {doc && status === "pendiente" && <CircleDashed className="mt-0.5 h-4 w-4 shrink-0" style={{ color: meta.color }} />}
                  {!doc && <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                    {doc ? (
                      <button
                        type="button"
                        onClick={() => void openAttachment({ name: doc.file_name, path: doc.file_path })}
                        className="mt-0.5 flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <FileText className="h-3 w-3" /> <span className="truncate">{doc.file_name}</span>
                      </button>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Sin archivo</p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                  {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : meta.label}
                </span>
              </div>

              {canReview && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border pt-2.5">
                  <label className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-md border border-border px-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                    <UploadCloud className="h-3 w-3" /> {doc ? "Reemplazar" : "Subir"}
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*,.pdf"
                      onChange={(event) => void upload(event, item.document_type)}
                    />
                  </label>
                  {doc && status !== "aprobado" && (
                    <button
                      type="button"
                      onClick={() => void review(doc.id, "aprobado")}
                      className="inline-flex min-h-8 items-center gap-1 rounded-md border border-success/35 px-2 text-[10px] font-semibold text-success transition-colors hover:bg-success/10"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Aprobar
                    </button>
                  )}
                  {doc && status !== "rechazado" && (
                    <button
                      type="button"
                      onClick={() => void review(doc.id, "rechazado")}
                      className="inline-flex min-h-8 items-center gap-1 rounded-md border border-destructive/35 px-2 text-[10px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <XCircle className="h-3 w-3" /> Rechazar
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!complete && required.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          La cuenta no puede pasar a <b className="text-foreground">Aprobado</b> hasta que los {required.length} documentos estén aprobados.
        </p>
      )}
    </section>
  );
};
