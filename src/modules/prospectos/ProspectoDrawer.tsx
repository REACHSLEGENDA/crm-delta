// modules/prospectos/ProspectoDrawer.tsx
import React, { useState, useEffect } from 'react';
import Drawer from '@/components/shared/Drawer';
import Badge from '@/components/shared/Badge';
import Avatar from '@/components/shared/Avatar';
import { Lead } from '@/types';
import { useProspectosStore } from './useProspectos';
import { useNotificationsStore } from '@/store/notificationsStore';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Phone, Mail, Globe, User, Calendar, FileText, 
  Trash2, Edit, CheckCircle, UserCheck, MessageSquare, DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ProspectoDrawerProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
}

export default function ProspectoDrawer({ leadId, isOpen, onClose, onEdit }: ProspectoDrawerProps) {
  const leads = useProspectosStore((state) => state.leads);
  const deleteLead = useProspectosStore((state) => state.deleteLead);
  const addToast = useNotificationsStore((state) => state.addToast);
  const profile = useAuthStore((state) => state.profile);
  const permissions = usePermissions();
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'notes' | 'files'>('info');
  const [newNote, setNewNote] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    async function loadAgents() {
      const { data, error } = await supabase.from('profiles').select('id, full_name');
      if (!error && data) {
        setAgents(data.map((p: any) => ({ id: p.id, name: p.full_name })));
      }
    }
    if (isOpen) {
      loadAgents();
    }
  }, [isOpen]);

  const lead = leads.find((l) => l.id === leadId);

  const loadComments = async () => {
    if (!lead?.id) return;
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('lead_comments')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setComments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (isOpen && lead?.id) {
      loadComments();
    }
  }, [isOpen, lead?.id]);

  const handleSaveComment = async () => {
    if (!newNote.trim() || !profile || !lead) return;
    try {
      const { error } = await supabase
        .from('lead_comments')
        .insert({
          lead_id: lead.id,
          content: newNote,
          author_id: profile.id
        });
      if (!error) {
        addToast({
          title: 'Comentario guardado',
          description: 'La nota de seguimiento fue agregada correctamente.',
          type: 'success',
        });
        setNewNote('');
        loadComments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getAgentName = (id: string | null) => {
    if (!id) return 'Sistema';
    const found = agents.find((a) => a.id === id);
    return found ? found.name : 'Cargando...';
  };

  if (!lead) return null;

  const handleDelete = async () => {
    if (confirm(`¿Estás seguro de que deseas eliminar a ${lead.full_name}?`)) {
      await deleteLead(lead.id);
      addToast({
        title: 'Prospecto eliminado',
        description: `${lead.full_name} fue removido del sistema.`,
        type: 'warning',
      });
      onClose();
    }
  };

  const handleConvertToDeal = async () => {
    try {
      const dealData = {
        lead_id: lead.id,
        stage: 'lead',
        amount: Math.floor(Math.random() * 20000) + 1000,
        temperature: 'warm',
        agent_id: lead.agent_id,
        expected_close: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]
      };
      
      await supabase.from('deals').insert(dealData);
      
      addToast({
        title: 'Conversión exitosa',
        description: `${lead.full_name} fue convertido a Negociación.`,
        type: 'success',
      });
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  // Mock timelines
  const activities = [
    { type: 'call', title: 'Llamada saliente realizada', desc: 'Duración: 5m 24s. Interesado en cuenta institucional.', time: 'Ayer, 14:20' },
    { type: 'email', title: 'Correo de bienvenida enviado', desc: 'Flujo automático ejecutado correctamente.', time: 'Hace 2 días, 09:15' },
    { type: 'system', title: 'Lead capturado', desc: 'Origen: Formulario Web de registro.', time: 'Hace 3 días, 18:32' },
  ];

  const files = [
    { name: 'perfil_kyc.pdf', size: '1.4 MB' },
    { name: 'captura_whatsapp.png', size: '320 KB' },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={lead.full_name}
      subtitle={
        <div className="flex items-center gap-2">
          <span>{lead.country}</span>
          <span className="text-kovex-muted">•</span>
          <Badge variant={lead.status === 'Nuevo' ? 'accent' : lead.status === 'Calificado' ? 'success' : lead.status === 'Contactado' ? 'warning' : 'danger'}>
            {lead.status}
          </Badge>
        </div>
      }
      headerIcon={<Avatar name={lead.full_name} />}
      footerActions={
        <>
          {permissions.canDeleteLead && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 border border-kovex-danger/20 hover:bg-kovex-danger/5 rounded-xl text-xs font-bold text-kovex-danger transition-colors"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          )}
          {permissions.canEditLead(lead.agent_id) && (
            <button
              onClick={() => onEdit(lead)}
              className="flex items-center gap-1.5 px-3 py-2 border border-kovex-border hover:bg-white/[0.02] rounded-xl text-xs font-bold text-white transition-colors"
            >
              <Edit size={14} /> Editar
            </button>
          )}
          {permissions.canCreateDeal && (
            <button
              onClick={handleConvertToDeal}
              className="flex items-center gap-1.5 px-3 py-2 bg-kovex-primary hover:brightness-105 rounded-xl text-xs font-bold text-white transition-all"
            >
              Convertir a Negocio
            </button>
          )}
        </>
      }
    >
      {/* Tabs list */}
      <div className="flex border-b border-kovex-border">
        {(['info', 'activity', 'notes', 'files'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-center py-2 text-xs font-semibold border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'text-kovex-primary border-kovex-primary font-bold'
                : 'text-kovex-muted border-transparent hover:text-white'
            }`}
          >
            {tab === 'info' ? 'Información' : tab === 'activity' ? 'Actividad' : tab === 'notes' ? 'Notas' : 'Archivos'}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Badge variant="primary">Score {lead.score}</Badge>
            <Badge variant="gray">{lead.source}</Badge>
          </div>

          <div className="bg-kovex-surface/40 border border-kovex-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-kovex-muted flex items-center gap-1.5"><Mail size={12} /> Email</span>
              <span className="text-white font-medium">{lead.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-kovex-muted flex items-center gap-1.5"><Phone size={12} /> Teléfono</span>
              <span className="text-white font-mono">{lead.phone || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-kovex-muted flex items-center gap-1.5"><Globe size={12} /> País</span>
              <span className="text-white font-medium">{lead.country || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-kovex-muted flex items-center gap-1.5"><DollarSign size={12} /> Monto de Inversión</span>
              <span className="text-kovex-accent font-bold font-mono">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(lead.investment_amount || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-kovex-muted flex items-center gap-1.5"><User size={12} /> Agente</span>
              <span className="text-white font-medium">
                {agents.find(a => a.id === lead.agent_id)?.name || 'Sin asignar'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-kovex-muted flex items-center gap-1.5"><Calendar size={12} /> Capturado</span>
              <span className="text-white font-medium">{new Date(lead.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider mb-2">Descripción inicial</h4>
            <div className="bg-kovex-elevated/40 border border-kovex-border p-4 rounded-xl text-xs text-kovex-text leading-relaxed">
              {lead.notes || 'No hay notas iniciales registradas.'}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="relative border-l border-kovex-border ml-3 pl-6 space-y-5">
          {activities.map((act, idx) => (
            <div key={idx} className="relative">
              <span className="absolute -left-[31px] top-0.5 bg-kovex-surface w-4 h-4 rounded-full border border-kovex-primary/45 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-kovex-primary" />
              </span>
              <h5 className="text-xs font-bold text-white">{act.title}</h5>
              <p className="text-[11px] text-kovex-muted mt-1 leading-normal">{act.desc}</p>
              <span className="text-[9px] text-kovex-muted mt-1 block">{act.time}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <textarea
              placeholder="Escribe comentarios de conducta, estatus o notas de seguimiento aquí..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full bg-[#060b16] border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl p-3 text-xs outline-none resize-none"
              rows={3}
            />
            <button
              onClick={handleSaveComment}
              className="bg-kovex-primary hover:brightness-105 text-[#060b16] text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all"
            >
              Guardar Nota de Seguimiento
            </button>
          </div>
          
          <div className="space-y-3">
            <h5 className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider">Historial de Seguimiento</h5>
            {loadingComments ? (
              <div className="text-center text-xs text-kovex-muted py-4">Cargando comentarios...</div>
            ) : comments.length === 0 ? (
              <div className="text-center text-xs text-kovex-muted py-4">No hay notas de seguimiento registradas.</div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {comments.map((c) => (
                  <div key={c.id} className="bg-kovex-surface/40 border border-kovex-border p-3 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-white flex justify-between items-center">
                      <span className="text-kovex-primary">{getAgentName(c.author_id)}</span>
                      <span className="text-[9px] text-kovex-muted">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-kovex-text leading-relaxed mt-1 break-words">
                      {c.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-3">
          {files.map((f, idx) => (
            <div key={idx} className="flex justify-between items-center bg-kovex-surface/30 border border-kovex-border p-3 rounded-xl">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-kovex-muted" />
                <span className="text-xs text-white truncate">{f.name}</span>
              </div>
              <span className="text-[10px] text-kovex-muted">{f.size}</span>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
