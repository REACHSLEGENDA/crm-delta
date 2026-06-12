// modules/contact-center/ContactCenterPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import Avatar from '@/components/shared/Avatar';
import Badge from '@/components/shared/Badge';
import { 
  Phone, PhoneOff, MicOff, Pause, PhoneForwarded, 
  Settings2, Play, Calendar, User, FileText, ChevronDown 
} from 'lucide-react';
import { useNotificationsStore } from '@/store/notificationsStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

interface QueueItem {
  id: string;
  name: string;
  phone: string;
  wait: string;
  reason: string;
  priority: 'alta' | 'media' | 'baja';
}

export default function ContactCenterPage() {
  const profile = useAuthStore((state) => state.profile);
  const addToast = useNotificationsStore((state) => state.addToast);

  // States
  const [activeQueueTab, setActiveQueueTab] = useState<'pending' | 'active' | 'done' | 'missed'>('pending');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [duration, setDuration] = useState(0);
  const [callNotes, setCallNotes] = useState('');
  const [disposition, setDisposition] = useState('');

  const [queues, setQueues] = useState<{
    pending: QueueItem[];
    active: QueueItem[];
    done: QueueItem[];
    missed: QueueItem[];
  }>({
    pending: [],
    active: [],
    done: [],
    missed: [],
  });

  const [metrics, setMetrics] = useState({
    callsCount: 0,
    avgTime: '00:00',
    contactRate: '0%',
    pendingCallbacks: 0,
  });

  const timerRef = useRef<any | null>(null);

  // Fetch Queue from Database (Leads assigned to active agent)
  const fetchQueue = async () => {
    if (!profile) return;
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('agent_id', profile.id);
    
    if (leads) {
      const pendingItems = leads
        .filter((l: any) => l.status === 'Nuevo' || l.status === 'Contactado')
        .map((l: any, idx: number) => ({
          id: l.id,
          name: l.full_name,
          phone: l.phone || '+00 00 0000 0000',
          wait: `${(idx + 1) * 3} min`,
          reason: l.status === 'Nuevo' ? 'Primer Contacto' : 'Seguimiento',
          priority: l.score && l.score > 75 ? 'alta' as const : l.score && l.score > 40 ? 'media' as const : 'baja' as const,
        }));
      
      const doneItems = leads
        .filter((l: any) => l.status === 'Calificado')
        .map((l: any) => ({
          id: l.id,
          name: l.full_name,
          phone: l.phone || '+00 00 0000 0000',
          wait: 'Completada',
          reason: 'Calificado',
          priority: 'alta' as const,
        }));

      const missedItems = leads
        .filter((l: any) => l.status === 'Descartado')
        .map((l: any) => ({
          id: l.id,
          name: l.full_name,
          phone: l.phone || '+00 00 0000 0000',
          wait: 'Buzón / Sin Interés',
          reason: 'Descartado',
          priority: 'baja' as const,
        }));

      setQueues({
        pending: pendingItems,
        active: [],
        done: doneItems,
        missed: missedItems,
      });

      // Maintain selection if still valid
      if (pendingItems.length > 0) {
        setSelectedItemId((prev) => {
          const exists = pendingItems.some((i: any) => i.id === prev);
          return exists ? prev : pendingItems[0].id;
        });
      } else {
        setSelectedItemId(null);
      }
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [profile]);

  // Fetch Dialer Metrics dynamically
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!profile) return;
      const { data: calls } = await supabase
        .from('calls')
        .select('*')
        .eq('agent_id', profile.id);

      const totalCalls = calls?.length || 0;
      const doneCalls = calls?.filter((c: any) => c.status === 'done').length || 0;
      const totalDuration = calls?.reduce((acc: number, curr: any) => acc + (curr.duration_seconds || 0), 0) || 0;
      
      const avgSeconds = totalCalls > 0 ? Math.floor(totalDuration / totalCalls) : 0;
      const avgMin = String(Math.floor(avgSeconds / 60)).padStart(2, '0');
      const avgSec = String(avgSeconds % 60).padStart(2, '0');

      const contactRate = totalCalls > 0 ? Math.round((doneCalls / totalCalls) * 100) + '%' : '0%';

      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('agent_id', profile.id)
        .eq('status', 'Contactado');

      setMetrics({
        callsCount: totalCalls,
        avgTime: `${avgMin}:${avgSec}`,
        contactRate,
        pendingCallbacks: leads?.length || 0,
      });
    };
    fetchMetrics();
  }, [profile, queues]);

  // Timer effect
  useEffect(() => {
    if (isCalling) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCalling]);

  const handleStartCall = () => {
    if (isCalling) {
      handleStopCall();
      return;
    }
    const current = getSelectedItem();
    if (!current) {
      addToast({
        title: 'Error de llamada',
        description: 'No hay ningún cliente seleccionado en la cola.',
        type: 'warning'
      });
      return;
    }
    
    setIsCalling(true);
    addToast({
      title: 'Llamando...',
      description: `Conectando con ${current.name}...`,
      type: 'success',
    });
  };

  const handleStopCall = async () => {
    setIsCalling(false);
    const min = String(Math.floor(duration / 60)).padStart(2, '0');
    const sec = String(duration % 60).padStart(2, '0');
    
    const current = getSelectedItem();
    if (current) {
      const callRecord = {
        lead_id: current.id,
        agent_id: profile?.id,
        status: disposition === 'Buzón' || disposition === 'No contesta' ? 'missed' : 'done',
        duration_seconds: duration,
        disposition: disposition || 'Completada',
        notes: callNotes,
        started_at: new Date(Date.now() - duration * 1000).toISOString(),
        ended_at: new Date().toISOString()
      };
      await supabase.from('calls').insert(callRecord);
      
      // Update lead status in db based on disposition
      if (disposition === 'Calificado') {
        await supabase.from('leads').update({ status: 'Calificado' }).eq('id', current.id);
      } else if (disposition === 'Descartado') {
        await supabase.from('leads').update({ status: 'Descartado' }).eq('id', current.id);
      } else {
        await supabase.from('leads').update({ status: 'Contactado' }).eq('id', current.id);
      }
    }

    addToast({
      title: 'Llamada Finalizada',
      description: `Duración: ${min}:${sec}. Disposición: ${disposition || 'Completada'}.`,
      type: 'info',
    });

    await fetchQueue();
    setCallNotes('');
    setDisposition('');
  };

  const getSelectedItem = (): QueueItem | undefined => {
    const list = queues[activeQueueTab];
    return list.find((item) => item.id === selectedItemId) || list[0];
  };

  const activeItem = getSelectedItem();

  const formatTime = (totalSeconds: number) => {
    const min = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const sec = String(totalSeconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
  };

  const statusColors = {
    alta: 'text-kovex-danger border-kovex-danger/20 bg-kovex-danger/5',
    media: 'text-kovex-warning border-kovex-warning/20 bg-kovex-warning/5',
    baja: 'text-kovex-muted border-kovex-border bg-white/[0.02]',
  };

  return (
    <div className="space-y-6 select-none animate-fade-in text-kovex-text h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-white">Contact Center</h1>
          <p className="text-xs text-kovex-muted mt-1">
            Cola de marcación automática · Agente activo
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 border border-kovex-border hover:bg-white/[0.02] text-xs font-semibold px-4 py-2.5 rounded-xl text-kovex-text transition-colors">
            <Settings2 size={14} /> Configurar
          </button>
          <button className="flex items-center gap-2 bg-kovex-accent/10 hover:bg-kovex-accent/20 border border-kovex-accent/20 text-xs font-bold px-4 py-2.5 rounded-xl text-kovex-accent transition-all">
            <Play size={14} className="fill-current" /> Iniciar Turno
          </button>
        </div>
      </div>

      {/* Metrics widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
        <div className="bg-[#0F1525]/30 border border-kovex-border rounded-2xl p-4">
          <span className="text-[9px] text-kovex-muted uppercase font-bold tracking-widest block">Llamadas realizadas</span>
          <span className="font-mono text-xl text-white font-extrabold block mt-2">{metrics.callsCount}</span>
        </div>
        <div className="bg-[#0F1525]/30 border border-kovex-border rounded-2xl p-4">
          <span className="text-[9px] text-kovex-muted uppercase font-bold tracking-widest block">Tiempo Promedio</span>
          <span className="font-mono text-xl text-kovex-accent font-extrabold block mt-2">{metrics.avgTime}</span>
        </div>
        <div className="bg-[#0F1525]/30 border border-kovex-border rounded-2xl p-4">
          <span className="text-[9px] text-kovex-muted uppercase font-bold tracking-widest block">Tasa de Contacto</span>
          <span className="font-mono text-xl text-kovex-success font-extrabold block mt-2">{metrics.contactRate}</span>
        </div>
        <div className="bg-[#0F1525]/30 border border-kovex-border rounded-2xl p-4">
          <span className="text-[9px] text-kovex-muted uppercase font-bold tracking-widest block">Callbacks Pendientes</span>
          <span className="font-mono text-xl text-kovex-warning font-extrabold block mt-2">{metrics.pendingCallbacks}</span>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch h-[calc(100vh-320px)] min-h-[420px]">
        {/* Left Call Queues (40%) */}
        <div className="lg:col-span-4 bg-[#0F1525]/40 border border-kovex-border rounded-2xl flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-kovex-border bg-black/10 flex-shrink-0">
            {(['pending', 'active', 'done', 'missed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveQueueTab(tab);
                  setSelectedItemId(null);
                }}
                className={`flex-1 text-center py-3 text-[10px] font-bold tracking-wider border-b-2 uppercase transition-all ${
                  activeQueueTab === tab
                    ? 'text-kovex-primary border-kovex-primary'
                    : 'text-kovex-muted border-transparent hover:text-white'
                }`}
              >
                {tab === 'pending' ? 'Pendientes' : tab === 'active' ? 'En Curso' : tab === 'done' ? 'Hechas' : 'Perdidas'}
              </button>
            ))}
          </div>

          {/* List queue */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {queues[activeQueueTab].length === 0 ? (
              <div className="text-center py-12 text-kovex-muted text-xs">Sin prospectos asignados en esta cola</div>
            ) : (
              queues[activeQueueTab].map((item) => {
                const active = selectedItemId === item.id || (!selectedItemId && queues[activeQueueTab][0]?.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      active
                        ? 'bg-kovex-primary/10 border-kovex-primary/40'
                        : 'bg-kovex-elevated/20 border-kovex-border hover:border-kovex-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={item.name} size="sm" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white leading-tight">{item.name}</span>
                        <span className="text-[10px] text-kovex-muted mt-1 font-mono">{item.phone}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[9px] text-kovex-muted font-semibold">{item.wait}</span>
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${statusColors[item.priority]}`}>
                        {item.priority}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Call Dialer (60%) */}
        <div className="lg:col-span-6 bg-[#0F1525]/40 border border-kovex-border rounded-2xl p-6 flex flex-col justify-between overflow-y-auto">
          {activeItem ? (
            <>
              {/* Client Header info */}
              <div className="flex flex-col items-center text-center mt-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-kovex-primary to-[#7B0E55] flex items-center justify-center font-bold text-xl text-white shadow-xl shadow-kovex-primary/10">
                  {activeItem.name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
                </div>
                <h2 className="font-display font-extrabold text-white text-base mt-4">{activeItem.name}</h2>
                <span className="text-xs text-kovex-muted mt-1 font-mono">{activeItem.phone}</span>
                <div className="mt-2 flex gap-2">
                  <Badge variant="gray">{activeItem.reason}</Badge>
                  <Badge variant={activeItem.priority === 'alta' ? 'danger' : 'warning'}>Prioridad {activeItem.priority}</Badge>
                </div>
              </div>

              {/* Call Timer and controls */}
              <div className="flex flex-col items-center justify-center my-6">
                <span className="font-mono text-3xl font-extrabold tracking-widest text-kovex-success">
                  {formatTime(duration)}
                </span>

                {/* Dialer Action Buttons */}
                <div className="flex items-center gap-4 mt-6">
                  <button className="p-3 bg-kovex-surface border border-kovex-border hover:border-kovex-border/80 text-kovex-muted hover:text-white rounded-2xl transition-all">
                    <MicOff size={16} />
                  </button>
                  <button
                    onClick={handleStartCall}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all shadow-lg active:scale-95 ${
                      isCalling
                        ? 'bg-kovex-danger hover:brightness-105 shadow-kovex-danger/25 animate-pulse'
                        : 'bg-kovex-success hover:brightness-105 shadow-kovex-success/25'
                    }`}
                  >
                    {isCalling ? <PhoneOff size={20} /> : <Phone size={20} />}
                  </button>
                  <button className="p-3 bg-kovex-surface border border-kovex-border hover:border-kovex-border/80 text-kovex-muted hover:text-white rounded-2xl transition-all">
                    <Pause size={16} />
                  </button>
                </div>
              </div>

              {/* Quick Notes and Disposition */}
              <div className="space-y-4 pt-4 border-t border-kovex-border/30">
                {/* Disposition Select */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider">Disposición / Resultado</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Buzón', 'No contesta', 'Contactado', 'Calificado', 'Descartado'].map((disp) => (
                      <button
                        key={disp}
                        onClick={() => setDisposition(disp)}
                        className={`py-2 px-3 text-[10px] font-bold rounded-xl border text-center transition-all ${
                          disposition === disp
                            ? 'bg-kovex-primary/15 border-kovex-primary text-white'
                            : 'bg-kovex-surface border-kovex-border text-kovex-muted hover:text-white hover:border-kovex-border/80'
                        }`}
                      >
                        {disp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider">Notas Rápidas</label>
                  <textarea
                    rows={3}
                    placeholder="Escribe aquí los comentarios más relevantes de la llamada..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    className="w-full bg-kovex-surface border border-kovex-border rounded-xl p-3 text-xs text-white placeholder-kovex-muted outline-none focus:border-kovex-primary/50 transition-all resize-none"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-kovex-muted">
              <Phone size={36} className="mb-3 opacity-30" />
              <p className="text-xs">No hay prospectos seleccionados</p>
              <span className="text-[10px] mt-1">Agrega prospectos y asígnalos a tu cuenta para iniciar la cola de llamadas.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
