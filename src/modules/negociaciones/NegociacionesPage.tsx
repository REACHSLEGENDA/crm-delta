// modules/negociaciones/NegociacionesPage.tsx
import React, { useEffect, useState } from 'react';
import { useDealsStore } from './useDeals';
import { useProspectosStore } from '@/modules/prospectos/useProspectos';
import DealDrawer from './DealDrawer';
import Avatar from '@/components/shared/Avatar';
import Badge from '@/components/shared/Badge';
import { Plus, GitBranch, RefreshCw, Layers } from 'lucide-react';
import { Deal } from '@/types';
import { useNotificationsStore } from '@/store/notificationsStore';
import { usePermissions } from '@/hooks/usePermissions';

const STAGES = [
  { id: 'lead', name: 'Nuevo Lead', color: '#60A5FA' },
  { id: 'contact', name: 'Primer Contacto', color: '#A78BFA' },
  { id: 'int', name: 'Interesado', color: '#E91E8C' },
  { id: 'demo', name: 'Demo/Presentación', color: '#F59E0B' },
  { id: 'dep', name: 'Depósito Pendiente', color: '#00E5CC' },
  { id: 'won', name: 'Ganado', color: '#22C55E' },
  { id: 'lost', name: 'Perdido', color: '#EF4444' },
] as const;

export default function NegociacionesPage() {
  const store = useDealsStore();
  const leadsStore = useProspectosStore();
  const addToast = useNotificationsStore((state) => state.addToast);
  const permissions = usePermissions();

  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    store.fetchDeals();
    leadsStore.fetchLeads();
  }, []);

  // Sync leads references to deals
  const dealsWithLeads = store.deals.map((deal) => {
    return {
      ...deal,
      lead: leadsStore.leads.find((l) => l.id === deal.lead_id)
    };
  });

  // Native HTML5 drag handlers
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: Deal['stage']) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain');
    if (!dealId) return;

    const deal = store.deals.find((d) => d.id === dealId);
    if (deal) {
      if (!permissions.canEditDeal(deal.agent_id)) {
        addToast({
          title: 'Acceso Denegado',
          description: 'No tienes permisos para modificar negociaciones.',
          type: 'error',
        });
        return;
      }
      if (deal.stage !== targetStage) {
        await store.updateDealStage(dealId, targetStage);
        addToast({
          title: 'Etapa Actualizada',
          description: `${deal.lead?.full_name || 'Negociación'} movida a ${STAGES.find((s) => s.id === targetStage)?.name}.`,
          type: 'success',
        });
      }
    }
  };

  const totalAmount = store.deals
    .filter((d) => d.stage !== 'lost')
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const tempColors = {
    hot: 'bg-kovex-danger',
    warm: 'bg-kovex-warning',
    cold: 'bg-[#60A5FA]',
  };

  return (
    <div className="space-y-6 h-full flex flex-col select-none animate-fade-in text-kovex-text">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-white">Negociaciones</h1>
          <p className="text-xs text-kovex-muted mt-1">
            Pipeline en tiempo real · Total proyectado:{' '}
            <span className="font-mono text-kovex-accent font-bold">${totalAmount.toLocaleString()} USD</span>
          </p>
        </div>
        <button
          onClick={() => store.fetchDeals()}
          className="flex items-center gap-2 border border-kovex-border hover:bg-white/[0.02] text-xs font-semibold px-4 py-2.5 rounded-xl text-kovex-text transition-colors"
        >
          <RefreshCw size={14} /> Sincronizar
        </button>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto pb-4 flex gap-4 items-start h-[calc(100vh-210px)] min-h-[450px]">
        {STAGES.map((col) => {
          const colDeals = dealsWithLeads.filter((d) => d.stage === col.id);
          const colTotal = colDeals.reduce((sum, d) => sum + Number(d.amount), 0);

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="flex-shrink-0 w-72 bg-kovex-surface/20 border border-kovex-border rounded-2xl flex flex-col max-h-full"
            >
              {/* Column Header */}
              <div className="p-4 border-b border-kovex-border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="font-display font-bold text-xs text-white truncate max-w-[130px]">{col.name}</span>
                  <span className="bg-white/[0.04] border border-kovex-border text-kovex-muted text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {colDeals.length}
                  </span>
                </div>
                <span className="font-mono text-xs text-kovex-accent font-bold">${colTotal.toLocaleString()}</span>
              </div>

              {/* Column Body */}
              <div className="p-3 overflow-y-auto flex-1 space-y-3 min-h-[200px]">
                {colDeals.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-[10px] text-kovex-muted uppercase tracking-wider font-bold">
                    Arrastra aquí
                  </div>
                ) : (
                  colDeals.map((deal) => {
                    const days = Math.floor(Math.random() * 8) + 1; // Simulated days in stage
                    const canEdit = permissions.canEditDeal(deal.agent_id);
                    return (
                      <div
                        key={deal.id}
                        draggable={canEdit}
                        onDragStart={(e) => canEdit ? handleDragStart(e, deal.id) : e.preventDefault()}
                        onClick={() => {
                          setActiveDealId(deal.id);
                          setDrawerOpen(true);
                        }}
                        className={`bg-kovex-surface hover:bg-kovex-surface/80 border border-kovex-border rounded-xl p-3.5 hover:border-kovex-primary/40 transition-all relative overflow-hidden shadow-lg ${
                          canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold text-white leading-snug line-clamp-1 truncate max-w-[150px]">
                            {deal.lead?.full_name || 'Prospecto'}
                          </h4>
                          <span className="font-mono text-xs text-kovex-accent font-bold">
                            ${Number(deal.amount).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex justify-between items-center mt-4 text-[10px] text-kovex-muted">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${tempColors[deal.temperature]}`} />
                            <span className="font-semibold uppercase capitalize">{deal.temperature}</span>
                          </div>
                          <span>Hace {days}d</span>
                        </div>

                        <div className="flex items-center justify-between border-t border-kovex-border/30 pt-3 mt-3">
                          <span className="text-[10px] text-kovex-muted flex items-center gap-1">
                            <Layers size={10} /> AM
                          </span>
                          <Avatar name={deal.lead?.full_name || 'T'} size="sm" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAIL DRAWER */}
      <DealDrawer
        dealId={activeDealId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
