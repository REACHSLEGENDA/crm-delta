import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Hash, Lock, MessageSquare, Minus, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import type { Channel, Message, Profile } from "@/types";

const SEEN_KEY = "delta-capital-chat-seen";
const AVATAR_COLORS = ["#d4af37", "#00c9ff", "#22c55e", "#a78bfa", "#f59e0b", "#ef4444", "#38bdf8", "#f97316"];

const colorFor = (key: string) => {
  let hash = 0;
  for (let index = 0; index < key.length; index++) hash = (hash * 31 + key.charCodeAt(index)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const fullName = (profile?: Pick<Profile, "first_name" | "last_name" | "email">) =>
  profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email : "Usuario";

const initialsOf = (profile?: Pick<Profile, "first_name" | "last_name" | "email">) => {
  if (!profile) return "?";
  const value = `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase();
  return value || (profile.email?.[0] ?? "?").toUpperCase();
};

const clockOf = (value: string) =>
  new Date(value).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

const readSeen = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
};

/**
 * Floating chat available on every screen, so a conversation never requires
 * leaving the record being worked on. It shares the same channels and messages
 * as the full Chat page -- this is a second window onto the same data, not a
 * separate inbox.
 */
export const ChatDock = () => {
  const { profile } = useAuth();
  const { auditBlocked } = usePermissions();
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [active, setActive] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const endRef = useRef<HTMLDivElement | null>(null);

  const loadChannels = useCallback(async () => {
    const { data } = await supabase.from("channels").select("*").order("name");
    setChannels((data ?? []) as Channel[]);
  }, []);

  useEffect(() => {
    if (profile) void loadChannels();
  }, [loadChannels, profile]);

  // Unread counts: messages newer than the last time each channel was opened.
  const refreshUnread = useCallback(async () => {
    if (!profile?.id || channels.length === 0) return;
    const seen = readSeen();
    const counts: Record<string, number> = {};
    await Promise.all(
      channels.map(async (channel) => {
        const since = seen[channel.id];
        let query = supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("channel_id", channel.id)
          .neq("user_id", profile.id);
        if (since) query = query.gt("created_at", since);
        const { count } = await query;
        if (count && count > 0) counts[channel.id] = count;
      }),
    );
    setUnread(counts);
  }, [channels, profile?.id]);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  // Any incoming message refreshes the badges, wherever the user is.
  useEffect(() => {
    if (!profile?.id) return;
    const subscription = supabase
      .channel(`dock_${profile.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const incoming = payload.new as Message;
        if (incoming.user_id === profile.id) return;
        if (active && incoming.channel_id === active.id) return;
        void refreshUnread();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [active, profile?.id, refreshUnread]);

  const openChannel = useCallback(async (channel: Channel) => {
    setActive(channel);
    const { data } = await supabase
      .from("messages")
      .select("*, profiles(first_name, last_name, email)")
      .eq("channel_id", channel.id)
      .order("created_at", { ascending: true })
      .limit(80);
    setMessages((data ?? []) as Message[]);

    const seen = readSeen();
    seen[channel.id] = new Date().toISOString();
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    } catch {
      // Storage may be unavailable; badges simply stay as they are.
    }
    setUnread((current) => {
      const next = { ...current };
      delete next[channel.id];
      return next;
    });
    window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: "auto" }), 40);
  }, []);

  // Live messages for the conversation on screen.
  useEffect(() => {
    if (!active) return;
    const subscription = supabase
      .channel(`dock_messages_${active.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${active.id}` },
        async (payload) => {
          if (payload.new.user_id === profile?.id) return;
          const { data: sender } = await supabase
            .from("profiles")
            .select("first_name,last_name,email")
            .eq("id", payload.new.user_id)
            .maybeSingle();
          setMessages((current) =>
            current.some((item) => item.id === payload.new.id)
              ? current
              : [...current, { ...(payload.new as Message), profiles: sender ?? undefined }],
          );
          // The app-wide listener in NotificationCenter already plays the tone for
          // every channel, so sounding it here too would double it.
          window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [active, profile?.id]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !active || !profile?.id || sending || auditBlocked) return;
    setSending(true);
    const optimistic: Message = {
      id: crypto.randomUUID(),
      channel_id: active.id,
      user_id: profile.id,
      content,
      attachments: [],
      created_at: new Date().toISOString(),
      profiles: profile,
    };
    setMessages((current) => [...current, optimistic]);
    setDraft("");
    window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 30);

    const { error } = await supabase
      .from("messages")
      .insert({ channel_id: active.id, user_id: profile.id, content, attachments: [] });
    setSending(false);
    if (error) setMessages((current) => current.filter((item) => item.id !== optimistic.id));
  };

  if (!profile) return null;

  const totalUnread = Object.values(unread).reduce((sum, value) => sum + value, 0);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="gold-button-primary fixed bottom-5 right-5 z-[9990] grid h-14 w-14 place-items-center rounded-full shadow-2xl transition-transform hover:scale-105"
          aria-label="Abrir chat"
        >
          <MessageSquare className="h-6 w-6" />
          {totalUnread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      )}

      {open && (
        <section
          className="fixed bottom-5 right-5 z-[9990] flex h-[min(34rem,80vh)] w-[min(23rem,92vw)] flex-col overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
          aria-label="Chat rápido"
        >
          <header className="flex min-h-14 items-center gap-2 border-b border-border bg-card px-3">
            {active ? (
              <>
                <button type="button" onClick={() => setActive(null)} className="app-icon-button h-8 w-8" aria-label="Volver">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">{active.name}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {active.members?.length ?? 0} participantes
                  </span>
                </span>
              </>
            ) : (
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="truncate text-sm font-bold text-foreground">Conversaciones</span>
              </span>
            )}
            <button type="button" onClick={() => setOpen(false)} className="app-icon-button h-8 w-8" aria-label="Minimizar">
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setActive(null); }}
              className="app-icon-button h-8 w-8"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {!active ? (
            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => void openChannel(channel)}
                  className="flex min-h-13 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                    style={{
                      background: `color-mix(in srgb, ${colorFor(channel.id)} 18%, transparent)`,
                      color: colorFor(channel.id),
                    }}
                  >
                    {channel.type === "privado" ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{channel.name}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {channel.members?.length ?? 0} participantes
                    </span>
                  </span>
                  {unread[channel.id] > 0 && (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                      {unread[channel.id]}
                    </span>
                  )}
                </button>
              ))}
              {channels.length === 0 && (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">No tienes conversaciones.</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3">
                {messages.map((message, index) => {
                  const own = message.user_id === profile.id;
                  const previous = index > 0 ? messages[index - 1] : undefined;
                  const grouped = previous?.user_id === message.user_id;
                  const accent = colorFor(message.user_id ?? "x");
                  return (
                    <div
                      key={message.id}
                      className={`flex max-w-[88%] items-end gap-1.5 ${grouped ? "mt-0.5" : "mt-2.5"} ${own ? "ml-auto flex-row-reverse" : ""}`}
                    >
                      {grouped ? (
                        <span className="w-6 shrink-0" />
                      ) : (
                        <span
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-bold"
                          style={{ background: `color-mix(in srgb, ${accent} 20%, transparent)`, color: accent }}
                          title={fullName(message.profiles)}
                        >
                          {initialsOf(message.profiles)}
                        </span>
                      )}
                      <span className="flex min-w-0 flex-col">
                        {!grouped && !own && (
                          <span className="mb-0.5 px-1 text-[10px] font-bold" style={{ color: accent }}>
                            {fullName(message.profiles)}
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-1.5 text-[13px] leading-snug ${
                            own
                              ? "rounded-2xl rounded-br-sm bg-primary text-primary-foreground"
                              : "rounded-2xl rounded-bl-sm border border-border bg-card text-foreground"
                          }`}
                        >
                          <span className="whitespace-pre-wrap break-words">{message.content}</span>
                        </span>
                        <span className={`mt-0.5 px-1 text-[9px] tabular-nums text-muted-foreground ${own ? "text-right" : ""}`}>
                          {clockOf(message.created_at)}
                        </span>
                      </span>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <p className="py-10 text-center text-xs text-muted-foreground">Sin mensajes todavía.</p>
                )}
                <div ref={endRef} />
              </div>

              {!auditBlocked && (
                <form onSubmit={send} className="flex items-end gap-2 border-t border-border bg-card p-2">
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder={`Mensaje en ${active.name}`}
                    className="max-h-24 min-h-10 min-w-0 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="gold-button-primary grid h-10 w-10 shrink-0 place-items-center rounded-xl disabled:opacity-45"
                    aria-label="Enviar"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
};
