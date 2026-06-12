// modules/contact-center/ContactCenterPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import Avatar from '@/components/shared/Avatar';
import Badge from '@/components/shared/Badge';
import { 
  Phone, PhoneOff, MicOff, Pause, PhoneForwarded, 
  Settings2, Play, Calendar, User, FileText, ChevronDown 
} from 'lucide-react';
import { useNotificationsStore } from '@/store/notificationsStore';

interface QueueItem {
  id: string;
  name: string;
  phone: string;
  wait: string;
  reason: string;
  priority: 'alta' | 'media' | 'baja';
}

export default function ContactCenterPage() {
  const addToast = useNotificationsStore((state) => state.addToast);

  // States
  const [activeQueueTab, setActiveQueueTab] = useState<'pending' | 'active' | 'done' | 'missed'>('pending');
  const [selectedItemId, setSelectedItemId] = useState<string | null>('q1');
  const [isCalling, setIsCalling] = useState(false);
  const [duration, setDuration] = useState(0);
  const [callNotes, setCallNotes] = useState('');
  const [disposition, setDisposition] = useState('');

  const timerRef = useRef<any | null>(null);

  // Initial Seed Queue
  const queueData = {
    pending: [
      { id: 'q1', name: 'Juan Manuel Acosta', phone: '+52 55 4821 3074', wait: '2 min', reason: 'Demo agendada', priority: 'alta' as const },
      { id: 'q2', name: 'Mariana Velázquez', phone: '+52 55 8421 3392', wait: '5 min', reason: 'Follow-up depósito', priority: 'alta' as const },
      { id: 'q3', name: 'Renata Cisneros', phone: '+51 999 320 887', wait: '12 min', reason: 'Onboarding cuenta', priority: 'media' as const },
      { id: 'q4', name: 'Camila Bustamante', phone: '+56 9 8210 4477', wait: '18 min', reason: 'Callback solicitado', priority: 'baja' as const },
    ],
    active: [
      { id: 'q5', name: 'Federico Sandoval', phone: '+52 33 4488 2210', wait: 'En curso 04:21', reason: 'Cierre depósito', priority: 'alta' as const },
    ],
    done: [
      { id: 'q6', name: 'Eduardo Ramos', phone: '+52 33 2911 4082', wait: 'Duración: 08:14', reason: 'Demo completada', priority: 'media' as const },
      { id: 'q7', name: 'Sofía Domínguez', phone: '+54 11 4892 1023', wait: 'Duración: 05:42', reason: 'Calificación', priority: 'media' as const },
    ],
    missed: [
      { id: 'q9', name: 'Matías Fernández', phone: '+54 11 5023 8765', wait: 'Buzón', reason: 'Callback', priority: 'media' as const },
    ],
  };

  const [queues, setQueues] = useState(queueData);

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
    if (!current) return;
    
    setIsCalling(true);
    addToast({
      title: 'Llamando...',
      description: `Conectando con ${current.name}...`,
      type: 'success',
    });
  };

  const handleStopCall = () => {
    setIsCalling(false);
    const min = String(Math.floor(duration / 60)).padStart(2, '0');
    const sec = String(duration % 60).padStart(2, '0');
    addToast({
      title: 'Llamada Finalizada',
      description: `Duración: ${min}:${sec}. Disposición: ${disposition || 'No seleccionada'}.`,
      type: 'info',
    });

    // Move called item from pending to done
    const current = getSelectedItem();
    if (current && activeQueueTab === 'pending') {
      const updatedPending = queues.pending.filter((item) => item.id !== current.id);
      const updatedDone = [
        { ...current, wait: `Duración: ${min}:${sec}` },
        ...queues.done
      ];
      setQueues({
        ...queues,
        pending: updatedPending,
        done: updatedDone as any
      });
      // Select next pending item
      setSelectedItemId(updatedPending[0]?.id || null);
    }
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
          <span className="font-mono text-xl text-white font-extrabold block mt-2">28</span>
        </div>
        <div className="bg-[#0F1525]/30 border border-kovex-border rounded-2xl p-4">
          <span className="text-[9px] text-kovex-muted uppercase font-bold tracking-widest block">Tiempo Promedio</span>
          <span className="font-mono text-xl text-kovex-accent font-extrabold block mt-2">04:32</span>
        </div>
        <div className="bg-[#0F1525]/30 border border-kovex-border rounded-2xl p-4">
          <span className="text-[9px] text-kovex-muted uppercase font-bold tracking-widest block">Tasa de Contacto</span>
          <span className="font-mono text-xl text-kovex-success font-extrabold block mt-2">67%</span>
        </div>
        <div className="bg-[#0F1525]/30 border border-kovex-border rounded-2xl p-4">
          <span className="text-[9px] text-kovex-muted uppercase font-bold tracking-widest block">Callbacks Pendientes</span>
          <span className="font-mono text-xl text-kovex-warning font-extrabold block mt-2">6</span>
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
              <div className="text-center py-12 text-kovex-muted text-xs">Sin elementos en esta cola</div>
            ) : (
              queues[activeQueueTab].map((item) => {
                const active = selectedItemId === item.id || (!selectedItemId && queues[activeQueueTab][0]?.id === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      active
                        ? 'bg-kovex-primary/10 border-kovex-primary/30 text-white font-bold'
                        : 'bg-kovex-surface/20 border-kovex-border hover:border-kovex-border/80 text-kovex-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={item.name} size="sm" />
                      <div className="min-w-0">
                        <h4 className={`text-xs font-bold truncate ${active ? 'text-white' : 'text-kovex-text'}`}>{item.name}</h4>
                        <span className="text-[10px] font-mono mt-0.5 block">{item.phone}</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] block font-semibold">{item.wait}</span>
                      <Badge variant={item.priority === 'alta' ? 'danger' : item.priority === 'media' ? 'warning' : 'gray'}>
                        {item.priority}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Dialer (60%) */}
        <div className="lg:col-span-6 bg-[#0F1525]/40 border border-kovex-border rounded-2xl p-6 flex flex-col justify-between overflow-y-auto">
          {activeItem ? (
            <div className="space-y-6">
              {/* Call target Header */}
              <div className="flex flex-col items-center text-center pb-6 border-b border-kovex-border">
                <Avatar name={activeItem.name} size="lg" />
                <h3 className="font-display font-extrabold text-white text-lg mt-3">{activeItem.name}</h3>
                <span className="text-xs text-kovex-muted font-mono mt-1">{activeItem.phone}</span>
                
                {/* Timer display */}
                <div className="font-mono font-light text-4xl text-kovex-accent tracking-widest mt-4">
                  {formatTime(duration)}
                </div>
              </div>

              {/* Call Actions buttons */}
              <div className="flex justify-center gap-3 py-2">
                <button className="w-12 h-12 rounded-full border border-kovex-border bg-kovex-surface flex items-center justify-center text-kovex-muted hover:text-white transition-all">
                  <MicOff size={16} />
                </button>
                <button
                  onClick={handleStartCall}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all shadow-xl ${
                    isCalling 
                      ? 'bg-kovex-danger hover:brightness-105 shadow-kovex-danger/25' 
                      : 'bg-kovex-primary hover:brightness-105 shadow-kovex-primary/25'
                  }`}
                >
                  {isCalling ? <PhoneOff size={20} /> : <Phone size={20} />}
                </button>
                <button className="w-12 h-12 rounded-full border border-kovex-border bg-kovex-surface flex items-center justify-center text-kovex-muted hover:text-white transition-all">
                  <Pause size={16} />
                </button>
              </div>

              {/* Notes and disposition inputs */}
              <div className="space-y-4 pt-4 border-t border-kovex-border/30">
                <div>
                  <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">Notas Rápidas</label>
                  <textarea
                    placeholder="Escribe aquí los comentarios más relevantes de la llamada..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-kovex-bg border border-kovex-border text-white text-xs rounded-xl p-3 outline-none resize-none focus:border-kovex-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">Resultado (Disposición)</label>
                  <select
                    value={disposition}
                    onChange={(e) => setDisposition(e.target.value)}
                    className="w-full bg-kovex-bg border border-kovex-border text-white text-xs rounded-xl p-3 outline-none focus:border-kovex-primary/40"
                  >
                    <option value="">— Seleccionar resultado de la llamada —</option>
                    <option value="Agendar Demo">Interesado · Agendar demo comercial</option>
                    <option value="No Interesado">No interesado en los servicios</option>
                    <option value="Buzón">Llamada mandada a Buzón de voz</option>
                    <option value="Callback">Agendar Callback / Re-llamada</option>
                    <option value="Depósito">Depósito Confirmado</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-kovex-muted">
              <Phone size={32} className="opacity-20 mb-2" />
              <span className="text-xs">Selecciona un elemento para llamar</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
