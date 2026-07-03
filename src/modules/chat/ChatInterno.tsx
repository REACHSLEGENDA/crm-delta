import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import type { Channel, Message } from "@/types";
import { MessageSquare, Send, Hash, User, Lock, Plus, X, ChevronDown } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

// ✅ Departamentos predefinidos con control de acceso
const DEPT_CHANNELS = [
  { name: "Ventas",      type: "ventas",   roles: ["AGENT","MANAGER","SUPERADMIN"] },
  { name: "Compliance",  type: "alertas",  roles: ["MANAGER","SUPERADMIN"] },
  { name: "Retention",   type: "general",  roles: ["MANAGER","SUPERADMIN"] },
  { name: "Líderes",     type: "alertas",  roles: ["MANAGER","SUPERADMIN"] },
];

export const ChatInterno = () => {
  const { profile } = useAuth();
  const { isSuperAdmin, isManager } = usePermissions();
  const canManageChannels = isSuperAdmin || isManager;

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  // ✅ NUEVO: Estado para crear canal
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"general"|"ventas"|"alertas"|"soporte">("general");
  const [creatingChannel, setCreatingChannel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  // ✅ NUEVO: Asegura que los 4 canales existan en la BD
  const ensureDefaultChannels = async () => {
    for (const dept of DEPT_CHANNELS) {
      const { data: existing } = await supabase
        .from("channels")
        .select("id")
        .eq("name", dept.name)
        .single();

      if (!existing) {
        await supabase.from("channels").insert({ name: dept.name, type: dept.type });
      }
    }
  };

  // ✅ Fetch de canales con control de acceso según rol
  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("name", { ascending: true });

      if (!error && data) {
        // Filtrar canales según acceso del usuario
        const accessibleChannels = data.filter((ch: Channel) => {
          const deptConfig = DEPT_CHANNELS.find(d => d.name === ch.name);
          const role = profile?.role || "";
          
          if (deptConfig) {
            return deptConfig.roles.includes(role);
          }
          
          // Canales creados manualmente: el `type` define quién puede entrar
          if (isSuperAdmin) return true; // Superadmin ve todo
          
          if (ch.type === "general") return true; // Todos los roles
          if (ch.type === "ventas") return role === "AGENT" || isManager;
          if (ch.type === "soporte") return role === "SUPERVISOR" || isManager;
          if (ch.type === "alertas") return isManager; // Solo managers
          
          return false;
        });

        setChannels(accessibleChannels as Channel[]);
        if (accessibleChannels.length > 0) {
          setSelectedChannel(accessibleChannels[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (profile) {
      ensureDefaultChannels().then(fetchChannels);
    }
  }, [profile]);

  // ✅ NUEVO: Crear canal personalizado
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setCreatingChannel(true);
    try {
      const { error } = await supabase
        .from("channels")
        .insert({ name: newChannelName.trim(), type: newChannelType });
      if (!error) {
        setNewChannelName("");
        setNewChannelType("general");
        setShowCreateChannel(false);
        await fetchChannels();
      } else {
        alert("Error al crear canal: " + (error.message || "nombre duplicado"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingChannel(false);
    }
  };

  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; targetId: string; targetName: string}>({
    isOpen: false, targetId: "", targetName: ""
  });

  const confirmDeleteChannel = async () => {
    const { error } = await supabase.from("channels").delete().eq("id", confirmModal.targetId);
    if (!error) {
      if (selectedChannel?.id === confirmModal.targetId) setSelectedChannel(null);
      setChannels(prev => prev.filter(c => c.id !== confirmModal.targetId));
    }
  };

  // ✅ NUEVO: Eliminar canal
  const handleDeleteChannel = (channelId: string, channelName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({ isOpen: true, targetId: channelId, targetName: channelName });
  };

  const fetchMessages = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles(first_name, last_name, email)")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data as Message[]);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);

      const subscription = supabase
        .channel(`messages_channel_${selectedChannel.id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${selectedChannel.id}`,
        }, async (payload) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("first_name, last_name, email")
            .eq("id", payload.new.user_id)
            .single();

          const newMessageWithProfile: Message = {
            ...(payload.new as Message),
            profiles: profileData || undefined,
          };
          setMessages((prev) => [...prev, newMessageWithProfile]);
          setTimeout(scrollToBottom, 100);
        })
        .subscribe();

      return () => { supabase.removeChannel(subscription); };
    }
  }, [selectedChannel]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedChannel || !profile) return;
    try {
      const { error } = await supabase.from("messages").insert({
        channel_id: selectedChannel.id,
        user_id: profile.id,
        content: inputMessage,
      });
      if (!error) setInputMessage("");
    } catch (err) { console.error(err); }
  };

  // ✅ Etiquetar canal con icono de acceso
  const getChannelAccess = (chName: string) => {
    const dept = DEPT_CHANNELS.find(d => d.name === chName);
    if (!dept) return null;
    const isRestricted = !dept.roles.includes("AGENT");
    return isRestricted;
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-[#050814] text-[#F8FAFC]">
      {/* Channels Sidebar */}
      <div className="w-64 bg-[#0D1428] border-r border-[rgba(212,175,55,0.15)] flex flex-col">
        <div className="p-4 border-b border-[rgba(212,175,55,0.12)] bg-[#111A33] flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#D4AF37]" />
          <h3 className="text-xs font-title font-bold text-[#D4AF37] uppercase tracking-wider flex-1">Canales</h3>
          {/* ✅ Botón crear canal (solo managers/superadmins) */}
          {canManageChannels && (
            <button
              onClick={() => setShowCreateChannel(v => !v)}
              title="Crear canal"
              className="p-1 rounded text-[#64748B] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-all"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ✅ NUEVO: Formulario inline para crear canal */}
        {showCreateChannel && canManageChannels && (
          <form onSubmit={handleCreateChannel} className="p-3 border-b border-[rgba(212,175,55,0.12)] bg-[rgba(212,175,55,0.04)] space-y-2">
            <input
              type="text"
              required
              placeholder="Nombre del canal..."
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#050814] border border-[rgba(212,175,55,0.2)] rounded text-white focus:outline-none focus:border-[#D4AF37]"
            />
            <select
              value={newChannelType}
              onChange={(e) => setNewChannelType(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#050814] border border-[rgba(212,175,55,0.2)] rounded text-[#94A3B8] focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="general">Acceso: Todos los Roles</option>
              <option value="ventas">Acceso: Solo Agentes</option>
              <option value="soporte">Acceso: Solo Supervisores</option>
              <option value="alertas">Acceso: Solo Líderes (Admin/Managers)</option>
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creatingChannel}
                className="flex-1 gold-button-primary py-1.5 text-[10px] font-bold rounded disabled:opacity-50"
              >
                {creatingChannel ? "..." : "Crear"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateChannel(false); setNewChannelName(""); }}
                className="px-2 py-1.5 text-[10px] text-[#64748B] hover:text-white rounded hover:bg-[rgba(255,255,255,0.05)]"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </form>
        )}

        {/* ✅ NUEVO: Secciones por departamento con opción de eliminar */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-[9px] text-[#334155] font-bold uppercase tracking-[0.15em] px-2 py-1.5">Departamentos</p>
          {channels.map((chan) => {
            const isRestricted = getChannelAccess(chan.name);
            const isSelected = selectedChannel?.id === chan.id;
            return (
              <div key={chan.id} className="group relative">
                <button
                  onClick={() => setSelectedChannel(chan)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded font-medium transition-all pr-8 ${
                    isSelected
                      ? "bg-[rgba(212,175,55,0.12)] text-[#D4AF37] border-l-2 border-[#D4AF37]"
                      : "text-[#94A3B8] hover:bg-[rgba(212,175,55,0.05)] hover:text-[#F8FAFC]"
                  }`}
                >
                  {isRestricted ? (
                    <Lock className="h-3 w-3 text-[#D4AF37] shrink-0" />
                  ) : (
                    <Hash className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate flex-1 text-left">{chan.name}</span>
                  {isRestricted && (
                    <span className="text-[8px] bg-[rgba(212,175,55,0.1)] text-[#D4AF37] px-1 rounded font-bold">LÍDER</span>
                  )}
                </button>
                {/* Botón eliminar canal — solo managers, solo al hover */}
                {canManageChannels && (
                  <button
                    onClick={(e) => handleDeleteChannel(chan.id, chan.name, e)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded text-[#334155] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] transition-all"
                    title="Eliminar canal"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          {channels.length === 0 && (
            <p className="text-center text-xs text-[#64748B] pt-4">No tienes canales asignados.</p>
          )}
        </div>
      </div>

      {/* Messages Panel */}
      <div className="flex-1 flex flex-col justify-between bg-[rgba(13,20,40,0.2)]">
        {selectedChannel ? (
          <>
            {/* Active Channel Header */}
            <div className="p-4 border-b border-[rgba(212,175,55,0.12)] bg-[#111A33] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-[#D4AF37]" />
                <h4 className="text-sm font-title font-bold text-[#F8FAFC]">{selectedChannel.name}</h4>
                {getChannelAccess(selectedChannel.name) && (
                  <span className="text-[9px] bg-[rgba(212,175,55,0.1)] text-[#D4AF37] border border-[rgba(212,175,55,0.2)] px-1.5 py-0.5 rounded font-bold tracking-wider">
                    🔒 RESTRINGIDO
                  </span>
                )}
              </div>
              <span className="text-[10px] bg-[rgba(212,175,55,0.05)] border border-[rgba(212,175,55,0.15)] px-2 py-0.5 rounded text-[#D4AF37] uppercase font-bold tracking-wider">
                {selectedChannel.type}
              </span>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => {
                const isOwnMessage = msg.user_id === profile?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 max-w-[70%] ${isOwnMessage ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)]">
                      <User className="h-4 w-4 text-[#D4AF37]" />
                    </div>

                    <div className="space-y-1">
                      <div className={`flex items-center gap-2 text-[10px] text-[#64748B] ${isOwnMessage ? "justify-end" : ""}`}>
                        <span className="font-semibold text-[#94A3B8]">
                          {msg.profiles?.first_name ? `${msg.profiles.first_name} ${msg.profiles.last_name}` : msg.profiles?.email || "Usuario"}
                        </span>
                        <span>•</span>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>

                      <div className={`p-3 rounded text-xs leading-relaxed ${
                        isOwnMessage
                          ? "bg-[#D4AF37] text-[#050814] rounded-tr-none font-medium"
                          : "bg-[#111A33] border border-[rgba(212,175,55,0.15)] text-[#F8FAFC] rounded-tl-none"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[rgba(212,175,55,0.15)] bg-[#0D1428] flex gap-3">
              <input
                type="text"
                placeholder={`Escribe un mensaje en #${selectedChannel.name}...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-2 text-xs bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] text-white"
              />
              <button type="submit" className="gold-button-primary p-2 px-4 rounded text-xs font-semibold flex items-center gap-1.5">
                <Send className="h-4 w-4" /> Enviar
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-[#64748B] space-y-2">
            <Hash className="h-10 w-10 text-[rgba(212,175,55,0.2)]" />
            <p className="text-xs">No hay ningún canal seleccionado.</p>
          </div>
        )}
      </div>
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Eliminar Canal"
        message={`¿Estás seguro de eliminar el canal "${confirmModal.targetName}"? Todos los mensajes enviados serán eliminados permanentemente.`}
        onConfirm={confirmDeleteChannel}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};
