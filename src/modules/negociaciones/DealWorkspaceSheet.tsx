import { useMemo, useState } from "react";
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Mail,
  MessageSquareText,
  Paperclip,
  Phone,
  RotateCcw,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CopyableField } from "@/components/ui/CopyableField";
import { ComplianceChecklist } from "./ComplianceChecklist";
import { openAttachment } from "@/lib/attachments";
import { supabase } from "@/lib/supabase";
import type { Activity, Deal, FileAttachment, Lead, Note, Profile } from "@/types";
import { CONTACT_OUTCOME_CONFIG, PIPELINE_STAGES, STAGE_CONFIG, formatCurrency, isPipelineStage, type PipelineStage } from "./pipeline";

export interface ActivityDraft {
  title: string;
  description: string;
  dueAt: string;
  reminderMinutes: number;
}

interface DealWorkspaceSheetProps {
  open: boolean;
  deal: Deal | null;
  lead?: Lead;
  agent?: Profile;
  activities: Activity[];
  notes: Note[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onStageChange: (stage: PipelineStage) => void;
  onEdit: (deal: Deal) => void;
  onCreateActivity: (draft: ActivityDraft) => Promise<void>;
  onCompleteActivity: (activity: Activity) => void;
  onPostponeActivity: (activity: Activity) => void;
  onDeleteActivity: (activity: Activity) => void;
  canManageActivity?: (activity: Activity) => boolean;
  onCreateNote: (content: string, files: File[]) => Promise<void>;
  /** Writes the typification straight to the prospect (single source of truth). */
  onOutcomeChange?: (lead: Lead, outcome: NonNullable<Lead["contact_outcome"]>) => void;
  /** Admin-only rollback to the start of the sales pipeline. */
  onResetAccount?: (deal: Deal) => void;
}

const toLocalDateTimeValue = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const defaultDueAt = () => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(10, 0, 0, 0);
  return toLocalDateTimeValue(next);
};

