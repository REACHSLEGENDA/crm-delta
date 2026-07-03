import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import type { Call } from "@/types";
import { PhoneCall, PhoneOff, Save, Clock, History, ListCollapse, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export const ContactCenter = () => {
  const { profile } = useAuth();
  const { isAgent, canDelete } = usePermissions();
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCall, setActiveCall] = useState<any | null>(null);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "active" | "wrap_up">("idle");
  const [duration, setDuration] = useState(0);
  const [disposition, setDisposition] = useState<string>("Interesado");
  const [notes, setNotes] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [callHistory, setCallHistory] = useState<Call[]>([]);

  // ✅ CORREGIDO: la cola ahora se filtra por agent_id para agentes
  const fetchQueue = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("leads")
        .select("id, first_name, last_name, phone, email, status, agent_id")
        .in("status", ["Nuevo", "Contactado"])
        .order("updated_at", { ascending: false });

      // ✅ CLAVE: Agentes solo ven SU base, no la de todos
      if (isAgent && profile?.id) {
        query = query.eq("agent_id", profile.id);
      }

      const { data: leadData } = await query;
      if (leadData) setQueue(leadData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Modal state
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; targetId: string; targetName: string}>({
    isOpen: false, targetId: "", targetName: ""
  });
  
  const [confirmClearModal, setConfirmClearModal] = useState(false);

  // ✅ NUEVO: Eliminar prospecto de la cola
  const confirmDeleteFromQueue = async () => {
    try {
      const { error } = await supabase.from("leads").delete().eq("id", confirmModal.targetId);
      if (!error) {
        setQueue(prev => prev.filter(item => item.id !== confirmModal.targetId));
      } else {
        console.error("Error eliminando prospecto:", error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFromQueue = (leadId: string, name: string) => {
    setConfirmModal({ isOpen: true, targetId: leadId, targetName: name });
  };

  const confirmClearQueue = async () => {
    if (queue.length === 0) return;
    try {
      const idsToDelete = queue.map(item => item.id);
      const { error } = await supabase.from("leads").delete().in("id", idsToDelete);
      if (!error) {
        setQueue([]);
      } else {
        console.error("Error vaciando la cola:", error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      if (profile?.id) {
        const { data } = await supabase
          .from("calls")
          .select("*")
          .eq("agent_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(10);
        if (data) setCallHistory(data as Call[]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchQueue();
      fetchHistory();
    }
  }, [profile, isAgent]);

  useEffect(() => {
    if (callStatus === "active") {
      timerRef.current = setInterval(() => { setDuration(prev => prev + 1); }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callStatus]);

  const handleInitiateCall = (target: any) => {
    setActiveCall(target);
    setCallStatus("calling");
    setDuration(0);
    setTimeout(() => { setCallStatus("active"); }, 2000);
  };

  const handleHangup = () => { setCallStatus("wrap_up"); };

  const handleSaveCallDisposition = async () => {
    if (!activeCall || !profile) return;
    try {
      const callData = {
        lead_id: activeCall.id,
        agent_id: profile.id,
        duration_seconds: duration,
        disposition: disposition as any,
        notes: notes,
      };

      const { data, error } = await supabase.from("calls").insert(callData).select().single();

      if (!error && data) {
        await supabase.from("activities").insert({
          lead_id: activeCall.id,
          user_id: profile.id,
          description: `Llamada completada (${duration}s). Disposición: ${disposition}. Notas: ${notes}`,
          type: "call",
        });

        if (disposition === "Depósito confirmado") {
          await supabase.from("leads").update({ status: "Depósito pendiente" }).eq("id", activeCall.id);
        } else if (disposition === "Interesado") {
          await supabase.from("leads").update({ status: "Interesado" }).eq("id", activeCall.id);
        }

        fetchQueue();
        fetchHistory();
        setActiveCall(null);
        setCallStatus("idle");
        setNotes("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-[#050814] min-h-screen text-[#F8FAFC]">
      {/* Header */}
      <div className="border-b border-[rgba(212,175,55,0.15)] pb-4">
        <h1 className="text-2xl font-title font-bold text-[#F8FAFC]">Contact Center</h1>
        <p className="text-xs text-[#94A3B8] mt-1 font-sans">Cola de marcación institucional y registro de disposiciones de llamadas</p>
        {/* ✅ NUEVO: badge indicando que agentes solo ven su base */}
        {isAgent && (
          <span className="inline-block mt-2 text-[9px] bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)] text-[#D4AF37] px-2 py-0.5 rounded font-semibold tracking-wider">
            📋 MOSTRANDO SOLO TU BASE
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Call Queue */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[rgba(212,175,55,0.1)]">
            <ListCollapse className="h-5 w-5 text-[#D4AF37]" />
            <h3 className="text-sm font-title font-bold text-[#D4AF37] uppercase tracking-wider">Cola de Llamadas</h3>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-[#64748B] font-mono">{queue.length}</span>
              {canDelete && queue.length > 0 && (
                <button
                  onClick={() => setConfirmClearModal(true)}
                  className="p-1 rounded text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
                  title="Vaciar Cola"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-[#D4AF37] text-xs">Cargando cola...</div>
          ) : queue.length === 0 ? (
            <div className="text-center py-10 text-[#64748B] text-xs">No hay llamadas pendientes en tu base.</div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {queue.map(item => (
                <div
                  key={item.id}
                  className="p-3 bg-[#0D1428] border border-[rgba(212,175,55,0.1)] rounded flex items-center justify-between hover:border-[#D4AF37] transition-all"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#F8FAFC]">{item.first_name} {item.last_name}</p>
                    <p className="text-[10px] text-[#94A3B8] font-mono">{item.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    {/* Botón Eliminar - Solo visible si tiene permisos (canDelete) */}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteFromQueue(item.id, `${item.first_name} ${item.last_name}`)}
                        className="p-1.5 rounded-full bg-[rgba(239,68,68,0.1)] text-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-colors"
                        title="Eliminar de BD"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleInitiateCall(item)}
                      className="p-1.5 rounded-full bg-[rgba(212,175,55,0.1)] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
                      title="Iniciar Llamada"
                    >
                      <PhoneCall className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center: Active Call */}
        <div className="glass-card p-6 flex flex-col justify-between min-h-[450px]">
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-[rgba(212,175,55,0.1)]">
              <PhoneCall className="h-5 w-5 text-[#D4AF37]" />
              <h3 className="text-sm font-title font-bold text-[#D4AF37] uppercase tracking-wider">Llamada Activa</h3>
            </div>

            {activeCall ? (
              <div className="space-y-6 text-center py-4">
                <div className="space-y-2">
                  <h4 className="text-lg font-title font-bold text-[#F8FAFC]">{activeCall.first_name} {activeCall.last_name}</h4>
                  <p className="text-sm text-[#D4AF37] font-mono">{activeCall.phone}</p>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                    callStatus === "calling" ? "bg-amber-950/20 text-amber-400 border border-amber-500/30 animate-pulse" :
                    callStatus === "active" ? "bg-green-950/20 text-green-400 border border-green-500/30" :
                    "bg-[#17213D] text-[#E6C766]"
                  }`}>
                    {callStatus === "calling" ? "Conectando..." : callStatus === "active" ? "En Línea" : "Tipificación"}
                  </span>

                  {callStatus === "active" && (
                    <div className="text-2xl font-mono-numbers text-[#D4AF37] font-bold flex items-center gap-2 mt-2">
                      <Clock className="h-5 w-5 text-[#D4AF37]" />
                      <span>{Math.floor(duration / 60).toString().padStart(2, "0")}:{(duration % 60).toString().padStart(2, "0")}</span>
                    </div>
                  )}
                </div>

                {(callStatus === "calling" || callStatus === "active") && (
                  <button onClick={handleHangup} className="mx-auto flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs uppercase transition-all">
                    <PhoneOff className="h-4 w-4" /> Colgar
                  </button>
                )}

                {callStatus === "wrap_up" && (
                  <div className="space-y-4 text-left pt-4 border-t border-[rgba(212,175,55,0.12)]">
                    <div>
                      <label className="block text-xs text-[#94A3B8] mb-1">Disposición</label>
                      <select value={disposition} onChange={(e) => setDisposition(e.target.value)}
                        className="px-3 py-1.5 w-full text-xs bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] text-[#94A3B8]"
                      >
                        <option value="Interesado">Interesado</option>
                        <option value="No interesado">No interesado</option>
                        <option value="Buzón">Buzón</option>
                        <option value="Callback">Callback</option>
                        <option value="Depósito confirmado">Depósito confirmado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#94A3B8] mb-1">Notas Comerciales</label>
                      <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                        placeholder="Escribe comentarios de la llamada..."
                        className="px-3 py-1.5 w-full text-xs bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] text-[#F8FAFC]"
                      />
                    </div>
                    <button onClick={handleSaveCallDisposition} className="w-full gold-button-primary py-2 text-xs font-semibold rounded flex items-center justify-center gap-1.5">
                      <Save className="h-4 w-4" /> Guardar Disposición
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-[#64748B] text-xs">
                Selecciona un prospecto de la cola para iniciar la llamada institucional.
              </div>
            )}
          </div>
        </div>

        {/* Right: Historical logs */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[rgba(212,175,55,0.1)]">
            <History className="h-5 w-5 text-[#D4AF37]" />
            <h3 className="text-sm font-title font-bold text-[#D4AF37] uppercase tracking-wider">Llamadas Recientes</h3>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {callHistory.map(call => (
              <div key={call.id} className="p-3 bg-[#050814] border border-[rgba(212,175,55,0.08)] rounded text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    call.disposition === "Depósito confirmado" ? "bg-green-950/20 text-green-400" :
                    call.disposition === "Interesado" ? "bg-[rgba(212,175,55,0.05)] text-[#D4AF37]" :
                    "bg-[#17213D] text-[#94A3B8]"
                  }`}>
                    {call.disposition}
                  </span>
                  <span className="font-mono text-[#64748B]">{call.duration_seconds}s</span>
                </div>
                {call.notes && <p className="text-[#94A3B8] italic">"{call.notes}"</p>}
                <span className="text-[9px] text-[#64748B] block">{new Date(call.created_at).toLocaleString()}</span>
              </div>
            ))}
            {callHistory.length === 0 && (
              <p className="text-center text-xs text-[#64748B] py-10">No has registrado llamadas hoy.</p>
            )}
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="¿Eliminar permanentemente?"
        message={`¿Estás seguro de que deseas eliminar permanentemente a "${confirmModal.targetName}"? Esta acción no se puede deshacer y borrará todo su historial.`}
        onConfirm={confirmDeleteFromQueue}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
      <ConfirmModal
        isOpen={confirmClearModal}
        title="Vaciar Cola de Llamadas"
        message={`¿Estás seguro de que deseas eliminar permanentemente todos los registros (${queue.length}) de la cola? Esta acción es irreversible.`}
        onConfirm={confirmClearQueue}
        onCancel={() => setConfirmClearModal(false)}
      />
    </div>
  );
};
