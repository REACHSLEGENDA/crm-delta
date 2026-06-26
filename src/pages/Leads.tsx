import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Lead, Profile, LeadComment, LeadSource, LeadStatus } from '../types';
import { 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Send, 
  Trash2, 
  X 
} from 'lucide-react';

interface LeadsProps {
  currentProfile: Profile | null;
}

export default function Leads({ currentProfile }: LeadsProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals visibility toggling (Safe from translation errors)
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  
  // Selected Lead Details
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [comments, setComments] = useState<LeadComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);

  // New Lead Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formSource, setFormSource] = useState<LeadSource>('WhatsApp');
  const formStatus: LeadStatus = 'Nuevo';
  const [formScore, setFormScore] = useState(50);
  const [formInvestment, setFormInvestment] = useState(0);
  const [formAgentId, setFormAgentId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchAgents();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, agent:agent_id(full_name, id, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      if (error) throw error;
      setAgents(data || []);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const fetchComments = async (leadId: string) => {
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lead_comments')
        .select('*, author:author_id(full_name)')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const payload: any = {
        full_name: formName,
        email: formEmail,
        phone: formPhone || null,
        country: formCountry || null,
        source: formSource,
        status: formStatus,
        score: formScore,
        investment_amount: formInvestment,
        notes: formNotes || null
      };

      if (formAgentId) {
        payload.agent_id = formAgentId;
      }

      const { data: newLead, error } = await supabase
        .from('leads')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Log system activity
      if (newLead && currentProfile) {
        await supabase.from('activities').insert({
          entity_type: 'lead',
          entity_id: newLead.id,
          type: 'creation',
          description: `Lead ${newLead.full_name} creado.`,
          created_by: currentProfile.id
        });
      }

      // Reset form
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormCountry('');
      setFormAgentId('');
      setFormNotes('');
      setFormInvestment(0);
      setFormScore(50);
      setShowAddModal(false);
      
      // Refresh list
      fetchLeads();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Error al guardar el prospecto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailsPanel(true);
    fetchComments(lead.id);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedLead || !currentProfile) return;

    try {
      const { data, error } = await supabase
        .from('lead_comments')
        .insert({
          lead_id: selectedLead.id,
          author_id: currentProfile.id,
          content: newComment
        })
        .select('*, author:author_id(full_name)')
        .single();

      if (error) throw error;

      // Add comment to list
      setComments([...comments, data]);
      setNewComment('');

      // Add system activity log
      await supabase.from('activities').insert({
        entity_type: 'lead',
        entity_id: selectedLead.id,
        type: 'comment',
        description: `${currentProfile.full_name} comentó en el lead ${selectedLead.full_name}`,
        created_by: currentProfile.id
      });
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleUpdateAgent = async (agentId: string) => {
    if (!selectedLead) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ agent_id: agentId || null })
        .eq('id', selectedLead.id);

      if (error) throw error;

      const updatedLead = { ...selectedLead, agent_id: agentId || undefined };
      setSelectedLead(updatedLead);
      
      // Log activity
      if (currentProfile) {
        const agentName = agents.find(a => a.id === agentId)?.full_name || 'Ninguno';
        await supabase.from('activities').insert({
          entity_type: 'lead',
          entity_id: selectedLead.id,
          type: 'assignment',
          description: `Lead asignado a ${agentName}`,
          created_by: currentProfile.id
        });
      }

      fetchLeads();
    } catch (err) {
      console.error('Error updating agent:', err);
    }
  };

  const handleUpdateStatus = async (status: LeadStatus) => {
    if (!selectedLead) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', selectedLead.id);

      if (error) throw error;

      setSelectedLead({ ...selectedLead, status });

      // Log activity
      if (currentProfile) {
        await supabase.from('activities').insert({
          entity_type: 'lead',
          entity_id: selectedLead.id,
          type: 'status_change',
          description: `Estado actualizado a ${status}`,
          created_by: currentProfile.id
        });
      }

      fetchLeads();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead || !window.confirm('¿Está seguro de eliminar este prospecto? Se eliminarán también sus negociaciones y comentarios.')) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', selectedLead.id);

      if (error) throw error;

      setShowDetailsPanel(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter(lead => {
    const term = searchTerm.toLowerCase();
    return (
      lead.full_name.toLowerCase().includes(term) ||
      lead.email.toLowerCase().includes(term) ||
      (lead.phone && lead.phone.includes(term)) ||
      (lead.country && lead.country.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ position: 'relative', minHeight: '85vh' }}>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700 }} className="gold-gradient-text">Prospectos (Leads)</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Crea, califica y asigna prospectos del embudo de Delta Capital.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="gold-button">
          <Plus size={18} /> Agregar Lead
        </button>
      </div>

      {/* Control Bar: Search & Count */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="text-input"
            style={{ paddingLeft: '40px' }}
            placeholder="Buscar por nombre, email, teléfono o país..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Total filtrados: <strong style={{ color: 'var(--text-gold)' }}>{filteredLeads.length}</strong>
        </div>
      </div>

      {/* Grid of Leads */}
      {/* Loading state stable DOM */}
      <div className={loading ? "flex" : "hidden"} style={{ padding: '60px', justifyContent: 'center', fontSize: '16px' }}>
        <span>Cargando prospectos...</span>
      </div>

      <div className={loading ? "hidden" : "grid"} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {filteredLeads.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }} className="glass-panel">
            Ningún lead coincide con el criterio de búsqueda.
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div 
              key={lead.id} 
              className="glass-panel lead-card-hover" 
              onClick={() => handleLeadClick(lead)}
              style={{ 
                padding: '20px', 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                borderLeft: lead.status === 'Calificado' ? '4px solid #34d399' : '1px solid var(--border-gold-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-white)' }}>{lead.full_name}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lead.email}</span>
                </div>
                <span className={`badge ${
                  lead.status === 'Nuevo' ? 'badge-gold' : 
                  lead.status === 'Contactado' ? 'badge-info' : 
                  lead.status === 'Calificado' ? 'badge-success' : 'badge-danger'
                }`}>
                  {lead.status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-dark)', paddingTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between' }}>
                  <span>Origen: <strong style={{ color: 'var(--text-gold)' }}>{lead.source}</strong></span>
                  <span>Score: <strong style={{ color: 'var(--text-gold)' }}>{lead.score} pts</strong></span>
                </div>
                <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between' }}>
                  <span>Inversión: <strong>${Number(lead.investment_amount).toLocaleString()}</strong></span>
                  <span>Agente: <strong>{lead.agent?.full_name || 'Sin asignar'}</strong></span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Side Details Panel (Safe toggling) */}
      <div 
        className={showDetailsPanel && selectedLead ? "flex" : "hidden"} 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '500px',
          height: '100vh',
          backgroundColor: 'var(--bg-dark-panel)',
          borderLeft: '1px solid var(--border-gold)',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          zIndex: 150,
          flexDirection: 'column'
        }}
      >
        {selectedLead && (
          <>
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="gold-gradient-text" style={{ fontSize: '20px', fontWeight: 700 }}>Detalles del Lead</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Creado el {new Date(selectedLead.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={handleDeleteLead} style={{ background: 'none', border: 'none', color: 'var(--text-error)', cursor: 'pointer', padding: '6px' }} title="Eliminar Lead">
                  <Trash2 size={18} />
                </button>
                <button onClick={() => setShowDetailsPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
              {/* Profile card */}
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '18px', fontWeight: 600 }}>{selectedLead.full_name}</h4>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <Mail size={14} style={{ color: 'var(--text-gold)' }} />
                  <span>{selectedLead.email}</span>
                </div>
                {selectedLead.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    <Phone size={14} style={{ color: 'var(--text-gold)' }} />
                    <span>{selectedLead.phone}</span>
                  </div>
                )}
                {selectedLead.country && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    <MapPin size={14} style={{ color: 'var(--text-gold)' }} />
                    <span>{selectedLead.country}</span>
                  </div>
                )}
              </div>

              {/* Status & Agent Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-gold)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Estado</label>
                  <select 
                    className="text-input" 
                    value={selectedLead.status} 
                    onChange={(e) => handleUpdateStatus(e.target.value as LeadStatus)}
                  >
                    <option value="Nuevo">Nuevo</option>
                    <option value="Contactado">Contactado</option>
                    <option value="Calificado">Calificado</option>
                    <option value="Descartado">Descartado</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-gold)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Agente Asignado</label>
                  <select 
                    className="text-input" 
                    value={selectedLead.agent_id || ''} 
                    onChange={(e) => handleUpdateAgent(e.target.value)}
                  >
                    <option value="">Sin Asignar</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Financial metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Monto Estimado</span>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-gold)', marginTop: '4px' }}>
                    ${Number(selectedLead.investment_amount).toLocaleString()}
                  </p>
                </div>
                <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Score Comercial</span>
                  <p style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>
                    {selectedLead.score} / 100
                  </p>
                </div>
              </div>

              {/* Comments Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, borderBottom: '1px solid var(--border-dark)', paddingBottom: '8px' }}>
                  Notas y Comentarios
                </h4>

                {/* Comment list */}
                <div className={commentsLoading ? "flex" : "hidden"} style={{ justifyContent: 'center', padding: '10px' }}>
                  <span>Cargando comentarios...</span>
                </div>

                <div 
                  className={commentsLoading ? "hidden" : "flex"} 
                  style={{ flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}
                >
                  {comments.length === 0 ? (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', display: 'block', padding: '10px' }}>
                      No hay comentarios aún. Escribe el primero abajo.
                    </span>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} style={{ padding: '10px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-dark)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-gold)', marginBottom: '4px' }}>
                          <strong>{c.author?.full_name || 'Sistema'}</strong>
                          <span>{new Date(c.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-white)' }}>{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Form */}
                <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Escribe una nota sobre este prospecto..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button type="submit" className="gold-button" style={{ padding: '10px' }}>
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Lead Dialog Modal (Safe toggling) */}
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
          maxWidth: '600px',
          padding: '30px',
          border: '1px solid var(--border-gold)',
          position: 'relative'
        }}>
          {/* Close Button */}
          <button 
            onClick={() => setShowAddModal(false)} 
            style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>

          <h3 className="gold-gradient-text" style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Agregar Nuevo Prospecto</h3>

          <form onSubmit={handleAddLeadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Nombre Completo</label>
                <input type="text" className="text-input" required value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Email</label>
                <input type="email" className="text-input" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Teléfono</label>
                <input type="text" className="text-input" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>País</label>
                <input type="text" className="text-input" value={formCountry} onChange={(e) => setFormCountry(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Origen</label>
                <select className="text-input" value={formSource} onChange={(e) => setFormSource(e.target.value as LeadSource)}>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Web">Web</option>
                  <option value="Referido">Referido</option>
                  <option value="Llamada">Llamada</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Monto de Inversión</label>
                <input type="number" className="text-input" value={formInvestment} onChange={(e) => setFormInvestment(Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Score Inicial</label>
                <input type="number" min="0" max="100" className="text-input" value={formScore} onChange={(e) => setFormScore(Number(e.target.value))} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Asignar Agente</label>
              <select className="text-input" value={formAgentId} onChange={(e) => setFormAgentId(e.target.value)}>
                <option value="">Dejar sin asignar</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Notas Iniciales</label>
              <textarea className="text-input" style={{ minHeight: '80px', resize: 'vertical' }} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            </div>

            {/* Error handling stable DOM */}
            <div className={formError ? "flex" : "hidden"} style={{ color: 'var(--text-error)', fontSize: '13px', gap: '6px' }}>
              <span>❌ {formError}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button type="button" className="secondary-button" onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button type="submit" className="gold-button" disabled={submitting}>
                <span className={submitting ? "hidden" : "flex"}>Crear Lead</span>
                <span className={submitting ? "flex" : "hidden"}>Creando...</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
