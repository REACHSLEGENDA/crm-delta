// modules/automatizacion/AutomatizacionPage.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Automation } from '@/types';
import Badge from '@/components/shared/Badge';
import { 
  Zap, Plus, ToggleLeft, ToggleRight, Trash2, Edit2, Play, 
  HelpCircle, Mail, MessageCircle, UserCheck, RefreshCw, 
  Clock, GitBranch, Save, HelpCircle as HelpIcon, PlayCircle, Filter 
} from 'lucide-react';
import { useNotificationsStore } from '@/store/notificationsStore';

interface FlowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  title: string;
  subtitle: string;
  x: number;
  y: number;
}

export default function AutomatizacionPage() {
  const addToast = useNotificationsStore((state) => state.addToast);

  // States
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'flows' | 'builder' | 'logs'>('flows');

  // Flow Builder states
  const [flowName, setFlowName] = useState('Nuevo Flujo');
  const [nodes, setNodes] = useState<FlowNode[]>([
    { id: '1', type: 'trigger', title: 'Nuevo Lead Web', subtitle: 'Al completar el formulario', x: 40, y: 50 },
    { id: '2', type: 'condition', title: '¿País = México?', subtitle: 'Si sí → continuar', x: 300, y: 160 },
    { id: '3', type: 'action', title: 'Enviar Email bienvenida', subtitle: 'Plantilla: welcome_es', x: 560, y: 50 },
    { id: '4', type: 'action', title: 'Asignar Agente round-robin', subtitle: 'Asigna al AM disponible', x: 560, y: 270 }
  ]);

  const [logs, setLogs] = useState<any[]>([
    { time: '12 Jun, 12:45', flow: 'WhatsApp inbound → Crear prospecto', lead: 'Daniela Cárdenas', result: 'success', duration: '0.8s' },
    { time: '12 Jun, 11:30', flow: 'Nuevo lead web → Bienvenida', lead: 'Andrés F. López', result: 'success', duration: '1.2s' },
    { time: '12 Jun, 10:15', flow: 'Sin actividad 3 días → Alerta', lead: 'Tomás Echeverría', result: 'warning', duration: '0.3s' },
  ]);

  const fetchAutomations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('automations').select('*');
      if (!error && data) {
        setAutomations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await supabase.from('automations').update({ is_active: !current }).eq('id', id);
      setAutomations(automations.map((a) => a.id === id ? { ...a, is_active: !current } : a));
      addToast({
        title: 'Flujo actualizado',
        description: `El flujo ha sido ${!current ? 'activado' : 'pausado'}.`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveFlow = async () => {
    try {
      const newFlow = {
        name: flowName,
        trigger_type: 'lead.created',
        trigger_config: {},
        flow: { nodes },
        is_active: true,
        executions_count: 0
      };

      const { data, error } = await supabase.from('automations').insert(newFlow);
      if (!error && data) {
        setAutomations([data[0], ...automations]);
        addToast({
          title: 'Flujo Guardado',
          description: `"${flowName}" fue guardado correctamente en Supabase.`,
          type: 'success',
        });
        setActiveTab('flows');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNode = (type: 'trigger' | 'condition' | 'action', title: string, subtitle: string) => {
    const lastNode = nodes[nodes.length - 1];
    const newNode: FlowNode = {
      id: crypto.randomUUID(),
      type,
      title,
      subtitle,
      x: lastNode ? lastNode.x + 220 : 100,
      y: lastNode ? lastNode.y + 50 : 100
    };
    setNodes([...nodes, newNode]);
    addToast({
      title: 'Bloque añadido',
      description: `Se añadió el bloque de tipo ${type} al lienzo.`,
      type: 'info',
    });
  };

  const handleRemoveNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-6 select-none animate-fade-in text-kovex-text">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-white">Automatización de Ventas</h1>
          <p className="text-xs text-kovex-muted mt-1">
            Flujos de trabajo inteligentes y respuestas automáticas.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-kovex-border">
        {(['flows', 'builder', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'text-kovex-primary border-kovex-primary font-bold'
                : 'text-kovex-muted border-transparent hover:text-white'
            }`}
          >
            {tab === 'flows' ? 'Flujos Activos' : tab === 'builder' ? 'Constructor Visual' : 'Historial de Ejecuciones'}
          </button>
        ))}
      </div>

      {/* TAB FLOWS */}
      {activeTab === 'flows' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center p-12 text-kovex-muted text-xs">Cargando flujos...</div>
          ) : automations.length === 0 ? (
            <div className="text-center p-12 text-kovex-muted text-xs">No hay flujos de automatización configurados</div>
          ) : (
            <div className="space-y-3">
              {automations.map((a) => (
                <div
                  key={a.id}
                  className="bg-[#0F1525]/30 border border-kovex-border p-5 rounded-2xl flex items-center justify-between hover:border-kovex-primary/25 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-kovex-primary/10 border border-kovex-primary/20 flex items-center justify-center text-kovex-primary flex-shrink-0">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm leading-snug">{a.name}</h4>
                      <div className="flex items-center gap-3 text-[10px] text-kovex-muted uppercase font-bold tracking-wider mt-1.5">
                        <span>Trigger: <code className="text-kovex-accent font-mono lowercase">{a.trigger_type}</code></span>
                        <span>•</span>
                        <span>{a.executions_count} leads procesados</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Toggle switch */}
                    <button
                      onClick={() => handleToggleActive(a.id, a.is_active)}
                      className="text-kovex-muted hover:text-white transition-colors"
                    >
                      {a.is_active ? (
                        <ToggleRight size={36} className="text-kovex-primary" />
                      ) : (
                        <ToggleLeft size={36} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB BUILDER */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-250px)] min-h-[460px] items-stretch">
          {/* Draggable Blocks Palette - Left */}
          <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] text-kovex-muted font-bold uppercase tracking-wider mb-3">Triggers (Gases)</h4>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleAddNode('trigger', 'Nuevo Lead Creado', 'Al ingresar un lead')}
                    className="flex items-center gap-2 p-3 text-left bg-kovex-bg hover:border-kovex-primary/30 border border-kovex-border rounded-xl text-xs hover:text-white transition-all"
                  >
                    <Zap size={14} className="text-kovex-primary" /> Lead Creado
                  </button>
                  <button
                    onClick={() => handleAddNode('trigger', 'Cambio de Etapa', 'Al mover en el Kanban')}
                    className="flex items-center gap-2 p-3 text-left bg-kovex-bg hover:border-kovex-primary/30 border border-kovex-border rounded-xl text-xs hover:text-white transition-all"
                  >
                    <Zap size={14} className="text-kovex-primary" /> Cambio de Etapa
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] text-kovex-muted font-bold uppercase tracking-wider mb-3">Condiciones</h4>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleAddNode('condition', 'Si País = LATAM', 'Filtro geográfico')}
                    className="flex items-center gap-2 p-3 text-left bg-kovex-bg hover:border-kovex-warning/30 border border-kovex-border rounded-xl text-xs hover:text-white transition-all"
                  >
                    <Filter size={14} className="text-kovex-warning" /> Comparar Campo
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] text-kovex-muted font-bold uppercase tracking-wider mb-3">Acciones</h4>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleAddNode('action', 'Enviar Correo', 'Plantilla de bienvenida')}
                    className="flex items-center gap-2 p-3 text-left bg-kovex-bg hover:border-kovex-accent/30 border border-kovex-border rounded-xl text-xs hover:text-white transition-all"
                  >
                    <Mail size={14} className="text-kovex-accent" /> Enviar Correo
                  </button>
                  <button
                    onClick={() => handleAddNode('action', 'Mensaje WhatsApp', 'Envía WhatsApp automático')}
                    className="flex items-center gap-2 p-3 text-left bg-kovex-bg hover:border-kovex-accent/30 border border-kovex-border rounded-xl text-xs hover:text-white transition-all"
                  >
                    <MessageCircle size={14} className="text-kovex-accent" /> Enviar WhatsApp
                  </button>
                  <button
                    onClick={() => handleAddNode('action', 'Asignar Agente', 'Round-robin automático')}
                    className="flex items-center gap-2 p-3 text-left bg-kovex-bg hover:border-kovex-accent/30 border border-kovex-border rounded-xl text-xs hover:text-white transition-all"
                  >
                    <UserCheck size={14} className="text-kovex-accent" /> Asignar Agente
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-kovex-border mt-4">
              <input
                type="text"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="w-full bg-kovex-bg border border-kovex-border text-white text-xs rounded-xl p-3 outline-none mb-3"
              />
              <button
                onClick={handleSaveFlow}
                className="w-full flex items-center justify-center gap-2 bg-kovex-primary hover:brightness-105 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
              >
                <Save size={14} /> Guardar Flujo
              </button>
            </div>
          </div>

          {/* SVG Canvas Workspace - Right */}
          <div className="lg:col-span-3 bg-[#080C18]/60 border border-kovex-border rounded-2xl relative overflow-hidden flex-1 min-h-[400px]">
            {/* SVG Background Grid lines */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0)',
                backgroundSize: '16px 16px'
              }}
            />

            {/* Connecting lines via SVG Paths */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#FFFFFF20"/>
                </marker>
              </defs>
              {nodes.map((n, i) => {
                if (i === 0) return null;
                const prev = nodes[i - 1];
                // Draw bezier path
                const x1 = prev.x + 200;
                const y1 = prev.y + 40;
                const x2 = n.x;
                const y2 = n.y + 40;
                return (
                  <path
                    key={n.id}
                    d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={2}
                    fill="none"
                    markerEnd="url(#arrow)"
                  />
                );
              })}
            </svg>

            {/* Node elements */}
            <div className="absolute inset-0 overflow-auto p-6 z-10">
              {nodes.map((node) => {
                const borderColors = {
                  trigger: 'border-kovex-primary/40',
                  condition: 'border-kovex-warning/40',
                  action: 'border-kovex-accent/40',
                };
                return (
                  <div
                    key={node.id}
                    className={`absolute w-52 bg-kovex-surface border ${borderColors[node.type]} rounded-xl p-4 shadow-2xl flex flex-col justify-between`}
                    style={{ left: node.x, top: node.y }}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${
                        node.type === 'trigger' ? 'text-kovex-primary' : node.type === 'condition' ? 'text-kovex-warning' : 'text-kovex-accent'
                      }`}>
                        {node.type}
                      </span>
                      <button
                        onClick={() => handleRemoveNode(node.id)}
                        className="text-kovex-muted hover:text-kovex-danger p-0.5 rounded transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <h5 className="font-bold text-white text-xs mt-2">{node.title}</h5>
                    <p className="text-[10px] text-kovex-muted mt-1 leading-snug">{node.subtitle}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-kovex-border bg-white/[0.015]">
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Timestamp</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Flujo</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Prospecto</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Resultado</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Duración</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index} className="border-b border-kovex-border/30">
                  <td className="p-4 text-xs text-kovex-muted">{log.time}</td>
                  <td className="p-4 text-xs font-bold text-white">{log.flow}</td>
                  <td className="p-4 text-xs text-kovex-text">{log.lead}</td>
                  <td className="p-4 text-xs">
                    <Badge variant={log.result === 'success' ? 'success' : 'warning'}>
                      {log.result === 'success' ? 'Éxito' : 'Advertencia'}
                    </Badge>
                  </td>
                  <td className="p-4 text-xs text-kovex-muted font-mono">{log.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
