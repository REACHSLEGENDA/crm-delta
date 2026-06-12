// modules/prospectos/ProspectosPage.tsx
import React, { useEffect, useState } from 'react';
import { useProspectosStore } from './useProspectos';
import ProspectoForm from './ProspectoForm';
import ProspectoDrawer from './ProspectoDrawer';
import Badge from '@/components/shared/Badge';
import Avatar from '@/components/shared/Avatar';
import Modal from '@/components/shared/Modal';
import { Plus, Search, Filter, Trash2, UserCheck, RefreshCw, X, ChevronRight } from 'lucide-react';
import { Lead } from '@/types';

export default function ProspectosPage() {
  const store = useProspectosStore();
  
  // Local states
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  
  const [batchActionOpen, setBatchActionOpen] = useState(false);

  useEffect(() => {
    store.fetchLeads();
  }, []);

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setDrawerOpen(false);
    setFormOpen(true);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      store.setSelectedLeadIds(filteredLeads.map((l) => l.id));
    } else {
      store.setSelectedLeadIds([]);
    }
  };

  // Filter leads locally
  const filteredLeads = store.leads.filter((lead) => {
    // Search query
    const matchSearch = 
      lead.full_name.toLowerCase().includes(store.searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(store.searchQuery.toLowerCase()) ||
      (lead.phone && lead.phone.includes(store.searchQuery));
    
    // Status filter
    const matchStatus = 
      store.filterStatus.length === 0 || 
      store.filterStatus.includes(lead.status);

    // Source filter
    const matchSource = 
      store.filterSource.length === 0 || 
      store.filterSource.includes(lead.source);

    // Agent filter
    const matchAgent = 
      !store.filterAgent || 
      lead.agent_id === store.filterAgent;

    return matchSearch && matchStatus && matchSource && matchAgent;
  });

  const getAgentName = (id: string | null) => {
    switch (id) {
      case '00000000-0000-0000-0000-000000000003': return 'Carlos M.';
      case '00000000-0000-0000-0000-000000000004': return 'Valeria S.';
      case '00000000-0000-0000-0000-000000000001': return 'Diego R.';
      default: return 'Sin asignar';
    }
  };

  const countriesShort = {
    'México': 'MX',
    'Colombia': 'CO',
    'Argentina': 'AR',
    'Chile': 'CL',
    'Perú': 'PE'
  };

  return (
    <div className="space-y-6 select-none animate-fade-in text-kovex-text">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-white">Prospectos</h1>
          <p className="text-xs text-kovex-muted mt-1">
            {filteredLeads.length} registros filtrados · {store.leads.filter(l => l.status === 'Nuevo').length} sin contactar
          </p>
        </div>
        <button
          onClick={() => { setEditingLead(null); setFormOpen(true); }}
          className="flex items-center gap-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-xs font-bold px-4 py-2.5 rounded-xl text-white transition-all shadow-lg shadow-kovex-primary/10"
        >
          <Plus size={14} /> Nuevo Prospecto
        </button>
      </div>

      {/* Toolbar Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0F1525]/40 border border-kovex-border p-4 rounded-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search bar */}
          <div className="relative w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-kovex-muted">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar..."
              value={store.searchQuery}
              onChange={(e) => store.setSearchQuery(e.target.value)}
              className="w-full bg-kovex-bg border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl py-2 pl-9 pr-4 text-xs outline-none transition-all"
            />
          </div>

          {/* Status select */}
          <select
            value={store.filterStatus[0] || ''}
            onChange={(e) => store.setFilterStatus(e.target.value ? [e.target.value] : [])}
            className="bg-kovex-bg border border-kovex-border text-white text-xs rounded-xl px-3 py-2 outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="Nuevo">Nuevo</option>
            <option value="Contactado">Contactado</option>
            <option value="Calificado">Calificado</option>
            <option value="Descartado">Descartado</option>
          </select>

          {/* Source select */}
          <select
            value={store.filterSource[0] || ''}
            onChange={(e) => store.setFilterSource(e.target.value ? [e.target.value] : [])}
            className="bg-kovex-bg border border-kovex-border text-white text-xs rounded-xl px-3 py-2 outline-none"
          >
            <option value="">Todas las fuentes</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Web">Web</option>
            <option value="Referido">Referido</option>
            <option value="Llamada">Llamada</option>
          </select>

          {/* Agent select */}
          <select
            value={store.filterAgent}
            onChange={(e) => store.setFilterAgent(e.target.value)}
            className="bg-kovex-bg border border-kovex-border text-white text-xs rounded-xl px-3 py-2 outline-none"
          >
            <option value="">Todos los agentes</option>
            <option value="00000000-0000-0000-0000-000000000003">Carlos Méndez</option>
            <option value="00000000-0000-0000-0000-000000000004">Valeria Soto</option>
            <option value="00000000-0000-0000-0000-000000000001">Diego Ramírez</option>
          </select>

          {/* Reset Filters button */}
          {(store.searchQuery || store.filterStatus.length > 0 || store.filterSource.length > 0 || store.filterAgent) && (
            <button
              onClick={() => {
                store.setSearchQuery('');
                store.setFilterStatus([]);
                store.setFilterSource([]);
                store.setFilterAgent('');
              }}
              className="flex items-center gap-1.5 text-xs text-kovex-primary hover:text-[#FF7AC2] transition-colors"
            >
              <X size={14} /> Limpiar filtros
            </button>
          )}
        </div>

        {/* Batch Operations */}
        {store.selectedLeadIds.length > 0 && (
          <div className="flex items-center gap-2 animate-fade-in">
            <span className="text-xs text-kovex-muted font-semibold">{store.selectedLeadIds.length} seleccionados</span>
            <button
              onClick={() => setBatchActionOpen(true)}
              className="flex items-center gap-1.5 bg-kovex-elevated border border-kovex-border hover:bg-white/[0.04] text-xs font-bold px-3 py-2 rounded-xl text-white transition-all"
            >
              <UserCheck size={14} /> Acciones en Lote
            </button>
          </div>
        )}
      </div>

      {/* Leads Table Card */}
      <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-kovex-border bg-white/[0.015]">
              <th className="p-4 w-12">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={filteredLeads.length > 0 && store.selectedLeadIds.length === filteredLeads.length}
                  className="w-4 h-4 rounded accent-kovex-primary bg-kovex-bg border-kovex-border"
                />
              </th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Nombre</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Email</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Teléfono</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">País</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Fuente</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Estado</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Agente</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Score</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider w-12">Detalles</th>
            </tr>
          </thead>
          <tbody>
            {store.loading ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-kovex-muted text-xs">Cargando leads...</td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-kovex-muted text-xs">No se encontraron prospectos</td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const selected = store.selectedLeadIds.includes(lead.id);
                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-kovex-border/30 hover:bg-kovex-primary/[0.04] transition-all cursor-pointer ${
                      selected ? 'bg-kovex-primary/[0.02]' : ''
                    }`}
                    onClick={() => { setSelectedLeadId(lead.id); setDrawerOpen(true); }}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => store.toggleSelectLead(lead.id)}
                        className="w-4 h-4 rounded accent-kovex-primary bg-kovex-bg border-kovex-border"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={lead.full_name} size="sm" />
                        <span className="font-bold text-sm text-white">{lead.full_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-kovex-muted">{lead.email}</td>
                    <td className="p-4 text-xs text-kovex-muted font-mono">{lead.phone || '—'}</td>
                    <td className="p-4 text-xs font-bold text-white">
                      <Badge variant="gray">{countriesShort[lead.country as keyof typeof countriesShort] || '—'}</Badge>
                    </td>
                    <td className="p-4 text-xs">
                      <Badge variant="gray">{lead.source}</Badge>
                    </td>
                    <td className="p-4 text-xs">
                      <Badge variant={lead.status === 'Nuevo' ? 'accent' : lead.status === 'Calificado' ? 'success' : lead.status === 'Contactado' ? 'warning' : 'danger'}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs text-kovex-text">{getAgentName(lead.agent_id)}</td>
                    <td className="p-4 font-mono font-bold text-xs text-kovex-accent">{lead.score}</td>
                    <td className="p-4 text-kovex-muted hover:text-white">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FORM MODAL */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingLead ? 'Editar Prospecto' : 'Nuevo Prospecto'}
      >
        <ProspectoForm
          lead={editingLead}
          onClose={() => setFormOpen(false)}
        />
      </Modal>

      {/* DETAIL DRAWER */}
      <ProspectoDrawer
        leadId={selectedLeadId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={handleOpenEdit}
      />

      {/* BATCH ACTION MODAL */}
      <Modal
        isOpen={batchActionOpen}
        onClose={() => setBatchActionOpen(false)}
        title="Acciones en Lote"
      >
        <div className="space-y-4">
          <p className="text-xs text-kovex-muted">
            Aplica un cambio a los {store.selectedLeadIds.length} prospectos seleccionados.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">Reasignar Agente</label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    store.batchUpdateAgent(e.target.value);
                    setBatchActionOpen(false);
                  }
                }}
                className="w-full bg-kovex-bg border border-kovex-border text-white text-xs rounded-xl p-3 outline-none"
              >
                <option value="">Seleccionar agente</option>
                <option value="00000000-0000-0000-0000-000000000003">Carlos Méndez</option>
                <option value="00000000-0000-0000-0000-000000000004">Valeria Soto</option>
                <option value="00000000-0000-0000-0000-000000000001">Diego Ramírez</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">Cambiar Estado</label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    store.batchUpdateStatus(e.target.value as Lead['status']);
                    setBatchActionOpen(false);
                  }
                }}
                className="w-full bg-kovex-bg border border-kovex-border text-white text-xs rounded-xl p-3 outline-none"
              >
                <option value="">Seleccionar estado</option>
                <option value="Nuevo">Nuevo</option>
                <option value="Contactado">Contactado</option>
                <option value="Calificado">Calificado</option>
                <option value="Descartado">Descartado</option>
              </select>
            </div>
          </div>
          <div className="pt-4 border-t border-kovex-border flex justify-between">
            <button
              onClick={() => {
                if (confirm('¿Estás seguro de que deseas eliminar en lote?')) {
                  store.deleteSelectedLeads();
                  setBatchActionOpen(false);
                }
              }}
              className="flex items-center gap-1.5 text-xs text-kovex-danger font-bold hover:underline"
            >
              <Trash2 size={14} /> Eliminar seleccionados
            </button>
            <button
              onClick={() => setBatchActionOpen(false)}
              className="px-4 py-2 border border-kovex-border text-xs rounded-xl text-white"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
