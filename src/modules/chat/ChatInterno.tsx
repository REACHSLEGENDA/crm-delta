import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  Hash,
  Image as ImageIcon,
  Lock,
  Menu,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Smile,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import type { Channel, ChannelType, FileAttachment, Message, Profile } from "@/types";
import { getAttachmentUrl, openAttachment, removeAttachment, uploadAttachment } from "@/lib/attachments";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DEFAULT_CHANNELS: Array<{ name: string; type: ChannelType }> = [
  { name: "Ventas", type: "ventas" },
  { name: "Compliance", type: "alertas" },
  { name: "Retention", type: "general" },
  { name: "Líderes", type: "alertas" },
];
const EMOJIS = ["👍", "✅", "🎯", "📞", "💬", "🔥", "👏", "🤝", "🚀", "💰", "😊", "🙏"];

const fullName = (profile?: Pick<Profile, "first_name" | "last_name" | "email">) =>
  profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email : "Usuario";

const AttachmentPreview = ({ attachment }: { attachment: FileAttachment }) => {
  const [url, setUrl] = useState(attachment.url ?? "");
  useEffect(() => {
    let active = true;
    if (!attachment.url && attachment.type?.startsWith("image/")) {
      void getAttachmentUrl(attachment).then((signedUrl) => active && setUrl(signedUrl)).catch(() => undefined);
    }
    return () => { active = false; };
  }, [attachment]);

  if (url && (attachment.type?.startsWith("image/") || attachment.url)) {
    return (
      <button type="button" onClick={() => void openAttachment(attachment)} className="block overflow-hidden rounded-lg border border-border bg-muted/40">
        <img src={url} alt={attachment.name} className="max-h-56 w-full object-contain" loading="lazy" />
      </button>
    );
  }
  return (
    <button type="button" onClick={() => void openAttachment(attachment)} className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-xs text-foreground hover:border-primary/40">
      <FileText className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{attachment.name}</span>
    </button>
  );
};

