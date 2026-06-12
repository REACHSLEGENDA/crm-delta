// modules/negociaciones/DealDrawer.tsx
import React, { useState } from 'react';
import Drawer from '@/components/shared/Drawer';
import Badge from '@/components/shared/Badge';
import Avatar from '@/components/shared/Avatar';
import { Deal } from '@/types';
import { useDealsStore } from './useDeals';
import { useNotificationsStore } from '@/store/notificationsStore';
import { 
  Phone, Mail, DollarSign, Calendar, FileText, 
  Trash2, User, ChevronRight, CheckSquare, Clock 
} from 'lucide-react';

interface DealDrawerProps {
  dealId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DealDrawer({ dealId, isOpen, onClose }: DealDrawerProps) {
  const deals = useDealsStore((state) => state.deals);
  const deleteDeal = useDealsStore((state) => state.deleteDeal);
  const addToast = useNotificationsStore((state) => state.addToast);
  
  const [activeTab, setActiveTab] = useState<'summary' | 'activity' | 'tasks' | 'history'>('summary');

  const deal = deals.find((d) => d.id === dealId);

  if (!deal) return null;

  const handleDelete = async () => {
    if (confirm(`¿Estás seguro de que deseas eliminar este trato?`)) {
      await deleteDeal(deal.id);
      addToast({
        title: 'Negociación eliminada',
        description: 'El trato fue removido del pipeline comercial.',
        type: 'warning',
      });
      onClose();
    }
  };

  const stageNames = {
    lead: 'Nuevo Lead',
    contact: 'Primer Contacto',
    int: 'Interesado',
    demo: 'Demo',
    dep: 'Depósito Pendiente',
    won: 'Ganado',
    lost: 'Perdido',
  };

  const getAgentName = (id: string | null) => {
    switch (id) {
      case '00000000-0000-0000-0000-000000000003': return 'Carlos Méndez';
      case '00000000-0000-0000-0000-000000000004': return 'Valeria Soto';
      case '00000000-0000-0000-0000-000000000001': return 'Diego Ramírez';
      default: return 'Sin asignar';
    }
  };

  const tempLabels = {
    hot: 'Caliente 🔴',
    warm: 'Tibio 🟡',
    cold: 'Frío 🟢',
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={deal.lead?.full_name || 'Negociación'}
      subtitle={
        <div className="flex items-center gap-2">
          <span className="font-mono text-kovex-accent font-bold">${deal.amount.toLocaleString()} USD</span>
          <span className="text-kovex-muted">•</span>
          <span>{stageNames[deal.stage]}</span>
        </div>
      }
      headerIcon={<Avatar name={deal.lead?.full_name || 'Trato'} />}
      footerActions={
        <>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 border border-kovex-danger/20 hover:bg-kovex-danger/5 rounded-xl text-xs font-bold text-kovex-danger transition-colors"
          >
            <Trash2 size={14} /> Eliminar Trato
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-kovex-elevated hover:bg-white/[0.04] border border-kovex-border text-xs font-bold rounded-xl text-white transition-all"
          >
            Cerrar
          </button>
        </>
      }
    >
      {/* Tabs */}
      <div className="flex border-b border-kovex-border">
        {(['summary', 'activity', 'tasks', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-center py-2 text-xs font-semibold border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'text-kovex-primary border-kovex-primary font-bold'
                : 'text-kovex-muted border-transparent hover:text-white'
            }`}
          >
            {tab === 'summary' ? 'Resumen' : tab === 'activity' ? 'Actividades' : tab === 'tasks' ? 'Tareas' : 'Historial'}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Badge variant={deal.temperature === 'hot' ? 'danger' : deal.temperature === 'warm' ? 'warning' : 'accent'}>
              {tempLabels[deal.temperature]}
            </Badge>
            <Badge variant="gray">Pre-calificado</Badge>
          </div>

          <div className="bg-kovex-surface/40 border border-kovex-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-kovex-muted flex items-center gap-1.5"><DollarSign size={12} /> Monto</span>
              <span className="text-kovex-accent font-mono font-extrabold">${deal.amount.toLocaleString()} USD</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-kovex-muted flex items-center gap-1.5"><Clock size={12} /> Etapa</span>
              <span className="text-white font-medium">{stageNames[deal.stage]}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-kovex-muted flex items-center gap-1.5"><User size={12} /> Agente asignado</span>
              <span className="text-white font-medium">{getAgentName(deal.agent_id)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-kovex-muted flex items-center gap-1.5"><Calendar size={12} /> Cierre estimado</span>
              <span className="text-white font-medium">{deal.expected_close || 'Sin definir'}</span>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider mb-2">Documentos adjuntos</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex justify-between items-center bg-kovex-surface/30 border border-kovex-border p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-kovex-muted" />
                  <span className="text-xs text-white">propuesta_comercial_v2.pdf</span>
                </div>
                <span className="text-[10px] text-kovex-muted">1.8 MB</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="relative border-l border-kovex-border ml-3 pl-6 space-y-5">
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 bg-kovex-surface w-4 h-4 rounded-full border border-kovex-primary/45 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-kovex-primary" />
            </span>
            <h5 className="text-xs font-bold text-white">Llamada de seguimiento</h5>
            <p className="text-[11px] text-kovex-muted mt-1 leading-normal">
              Agendada llamada para definir montos finales de depósito.
            </p>
            <span className="text-[9px] text-kovex-muted mt-1 block">Hoy, 10:15</span>
          </div>
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 bg-kovex-surface w-4 h-4 rounded-full border border-kovex-primary/45 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-kovex-primary" />
            </span>
            <h5 className="text-xs font-bold text-white">Demo completada</h5>
            <p className="text-[11px] text-kovex-muted mt-1 leading-normal">
              Se presentó plataforma de trading MT5 a cliente, muestra gran interés.
            </p>
            <span className="text-[9px] text-kovex-muted mt-1 block">Ayer, 12:45</span>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-kovex-border bg-kovex-elevated/20">
            <CheckSquare size={16} className="text-kovex-accent" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">Enviar borrador de contrato</p>
              <span className="text-[10px] text-kovex-muted block mt-1">Hoy, 17:00</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="relative border-l border-kovex-border ml-3 pl-6 space-y-5">
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 bg-kovex-surface w-4 h-4 rounded-full border border-kovex-primary/45 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-kovex-primary" />
            </span>
            <h5 className="text-xs font-bold text-white">Movido a {stageNames[deal.stage]}</h5>
            <p className="text-[11px] text-kovex-muted mt-1 leading-normal">
              Por Carlos Méndez.
            </p>
            <span className="text-[9px] text-kovex-muted mt-1 block">Hace 2 horas</span>
          </div>
        </div>
      )}
    </Drawer>
  );
}
