// modules/contactos/ContactosPage.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Contact, Deal } from '@/types';
import Avatar from '@/components/shared/Avatar';
import Badge from '@/components/shared/Badge';
import Drawer from '@/components/shared/Drawer';
import { 
  Grid, List, Search, Plus, Mail, Phone, Building, 
  Tag, AlertTriangle, FileText, Calendar, DollarSign 
} from 'lucide-react';
import { useNotificationsStore } from '@/store/notificationsStore';

export default function ContactosPage() {
  const addToast = useNotificationsStore((state) => state.addToast);

  // States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [contactDeals, setContactDeals] = useState<Deal[]>([]);

  // Duplicate state
  const [duplicateEmails, setDuplicateEmails] = useState<string[]>([]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('contacts').select('*').order('full_name');
      if (!error && data) {
        setContacts(data);
        detectDuplicates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const detectDuplicates = (list: Contact[]) => {
    const emails = list.map((c) => c.email.toLowerCase());
    const duplicates = emails.filter((item, index) => emails.indexOf(item) !== index);
    setDuplicateEmails([...new Set(duplicates)]);
  };

  const handleOpenContact = async (id: string) => {
    setActiveContactId(id);
    setDrawerOpen(true);
    
    // Fetch related deals
    const contact = contacts.find((c) => c.id === id);
    if (contact) {
      const { data: deals } = await supabase.from('deals').select('*').eq('agent_id', contact.agent_id);
      setContactDeals(deals || []);
    }
  };

  const activeContact = contacts.find((c) => c.id === activeContactId);

  const getAgentName = (id: string | null) => {
    switch (id) {
      case '00000000-0000-0000-0000-000000000003': return 'Carlos Méndez';
      case '00000000-0000-0000-0000-000000000004': return 'Valeria Soto';
      case '00000000-0000-0000-0000-000000000001': return 'Diego Ramírez';
      default: return 'Sin asignar';
    }
  };

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    const matchQuery = 
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery));
    
    const matchTag = !selectedTag || c.tags.includes(selectedTag);

    return matchQuery && matchTag;
  });

  const allTags = ['Trader', 'Inversor', 'Institucional', 'VIP'];

  return (
    <div className="space-y-6 select-none animate-fade-in text-kovex-text">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-white">Contactos</h1>
          <p className="text-xs text-kovex-muted mt-1">
            Base activa · {contacts.length} contactos
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {/* List / Grid Toggle */}
          <div className="flex bg-[#0F1525] border border-kovex-border rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-kovex-elevated text-white' : 'text-kovex-muted'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-kovex-elevated text-white' : 'text-kovex-muted'}`}
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={() => addToast({ title: 'Nuevo Contacto', description: 'Abrir formulario...', type: 'info' })}
            className="flex items-center gap-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-xs font-bold px-4 py-2.5 rounded-xl text-white transition-all shadow-lg"
          >
            <Plus size={14} /> Nuevo Contacto
          </button>
        </div>
      </div>

      {/* Duplicate warning alert */}
      {duplicateEmails.length > 0 && (
        <div className="flex gap-3 bg-kovex-danger/10 border border-kovex-danger/20 p-4 rounded-2xl">
          <AlertTriangle className="text-kovex-danger flex-shrink-0" size={18} />
          <div>
            <h4 className="text-xs font-bold text-white">Contactos Duplicados Detectados</h4>
            <p className="text-xs text-kovex-muted mt-1">
              Los siguientes correos electrónicos aparecen en múltiples contactos:{' '}
              <span className="text-kovex-danger font-mono font-bold">{duplicateEmails.join(', ')}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-[#0F1525]/40 border border-kovex-border p-4 rounded-2xl">
        <div className="relative w-64">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-kovex-muted">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre, correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-kovex-bg border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl py-2 pl-9 pr-4 text-xs outline-none transition-all"
          />
        </div>

        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="bg-kovex-bg border border-kovex-border text-white text-xs rounded-xl px-3 py-2 outline-none"
        >
          <option value="">Todas las etiquetas</option>
          {allTags.map((t) => (
            <option key={t} value={t} className="bg-kovex-surface">{t}</option>
          ))}
        </select>
      </div>

      {/* Main Grid/List Render */}
      {loading ? (
        <div className="text-center p-12 text-kovex-muted text-xs">Cargando contactos...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center p-12 text-kovex-muted text-xs">No se encontraron contactos</div>
      ) : viewMode === 'grid' ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((c) => (
            <div
              key={c.id}
              onClick={() => handleOpenContact(c.id)}
              className="bg-[#0F1525]/30 border border-kovex-border hover:border-kovex-primary/30 p-5 rounded-2xl backdrop-blur-md cursor-pointer hover:-translate-y-0.5 transition-all shadow-lg flex flex-col justify-between"
            >
              <div className="flex items-center gap-4">
                <Avatar name={c.full_name} size="md" />
                <div>
                  <h4 className="font-bold text-white text-sm leading-snug">{c.full_name}</h4>
                  <span className="text-[10px] text-kovex-muted flex items-center gap-1.5 uppercase mt-0.5 font-semibold">
                    <Building size={10} /> {c.company || 'Independiente'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-xs text-kovex-muted">
                  <Mail size={12} /> <span className="truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-kovex-muted">
                  <Phone size={12} /> <span className="font-mono">{c.phone || '—'}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-4 border-t border-kovex-border/30 pt-3">
                {c.tags.map((t) => (
                  <Badge key={t} variant={t === 'VIP' ? 'success' : t === 'Trader' ? 'accent' : t === 'Inversor' ? 'warning' : 'primary'}>
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List Layout */
        <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-kovex-border bg-white/[0.015]">
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Nombre</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Empresa</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Email</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Teléfono</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Etiquetas</th>
                <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Agente</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => handleOpenContact(c.id)}
                  className="border-b border-kovex-border/30 hover:bg-kovex-primary/[0.04] transition-all cursor-pointer"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.full_name} size="sm" />
                      <span className="font-bold text-sm text-white">{c.full_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs text-kovex-text">{c.company || '—'}</td>
                  <td className="p-4 text-xs text-kovex-muted">{c.email}</td>
                  <td className="p-4 text-xs text-kovex-muted font-mono">{c.phone || '—'}</td>
                  <td className="p-4 text-xs">
                    <div className="flex gap-1.5">
                      {c.tags.map((t) => (
                        <Badge key={t} variant={t === 'VIP' ? 'success' : t === 'Trader' ? 'accent' : t === 'Inversor' ? 'warning' : 'primary'}>
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-xs text-kovex-text">{getAgentName(c.agent_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL DRAWER */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={activeContact?.full_name || 'Expediente del Cliente'}
        subtitle={
          <div className="flex items-center gap-1.5 text-xs text-kovex-muted">
            <Building size={12} /> {activeContact?.company || 'Independiente'}
          </div>
        }
        headerIcon={activeContact && <Avatar name={activeContact.full_name} />}
        footerActions={
          <>
            <button
              onClick={() => setDrawerOpen(false)}
              className="px-4 py-2 border border-kovex-border hover:bg-white/[0.02] text-xs font-semibold rounded-xl text-white transition-colors"
            >
              Cerrar Expediente
            </button>
            <button
              onClick={() => addToast({ title: 'Llamar', description: 'Iniciando discador...', type: 'success' })}
              className="px-4 py-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-xs font-bold rounded-xl text-white transition-all"
            >
              Llamar
            </button>
          </>
        }
      >
        {activeContact && (
          <div className="space-y-6">
            {/* Tag Pills */}
            <div className="flex flex-wrap gap-1.5">
              {activeContact.tags.map((t) => (
                <Badge key={t} variant={t === 'VIP' ? 'success' : t === 'Trader' ? 'accent' : t === 'Inversor' ? 'warning' : 'primary'}>
                  {t}
                </Badge>
              ))}
            </div>

            {/* General Info */}
            <div className="bg-kovex-surface/40 border border-kovex-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-kovex-muted flex items-center gap-1.5"><Mail size={12} /> Email</span>
                <span className="text-white font-medium">{activeContact.email}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-kovex-muted flex items-center gap-1.5"><Phone size={12} /> Teléfono</span>
                <span className="text-white font-mono">{activeContact.phone || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-kovex-muted flex items-center gap-1.5"><Building size={12} /> Empresa</span>
                <span className="text-white font-medium">{activeContact.company || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-kovex-muted flex items-center gap-1.5"><Calendar size={12} /> Alta</span>
                <span className="text-white font-medium">{new Date(activeContact.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Linked Deals */}
            <div>
              <h4 className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider mb-2.5">Negociaciones asociadas</h4>
              <div className="space-y-2">
                {contactDeals.length === 0 ? (
                  <div className="text-xs text-kovex-muted bg-white/[0.01] border border-kovex-border p-4 rounded-xl text-center">
                    Sin negociaciones en curso
                  </div>
                ) : (
                  contactDeals.map((deal) => (
                    <div key={deal.id} className="bg-kovex-surface/60 border border-kovex-border p-3.5 rounded-xl flex justify-between items-center">
                      <div>
                        <h5 className="text-xs font-bold text-white">Depósito de fondos MT5</h5>
                        <span className="text-[10px] text-kovex-muted mt-0.5 capitalize block">
                          Etapa: {deal.stage} · {deal.temperature}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-kovex-accent font-bold">${Number(deal.amount).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Docs Accordion */}
            <div>
              <h4 className="text-[10px] text-kovex-muted uppercase font-bold tracking-wider mb-2.5">Documentos</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-[#0F1525]/30 border border-kovex-border p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-kovex-muted" />
                    <span className="text-xs text-white">kyc_aprobado.pdf</span>
                  </div>
                  <Badge variant="success">Aprobado</Badge>
                </div>
                <div className="flex justify-between items-center bg-[#0F1525]/30 border border-kovex-border p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-kovex-muted" />
                    <span className="text-xs text-white">contrato_firmado.pdf</span>
                  </div>
                  <Badge variant="gray">Pendiente Firma</Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