export const DealWorkspaceSheet = ({
  open,
  deal,
  lead,
  agent,
  activities,
  notes,
  saving,
  onOpenChange,
  onStageChange,
  onEdit,
  onCreateActivity,
  onCompleteActivity,
  onPostponeActivity,
  onDeleteActivity,
  canManageActivity = () => true,
  onCreateNote,
  onOutcomeChange,
  onResetAccount,
}: DealWorkspaceSheetProps) => {
  const [activityDraft, setActivityDraft] = useState<ActivityDraft>({
    title: "Comunicarse con el cliente",
    description: "",
    dueAt: defaultDueAt(),
    reminderMinutes: 15,
  });
  const [noteContent, setNoteContent] = useState("");
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState("");

  const timeline = useMemo(() => [
    ...activities.map((activity) => ({ kind: "activity" as const, date: activity.created_at, item: activity })),
    ...notes.map((note) => ({ kind: "note" as const, date: note.created_at, item: note })),
  ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()), [activities, notes]);

  if (!deal) return null;

  const currentStage = isPipelineStage(deal.stage) ? deal.stage : "Nuevo lead";

  const submitActivity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activityDraft.title.trim() || !activityDraft.dueAt) {
      setFormError("Agrega un título y una fecha límite.");
      return;
    }
    setFormError("");
    await onCreateActivity(activityDraft);
    setActivityDraft({ title: "Comunicarse con el cliente", description: "", dueAt: defaultDueAt(), reminderMinutes: 15 });
  };

  const submitNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!noteContent.trim() && noteFiles.length === 0) {
      setFormError("Escribe un comentario o adjunta al menos un archivo.");
      return;
    }
    setFormError("");
    await onCreateNote(noteContent.trim(), noteFiles);
    setNoteContent("");
    setNoteFiles([]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-hidden border-border bg-background p-0 sm:max-w-[94vw] xl:max-w-[1180px]">
        <SheetHeader className="border-b border-border bg-card px-5 py-4 pr-14">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate font-title text-xl">{deal.name}</SheetTitle>
              <SheetDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{formatCurrency(deal.value, deal.currency)}</span>
                {lead && <span>{lead.first_name} {lead.last_name}</span>}
                {agent && <span>Responsable: {agent.first_name} {agent.last_name}</span>}
              </SheetDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onResetAccount && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onResetAccount(deal)}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  title="Elimina los expedientes de Cumplimiento y Retención y devuelve la cuenta al inicio de Ventas"
                >
                  <RotateCcw /> Regresar al inicio
                </Button>
              )}
              {lead && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const { error } = await supabase.from('leads').update({ in_call_queue: true }).eq('id', lead.id);
                    if (!error) {
                      alert("Agregado a la cola de llamadas.");
                    } else {
                      alert("Error al agregar a la cola.");
                    }
                  }}
                  disabled={lead.in_call_queue}
                  className="gold-button-secondary text-xs"
                >
                  {lead.in_call_queue ? "📞 En cola" : "📞 Mandar a cola"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onEdit(deal)}>Editar negociación</Button>
            </div>
          </div>
        </SheetHeader>

        <div className="border-b border-border bg-card px-4 py-3">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 xl:grid-cols-7" aria-label="Etapas de la negociación">
            {PIPELINE_STAGES.map((stage, index) => {
              const config = STAGE_CONFIG[stage];
              const activeIndex = PIPELINE_STAGES.indexOf(currentStage);
              const reached = index <= activeIndex && currentStage !== "Perdido";
              const active = currentStage === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => onStageChange(stage)}
                  aria-current={active ? "step" : undefined}
                  className={`min-h-11 rounded-md border px-2 py-2 text-left text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-current bg-current/10" : "border-border bg-muted/35 hover:bg-muted"}`}
                  style={{ color: active || reached ? config.color : "var(--muted-foreground)" }}
                >
                  <span className="block text-[9px] font-medium uppercase opacity-70">Paso {index + 1}</span>
                  <span className="block truncate">{config.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(280px,0.82fr)_minmax(430px,1.35fr)] lg:overflow-hidden">
          <aside className="space-y-4 border-b border-border p-4 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <section className="surface-card p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Sobre la negociación</h2>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{STAGE_CONFIG[currentStage].label}</span>
              </div>
              <dl className="space-y-4">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Capital</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold">{formatCurrency(deal.value, deal.currency)}</dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Creada</dt>
                    <dd className="mt-1 text-sm font-medium font-mono-numbers">{new Date(deal.created_at).toLocaleDateString("es-MX")}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Cierre previsto</dt>
                    <dd className="mt-1 text-sm font-medium font-mono-numbers">{deal.expected_closing_date ? new Date(`${deal.expected_closing_date}T12:00:00`).toLocaleDateString("es-MX") : "Sin fecha"}</dd>
                  </div>
                </div>
                {deal.loss_reason && (
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Motivo de pérdida</dt>
                    <dd className="mt-1 text-sm font-medium text-destructive">{deal.loss_reason}</dd>
                  </div>
                )}
              </dl>
            </section>

            {deal.pipeline === "Cumplimiento" && lead && (
              <ComplianceChecklist leadId={lead.id} canReview={Boolean(onOutcomeChange)} />
            )}

            <section className="surface-card p-5">
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Prospecto</h2>
              {lead ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{lead.first_name} {lead.last_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{lead.country || "País sin registrar"}</p>
                    </div>
                  </div>
                  {lead.email && <CopyableField value={lead.email} label="correo" icon={<Mail className="h-4 w-4 shrink-0" />} />}
                  {lead.phone && <CopyableField value={lead.phone} label="teléfono" icon={<Phone className="h-4 w-4 shrink-0" />} />}

                  {onOutcomeChange && (
                    <div className="border-t border-border pt-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Tipificación</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(CONTACT_OUTCOME_CONFIG) as Array<NonNullable<Lead["contact_outcome"]>>).map((value) => {
                          const config = CONTACT_OUTCOME_CONFIG[value];
                          const isActive = (lead.contact_outcome ?? "pending") === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => onOutcomeChange(lead, value)}
                              className="min-h-9 rounded-lg px-2.5 text-[11px] font-bold transition-colors"
                              style={{
                                color: isActive ? config.color : "var(--muted-foreground)",
                                background: isActive ? `color-mix(in srgb, ${config.color} 14%, transparent)` : "transparent",
                                border: `1px solid ${isActive ? `color-mix(in srgb, ${config.color} 35%, transparent)` : "var(--border)"}`,
                              }}
                              aria-pressed={isActive}
                            >
                              {config.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay un prospecto asociado.</p>
              )}
            </section>

            <section className="surface-card p-5">
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Responsable</h2>
              {agent ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{agent.first_name?.[0]}{agent.last_name?.[0]}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{agent.first_name} {agent.last_name}</p>
                    <p className="text-xs text-muted-foreground">{agent.role} · {agent.department}</p>
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">Sin responsable asignado.</p>}
            </section>
          </aside>

          <section className="min-h-0 p-4 lg:overflow-y-auto">
            <Tabs defaultValue="activity" className="gap-4">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="activity"><CalendarClock /> Actividad</TabsTrigger>
                <TabsTrigger value="comment"><MessageSquareText /> Comentario</TabsTrigger>
              </TabsList>

              <TabsContent value="activity">
                <form onSubmit={submitActivity} className="surface-card space-y-4 p-5">
                  <div>
                    <label htmlFor="activity-title" className="mb-1.5 block text-xs font-semibold">Actividad</label>
                    <Input id="activity-title" value={activityDraft.title} onChange={(event) => setActivityDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Ej. Comunicarse con el cliente" />
                  </div>
                  <div>
                    <label htmlFor="activity-description" className="mb-1.5 block text-xs font-semibold">Detalle</label>
                    <Textarea id="activity-description" value={activityDraft.description} onChange={(event) => setActivityDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Objetivo, contexto o acuerdos para el seguimiento" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="activity-due" className="mb-1.5 block text-xs font-semibold">Fecha límite</label>
                      <Input id="activity-due" type="datetime-local" value={activityDraft.dueAt} onChange={(event) => setActivityDraft((current) => ({ ...current, dueAt: event.target.value }))} />
                    </div>
                    <div>
                      <label htmlFor="activity-reminder" className="mb-1.5 block text-xs font-semibold">Alerta</label>
                      <select id="activity-reminder" value={activityDraft.reminderMinutes} onChange={(event) => setActivityDraft((current) => ({ ...current, reminderMinutes: Number(event.target.value) }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value={0}>Cuando comience</option>
                        <option value={15}>15 minutos antes</option>
                        <option value={30}>30 minutos antes</option>
                        <option value={60}>1 hora antes</option>
                        <option value={120}>2 horas antes</option>
                        <option value={1440}>1 día antes</option>
                      </select>
                    </div>
                  </div>
                  {formError && <p role="alert" className="text-xs font-medium text-destructive">{formError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={saving}><AlarmClock /> {saving ? "Guardando..." : "Guardar actividad"}</Button>
                    <Button type="button" variant="ghost" onClick={() => setActivityDraft({ title: "Comunicarse con el cliente", description: "", dueAt: defaultDueAt(), reminderMinutes: 15 })}>Cancelar</Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="comment">
                <form onSubmit={submitNote} className="surface-card space-y-4 p-5">
                  <div>
                    <label htmlFor="deal-comment" className="mb-1.5 block text-xs font-semibold">Comentario de seguimiento</label>
                    <Textarea id="deal-comment" value={noteContent} onChange={(event) => setNoteContent(event.target.value)} className="min-h-32" placeholder="Registra acuerdos, objeciones, perfil del cliente o próximos pasos" />
                  </div>
                  <div>
                    <label htmlFor="deal-comment-files" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary">
                      <Paperclip className="h-4 w-4" /> Adjuntar imágenes o documentos
                    </label>
                    <input id="deal-comment-files" type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" className="sr-only" onChange={(event) => setNoteFiles(Array.from(event.target.files || []))} />
                    {noteFiles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {noteFiles.map((file) => <span key={`${file.name}-${file.size}`} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{file.name}</span>)}
                      </div>
                    )}
                  </div>
                  {formError && <p role="alert" className="text-xs font-medium text-destructive">{formError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={saving}><MessageSquareText /> {saving ? "Guardando..." : "Guardar comentario"}</Button>
                    <Button type="button" variant="ghost" onClick={() => { setNoteContent(""); setNoteFiles([]); }}>Cancelar</Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Historial</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-3">
              {timeline.length === 0 && <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Aún no hay seguimiento registrado.</p>}
              {timeline.map((entry) => entry.kind === "activity" ? (
                <ActivityTimelineItem key={`activity-${entry.item.id}`} activity={entry.item} onComplete={onCompleteActivity} onPostpone={onPostponeActivity} onDelete={onDeleteActivity} manageable={canManageActivity(entry.item)} />
              ) : (
                <NoteTimelineItem key={`note-${entry.item.id}`} note={entry.item} />
              ))}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const ActivityTimelineItem = ({ activity, onComplete, onPostpone, onDelete, manageable }: { activity: Activity; onComplete: (activity: Activity) => void; onPostpone: (activity: Activity) => void; onDelete: (activity: Activity) => void; manageable: boolean }) => {
  const completed = activity.status === "completed" || Boolean(activity.completed_at);
  const dueDate = new Date(activity.due_at || activity.created_at);
  return (
    <article className={`rounded-xl border p-4 ${completed ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card"}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${completed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary"}`}>
          {completed ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-semibold ${completed ? "text-muted-foreground line-through" : ""}`}>{activity.title || activity.description}</h3>
          {activity.title && activity.description && activity.title !== activity.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{activity.description}</p>}
          <p className="mt-2 text-xs text-muted-foreground">Fecha límite: {dueDate.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
      </div>
      {manageable && <div className="mt-3 flex flex-wrap gap-2 pl-12">
        {!completed && <Button size="sm" onClick={() => onComplete(activity)}><CheckCircle2 /> Completar</Button>}
        {!completed && <Button size="sm" variant="outline" onClick={() => onPostpone(activity)}><RotateCcw /> Posponer</Button>}
        <Button size="sm" variant="ghost" onClick={() => onDelete(activity)} className="hover:bg-destructive/10 hover:text-destructive"><Trash2 /> Eliminar</Button>
      </div>}
    </article>
  );
};

const NoteTimelineItem = ({ note }: { note: Note }) => (
  <article className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><MessageSquareText className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
        <p className="mt-2 text-xs text-muted-foreground">{new Date(note.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</p>
        {note.attachments && note.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {note.attachments.map((attachment: FileAttachment) => (
              <button key={attachment.path} type="button" onClick={() => void openAttachment(attachment)} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                {attachment.type?.startsWith("image/") ? <Download className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                <span className="max-w-48 truncate">{attachment.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  </article>
);