export const ChatInterno = () => {
  const { profile } = useAuth();
  const { isSuperAdmin, isManager, isAuditMode } = usePermissions();
  const canManagePublicChannels = !isAuditMode && (isSuperAdmin || isManager);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [gifUrl, setGifUrl] = useState("");
  const [showGifInput, setShowGifInput] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mobileChannelsOpen, setMobileChannelsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<ChannelType>("privado");
  const [newChannelMembers, setNewChannelMembers] = useState<string[]>([]);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [confirmChannel, setConfirmChannel] = useState<Channel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const fetchChannels = useCallback(async () => {
    const { data, error: channelError } = await supabase.from("channels").select("*").order("name");
    if (channelError) { setError(channelError.message); return; }
    const nextChannels = (data ?? []) as Channel[];
    setChannels(nextChannels);
    setSelectedChannel((current) => nextChannels.find((item) => item.id === current?.id) ?? nextChannels[0] ?? null);
  }, []);

  const ensureDefaultChannels = useCallback(async () => {
    if (!canManagePublicChannels || !profile?.id) return;
    for (const channel of DEFAULT_CHANNELS) {
      const { data } = await supabase.from("channels").select("id").eq("name", channel.name).maybeSingle();
      if (!data) await supabase.from("channels").insert({ ...channel, created_by: profile.id });
    }
  }, [canManagePublicChannels, profile?.id]);

  useEffect(() => {
    if (!profile) return;
    void Promise.all([
      ensureDefaultChannels().then(fetchChannels),
      supabase.from("profiles").select("*").eq("active", true).order("first_name").then(({ data }) => setAllUsers((data ?? []) as Profile[])),
    ]);
  }, [ensureDefaultChannels, fetchChannels, profile]);

  const fetchMessages = useCallback(async (channelId: string) => {
    const { data, error: messageError } = await supabase
      .from("messages")
      .select("*, profiles(first_name, last_name, email)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(1000);
    if (messageError) { setError(messageError.message); return; }
    setMessages((data ?? []) as Message[]);
    window.setTimeout(scrollToBottom, 50);
  }, []);

  useEffect(() => {
    if (!selectedChannel) { setMessages([]); return; }
    void fetchMessages(selectedChannel.id);
    const subscription = supabase
      .channel(`messages_${selectedChannel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${selectedChannel.id}` }, async (payload) => {
        if (payload.new.user_id === profile?.id) return;
        const { data: sender } = await supabase.from("profiles").select("first_name,last_name,email").eq("id", payload.new.user_id).maybeSingle();
        setMessages((current) => current.some((item) => item.id === payload.new.id) ? current : [...current, { ...(payload.new as Message), profiles: sender ?? undefined }]);
        window.setTimeout(scrollToBottom, 30);
      })
      .subscribe();
    return () => { void supabase.removeChannel(subscription); };
  }, [fetchMessages, profile?.id, selectedChannel]);

  const createChannel = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id || !newChannelName.trim()) return;
    const type = canManagePublicChannels ? newChannelType : "privado";
    if (type === "privado" && newChannelMembers.length === 0) {
      setError("Selecciona al menos un colaborador para el chat privado.");
      return;
    }
    setCreatingChannel(true); setError("");
    const members = type === "privado" ? Array.from(new Set([profile.id, ...newChannelMembers])) : [];
    const { error: createError } = await supabase.from("channels").insert({
      name: newChannelName.trim(), type, members, created_by: profile.id,
    });
    setCreatingChannel(false);
    if (createError) { setError(createError.message); return; }
    setNewChannelName(""); setNewChannelType("privado"); setNewChannelMembers([]); setCreateOpen(false);
    await fetchChannels();
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id || !selectedChannel || isAuditMode || sending) return;
    const content = inputMessage.trim();
    const externalGif = gifUrl.trim();
    if (!content && pendingFiles.length === 0 && !externalGif) return;
    if (externalGif && !/^https:\/\//i.test(externalGif)) {
      setError("El GIF debe usar una URL segura que comience con https://");
      return;
    }
    setSending(true); setError("");
    const uploaded: FileAttachment[] = [];
    try {
      for (const file of pendingFiles) uploaded.push(await uploadAttachment(file, profile.id, `chat/${selectedChannel.id}`));
      if (externalGif) uploaded.push({ name: "GIF", path: `external-${crypto.randomUUID()}`, url: externalGif, type: "image/gif" });
      const tempId = crypto.randomUUID();
      const optimistic: Message = {
        id: tempId, channel_id: selectedChannel.id, user_id: profile.id,
        content: content || (externalGif ? "GIF" : "Archivo adjunto"), attachments: uploaded,
        created_at: new Date().toISOString(), profiles: profile,
      };
      setMessages((current) => [...current, optimistic]);
      setInputMessage(""); setPendingFiles([]); setGifUrl(""); setShowGifInput(false); setShowEmojiPicker(false);
      window.setTimeout(scrollToBottom, 30);
      const { data, error: sendError } = await supabase.from("messages").insert({
        channel_id: selectedChannel.id, user_id: profile.id,
        content: optimistic.content, attachments: uploaded,
      }).select().single();
      if (sendError) throw sendError;
      setMessages((current) => current.map((message) => message.id === tempId ? { ...message, id: data.id } : message));
    } catch (sendError) {
      await Promise.allSettled(uploaded.filter((item) => !item.url).map(removeAttachment));
      setError(sendError instanceof Error ? sendError.message : "No se pudo enviar el mensaje.");
      await fetchMessages(selectedChannel.id);
    } finally {
      setSending(false);
    }
  };

  const deleteChannel = async () => {
    if (!confirmChannel) return;
    const { error: deleteError } = await supabase.from("channels").delete().eq("id", confirmChannel.id);
    if (deleteError) setError(deleteError.message);
    else {
      setSelectedChannel(null);
      await fetchChannels();
    }
    setConfirmChannel(null);
  };

  const canDeleteChannel = (channel: Channel) => canManagePublicChannels || channel.created_by === profile?.id;

  return (
    <section className="app-page gap-3" aria-labelledby="chat-title">
      <header className="app-page-header">
        <div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><MessageSquare className="h-4 w-4" /> Colaboración interna</p><h1 id="chat-title" className="font-title text-2xl font-bold text-foreground sm:text-3xl">Chat interno</h1><p className="mt-1 text-sm text-muted-foreground">Canales por área, grupos privados y archivos en un solo espacio.</p></div>
        {!isAuditMode && <button type="button" onClick={() => setCreateOpen(true)} className="gold-button-primary inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold"><Plus className="h-4 w-4" /> Nuevo chat</button>}
      </header>
      {error && <div role="alert" className="flex justify-between gap-3 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"><span>{error}</span><button type="button" onClick={() => setError("")} className="font-semibold underline">Cerrar</button></div>}

      <div className="app-panel relative flex min-h-[600px] flex-1 overflow-hidden lg:h-[calc(100dvh-250px)]">
        {mobileChannelsOpen && <button type="button" aria-label="Cerrar canales" onClick={() => setMobileChannelsOpen(false)} className="absolute inset-0 z-20 bg-black/45 lg:hidden" />}
        <aside className={`absolute inset-y-0 left-0 z-30 flex w-[min(19rem,86vw)] flex-col border-r border-border bg-card transition-transform lg:static lg:w-72 lg:translate-x-0 ${mobileChannelsOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex min-h-16 items-center justify-between border-b border-border px-4">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Conversaciones</p><p className="text-[11px] text-muted-foreground">{channels.length} disponibles</p></div>
            <button type="button" onClick={() => setMobileChannelsOpen(false)} className="app-icon-button lg:hidden" aria-label="Cerrar lista"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {channels.map((channel) => (
              <div key={channel.id} className="group relative">
                <button type="button" onClick={() => { setSelectedChannel(channel); setMobileChannelsOpen(false); }} className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-3 pr-11 text-left transition-colors ${selectedChannel?.id === channel.id ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                  {channel.type === "privado" ? <Lock className="h-4 w-4 shrink-0" /> : <Hash className="h-4 w-4 shrink-0" />}
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{channel.name}</span><span className="block text-[10px] uppercase tracking-wide opacity-70">{channel.type === "privado" ? "Privado" : channel.type}</span></span>
                </button>
                {canDeleteChannel(channel) && <button type="button" onClick={() => setConfirmChannel(channel)} className="app-icon-button absolute right-1.5 top-1.5 h-9 w-9 opacity-100 hover:bg-destructive/10 hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100" aria-label={`Eliminar ${channel.name}`}><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
            ))}
            {channels.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">No hay conversaciones disponibles.</p>}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-16 items-center gap-3 border-b border-border px-3 sm:px-4">
            <button type="button" onClick={() => setMobileChannelsOpen(true)} className="app-icon-button lg:hidden" aria-label="Abrir canales"><Menu className="h-4 w-4" /></button>
            {selectedChannel ? <><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{selectedChannel.type === "privado" ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}</span><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-foreground">{selectedChannel.name}</h2><p className="text-xs text-muted-foreground">{selectedChannel.type === "privado" ? `${selectedChannel.members?.length ?? 0} participantes` : "Canal interno"}</p></div></> : <p className="text-sm text-muted-foreground">Selecciona una conversación</p>}
          </div>

          {selectedChannel ? (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-5">
                {messages.map((message) => {
                  const own = message.user_id === profile?.id;
                  return (
                    <article key={message.id} className={`flex max-w-[92%] items-start gap-2.5 sm:max-w-[78%] ${own ? "ml-auto flex-row-reverse" : ""}`}>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/12 text-primary"><UserRound className="h-4 w-4" /></span>
                      <div className={`min-w-0 ${own ? "text-right" : ""}`}>
                        <p className="mb-1 text-[10px] text-muted-foreground"><span className="font-semibold">{fullName(message.profiles)}</span> · {new Date(message.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
                        <div className={`rounded-xl px-3 py-2 text-left text-sm leading-relaxed ${own ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm border border-border bg-card text-foreground"}`}>
                          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                          {message.attachments && message.attachments.length > 0 && <div className={`grid gap-2 ${message.content ? "mt-2" : ""}`}>{message.attachments.map((attachment) => <AttachmentPreview key={`${attachment.path}-${attachment.url ?? ""}`} attachment={attachment} />)}</div>}
                        </div>
                      </div>
                    </article>
                  );
                })}
                {messages.length === 0 && <div className="grid h-full min-h-64 place-items-center text-center"><div><MessageSquare className="mx-auto mb-3 h-9 w-9 text-primary/45" /><p className="font-semibold text-foreground">Inicia la conversación</p><p className="text-sm text-muted-foreground">Comparte una actualización o adjunta un archivo.</p></div></div>}
                <div ref={messagesEndRef} />
              </div>

              {!isAuditMode && <form onSubmit={sendMessage} className="border-t border-border bg-card p-3 sm:p-4">
                {pendingFiles.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{pendingFiles.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-muted px-2.5 text-xs"><Paperclip className="h-3.5 w-3.5 text-primary" /><span className="max-w-40 truncate">{file.name}</span><button type="button" onClick={() => setPendingFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Quitar ${file.name}`}><X className="h-3.5 w-3.5" /></button></span>)}</div>}
                {showGifInput && <div className="mb-2 flex gap-2"><input value={gifUrl} onChange={(event) => setGifUrl(event.target.value)} placeholder="Pega una URL https:// de GIF" className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /><button type="button" onClick={() => { setShowGifInput(false); setGifUrl(""); }} className="app-icon-button" aria-label="Quitar GIF"><X className="h-4 w-4" /></button></div>}
                {showEmojiPicker && <div className="mb-2 flex flex-wrap gap-1 rounded-lg border border-border bg-background p-2">{EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => setInputMessage((current) => `${current}${emoji}`)} className="grid h-10 w-10 place-items-center rounded-lg text-lg hover:bg-accent" aria-label={`Agregar ${emoji}`}>{emoji}</button>)}</div>}
                <div className="flex items-end gap-2">
                  <div className="flex gap-1">
                    <label className="app-icon-button cursor-pointer" aria-label="Adjuntar archivos"><Paperclip className="h-4 w-4" /><input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" className="sr-only" onChange={(event) => setPendingFiles((current) => [...current, ...Array.from(event.target.files ?? [])])} /></label>
                    <button type="button" onClick={() => setShowEmojiPicker((value) => !value)} className="app-icon-button" aria-label="Agregar emoji"><Smile className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setShowGifInput((value) => !value)} className="app-icon-button" aria-label="Agregar GIF"><ImageIcon className="h-4 w-4" /></button>
                  </div>
                  <textarea rows={1} value={inputMessage} onChange={(event) => setInputMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={`Mensaje en ${selectedChannel.name}`} className="min-h-11 max-h-32 min-w-0 flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <button type="submit" disabled={sending || (!inputMessage.trim() && pendingFiles.length === 0 && !gifUrl.trim())} className="gold-button-primary grid h-11 w-11 shrink-0 place-items-center rounded-lg disabled:opacity-45" aria-label="Enviar mensaje"><Send className="h-4 w-4" /></button>
                </div>
              </form>}
            </>
          ) : <div className="grid flex-1 place-items-center p-8 text-center"><div><Hash className="mx-auto mb-3 h-10 w-10 text-primary/40" /><p className="font-semibold text-foreground">Selecciona una conversación</p><p className="text-sm text-muted-foreground">Abre un canal o crea un chat privado.</p></div></div>}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Nuevo chat</DialogTitle><DialogDescription>{canManagePublicChannels ? "Crea un canal general o una conversación privada." : "Crea una conversación privada con uno o varios colaboradores."}</DialogDescription></DialogHeader>
          <form id="create-channel-form" onSubmit={createChannel} className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">Nombre<input value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
            {canManagePublicChannels && <label className="grid gap-1.5 text-sm font-medium">Tipo<select value={newChannelType} onChange={(event) => setNewChannelType(event.target.value as ChannelType)} className="h-11 rounded-lg border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="privado">Privado</option><option value="general">General</option><option value="ventas">Ventas</option><option value="soporte">Supervisión</option><option value="alertas">Líderes</option></select></label>}
            {(!canManagePublicChannels || newChannelType === "privado") && <fieldset className="grid gap-2"><legend className="text-sm font-medium">Participantes</legend><div className="grid max-h-60 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">{allUsers.filter((user) => user.id !== profile?.id).map((user) => <label key={user.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 hover:bg-accent"><input type="checkbox" checked={newChannelMembers.includes(user.id)} onChange={(event) => setNewChannelMembers((current) => event.target.checked ? [...current, user.id] : current.filter((id) => id !== user.id))} className="h-4 w-4 accent-primary" /><span className="min-w-0 text-sm"><span className="block truncate font-medium">{fullName(user)}</span><span className="block truncate text-[10px] text-muted-foreground">{user.department}</span></span></label>)}</div></fieldset>}
          </form>
          <DialogFooter><button type="button" onClick={() => setCreateOpen(false)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-accent">Cancelar</button><button form="create-channel-form" type="submit" disabled={creatingChannel} className="gold-button-primary min-h-11 rounded-lg px-4 text-sm font-bold disabled:opacity-50">{creatingChannel ? "Creando…" : "Crear chat"}</button></DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmModal isOpen={Boolean(confirmChannel)} title="Eliminar conversación" message={`¿Deseas eliminar “${confirmChannel?.name ?? "esta conversación"}” y todos sus mensajes?`} onConfirm={() => void deleteChannel()} onCancel={() => setConfirmChannel(null)} />
    </section>
  );
};
