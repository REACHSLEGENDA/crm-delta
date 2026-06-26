import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Deal, Lead, Profile, DealStage, DealTemperature } from '../types';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  DollarSign, 
  Trash2,
  X 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PipelineProps {
  currentProfile: Profile | null;
}

const STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: '#8a99ad' },
  { value: 'contact', label: 'Contacto', color: '#60a5fa' },
  { value: 'int', label: 'Interesado', color: '#a855f7' },
  { value: 'demo', label: 'Demo', color: '#f59e0b' },
  { value: 'dep', label: 'Depósito', color: '#06b6d4' },
  { value: 'won', label: 'Ganado 🎉', color: '#10b981' },
  { value: 'lost', label: 'Perdido ❌', color: '#ef4444' }
];

export default function Pipeline({ currentProfile }: PipelineProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Deal Form
  const [formLeadId, setFormLeadId] = useState('');
  const [formAmount, setFormAmount] = useState(0);
  const [formStage, setFormStage] = useState<DealStage>('lead');
  const [formTemp, setFormTemp] = useState<DealTemperature>('warm');
  const [formCloseDate, setFormCloseDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchDeals();
    fetchLeads();
  }, []);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*, lead:lead_id(*), agent:agent_id(full_name)')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (err) {
      console.error('Error fetching deals:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLeadId) {
      setFormError('Por favor selecciona un prospecto.');
      return;
    }
    setSubmitting(true);
    setFormError('');

    try {
      const selectedLead = leads.find(l => l.id === formLeadId);

      const { data, error } = await supabase
        .from('deals')
        .insert({
          lead_id: formLeadId,
          amount: formAmount,
          stage: formStage,
          temperature: formTemp,
          expected_close: formCloseDate || null,
          agent_id: selectedLead?.agent_id || currentProfile?.id || null
        })
        .select()
        .single();

      if (error) throw error;

      if (formStage === 'won') {
        triggerConfetti();
      }

      // Log activity
      if (currentProfile && selectedLead) {
        await supabase.from('activities').insert({
          entity_type: 'deal',
          entity_id: data.id,
          type: 'creation',
          description: `Negocio creado para ${selectedLead.full_name} por $${formAmount}`,
          created_by: currentProfile.id
        });
      }

      setFormLeadId('');
      setFormAmount(0);
      setFormStage('lead');
      setFormTemp('warm');
      setFormCloseDate('');
      setShowAddModal(false);
      fetchDeals();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Error al crear la negociación.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveStage = async (dealId: string, currentStage: DealStage, direction: 'left' | 'right') => {
    const currentIndex = STAGES.findIndex(s => s.value === currentStage);
    let nextIndex = currentIndex + (direction === 'left' ? -1 : 1);
    
    if (nextIndex < 0 || nextIndex >= STAGES.length) return;
    const nextStage = STAGES[nextIndex].value;

    try {
      const { error } = await supabase
        .from('deals')
        .update({ stage: nextStage, updated_at: new Date().toISOString() })
        .eq('id', dealId);

      if (error) throw error;

      if (nextStage === 'won') {
        triggerConfetti();
      }

      // Log activity
      if (currentProfile) {
        await supabase.from('activities').insert({
          entity_type: 'deal',
          entity_id: dealId,
          type: 'stage_change',
          description: `Negocio movido a etapa: ${STAGES[nextIndex].label}`,
          created_by: currentProfile.id
        });
      }

      fetchDeals();
    } catch (err) {
      console.error('Error changing stage:', err);
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!window.confirm('¿Desea eliminar este negocio?')) return;
    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);

      if (error) throw error;
      fetchDeals();
    } catch (err) {
      console.error('Error deleting deal:', err);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#D4AF37', '#C5A059', '#E5C453', '#0A1128', '#FFFFFF']
    });
  };

  const getTempStyles = (temp: DealTemperature) => {
    switch (temp) {
      case 'hot': return { color: '#ef4444', label: 'Caliente' };
      case 'warm': return { color: '#f59e0b', label: 'Tibio' };
      case 'cold': return { color: '#60a5fa', label: 'Frío' };
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700 }} className="gold-gradient-text">Pipeline de Negocios</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Mueve los negocios a través de sus fases de conversión e ingresa depósitos.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="gold-button">
          <Plus size={18} /> Crear Negocio
        </button>
      </div>

      {/* Stable Loader */}
      <div className={loading ? "flex" : "hidden"} style={{ padding: '60px', justifyContent: 'center' }}>
        <span>Cargando embudo de ventas...</span>
      </div>

      {/* Kanban Board */}
      <div 
        className={loading ? "hidden" : "flex"} 
        style={{ 
          gap: '15px', 
          overflowX: 'auto', 
          paddingBottom: '20px', 
          minHeight: '65vh',
          alignItems: 'flex-start'
        }}
      >
        {STAGES.map((col) => {
          const colDeals = deals.filter(d => d.stage === col.value);
          const colTotal = colDeals.reduce((sum, d) => sum + Number(d.amount), 0);

          return (
            <div 
              key={col.value} 
              className="glass-panel" 
              style={{
                flexShrink: 0,
                width: '280px',
                padding: '16px 12px',
                backgroundColor: 'rgba(14, 21, 37, 0.8)',
                borderTop: `3px solid ${col.color}`
              }}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)' }}>
                  {col.label}
                </h4>
                <span className="badge badge-gold" style={{ fontSize: '10px' }}>
                  {colDeals.length}
                </span>
              </div>
              
              {/* Total volume */}
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '15px', padding: '0 4px' }}>
                Volumen: <strong style={{ color: 'var(--text-gold)' }}>${colTotal.toLocaleString()}</strong>
              </div>

              {/* Cards Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '300px' }}>
                {colDeals.map((deal) => {
                  const tempInfo = getTempStyles(deal.temperature);

                  return (
                    <div 
                      key={deal.id}
                      style={{
                        padding: '14px',
                        backgroundColor: 'var(--bg-dark-input)',
                        border: '1px solid var(--border-dark)',
                        borderRadius: '8px',
                        position: 'relative'
                      }}
                    >
                      {/* Trash */}
                      <button 
                        onClick={() => handleDeleteDeal(deal.id)}
                        style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} />
                      </button>

                      <h5 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-white)', marginRight: '20px', marginBottom: '8px' }}>
                        {deal.lead?.full_name || 'Prospecto Desconocido'}
                      </h5>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-gold)', marginBottom: '8px', fontWeight: 600 }}>
                        <DollarSign size={13} />
                        <span>{Number(deal.amount).toLocaleString()}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-dark)', paddingTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: tempInfo.color }}>
                          <Flame size={12} fill={tempInfo.color} />
                          <span>{tempInfo.label}</span>
                        </div>
                        
                        {/* Navigation actions */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            onClick={() => handleMoveStage(deal.id, deal.stage, 'left')}
                            disabled={deal.stage === 'lead'}
                            style={{ padding: '3px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '3px', cursor: 'pointer' }}
                          >
                            <ChevronLeft size={12} />
                          </button>
                          <button 
                            onClick={() => handleMoveStage(deal.id, deal.stage, 'right')}
                            disabled={deal.stage === 'lost' || deal.stage === 'won'}
                            style={{ padding: '3px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '3px', cursor: 'pointer' }}
                          >
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Deal Modal (Safe toggling) */}
      <div 
        className={showAddModal ? "flex" : "hidden"}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          zIndex: 200,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '500px',
          padding: '30px',
          border: '1px solid var(--border-gold)',
          position: 'relative'
        }}>
          {/* Close */}
          <button 
            onClick={() => setShowAddModal(false)} 
            style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>

          <h3 className="gold-gradient-text" style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Crear Negociación</h3>

          <form onSubmit={handleCreateDeal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Prospecto (Lead)</label>
              <select className="text-input" required value={formLeadId} onChange={(e) => setFormLeadId(e.target.value)}>
                <option value="">Selecciona un Lead...</option>
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>{lead.full_name} (${Number(lead.investment_amount).toLocaleString()})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Monto del Negocio ($)</label>
              <input type="number" className="text-input" required value={formAmount} onChange={(e) => setFormAmount(Number(e.target.value))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Etapa Inicial</label>
                <select className="text-input" value={formStage} onChange={(e) => setFormStage(e.target.value as DealStage)}>
                  {STAGES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Temperatura</label>
                <select className="text-input" value={formTemp} onChange={(e) => setFormTemp(e.target.value as DealTemperature)}>
                  <option value="cold">Frío ❄️</option>
                  <option value="warm">Tibio 🔥</option>
                  <option value="hot">Caliente 🌋</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Cierre Esperado</label>
              <input type="date" className="text-input" value={formCloseDate} onChange={(e) => setFormCloseDate(e.target.value)} />
            </div>

            {/* Error handling stable DOM */}
            <div className={formError ? "flex" : "hidden"} style={{ color: 'var(--text-error)', fontSize: '13px', gap: '6px' }}>
              <span>❌ {formError}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button type="button" className="secondary-button" onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button type="submit" className="gold-button" disabled={submitting}>
                <span className={submitting ? "hidden" : "flex"}>Guardar Negocio</span>
                <span className={submitting ? "flex" : "hidden"}>Guardando...</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
