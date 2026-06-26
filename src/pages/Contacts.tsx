import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Contact, Profile } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Building, 
  Phone, 
  Mail, 
  X 
} from 'lucide-react';

interface ContactsProps {
  currentProfile: Profile | null;
}

export default function Contacts({ currentProfile }: ContactsProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formAgentId, setFormAgentId] = useState('');
  const [formTags, setFormTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchContacts();
    fetchAgents();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, agent:agent_id(full_name)')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
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

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const tagsArray = formTags ? formTags.split(',').map(t => t.trim()).filter(t => t) : [];

      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          full_name: formName,
          email: formEmail,
          phone: formPhone || null,
          company: formCompany || null,
          agent_id: formAgentId || currentProfile?.id || null,
          tags: tagsArray
        })
        .select()
        .single();

      if (error) throw error;

      // Log system activity
      if (newContact && currentProfile) {
        await supabase.from('activities').insert({
          entity_type: 'contact',
          entity_id: newContact.id,
          type: 'creation',
          description: `Contacto ${newContact.full_name} creado.`,
          created_by: currentProfile.id
        });
      }

      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormCompany('');
      setFormAgentId('');
      setFormTags('');
      setShowAddModal(false);
      fetchContacts();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Error al guardar el contacto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este contacto?')) return;
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchContacts();
    } catch (err) {
      console.error('Error deleting contact:', err);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const term = searchTerm.toLowerCase();
    return (
      contact.full_name.toLowerCase().includes(term) ||
      contact.email.toLowerCase().includes(term) ||
      (contact.phone && contact.phone.includes(term)) ||
      (contact.company && contact.company.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700 }} className="gold-gradient-text">Directorio de Contactos</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Base de datos de contactos permanentes de Delta Capital.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="gold-button">
          <Plus size={18} /> Agregar Contacto
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="text-input"
            style={{ paddingLeft: '40px' }}
            placeholder="Buscar contactos por nombre, compañía, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table / Grid */}
      <div className={loading ? "flex" : "hidden"} style={{ padding: '60px', justifyContent: 'center' }}>
        <span>Cargando directorio de contactos...</span>
      </div>

      <div className={loading ? "hidden" : "flex"} style={{ flexDirection: 'column', gap: '15px' }}>
        {filteredContacts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }} className="glass-panel">
            Ningún contacto registrado en la base de datos.
          </div>
        ) : (
          <div className="glass-panel" style={{ overflowX: 'auto', padding: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dark)', color: 'var(--text-gold)', fontSize: '13px' }}>
                  <th style={{ padding: '16px' }}>Nombre</th>
                  <th style={{ padding: '16px' }}>Compañía</th>
                  <th style={{ padding: '16px' }}>Información de Contacto</th>
                  <th style={{ padding: '16px' }}>Etiquetas</th>
                  <th style={{ padding: '16px' }}>Agente Asignado</th>
                  <th style={{ padding: '16px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => (
                  <tr key={contact.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '14px' }}>
                    <td style={{ padding: '16px', fontWeight: 600 }}>{contact.full_name}</td>
                    <td style={{ padding: '16px' }}>
                      {contact.company ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{contact.company}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <Mail size={12} style={{ color: 'var(--text-gold)' }} /> {contact.email}
                        </span>
                        {contact.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <Phone size={12} style={{ color: 'var(--text-gold)' }} /> {contact.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {contact.tags && contact.tags.length > 0 ? (
                          contact.tags.map(t => (
                            <span key={t} className="badge badge-gold" style={{ fontSize: '9px', textTransform: 'none' }}>{t}</span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Sin tags</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>{contact.agent?.full_name || 'Sin Asignar'}</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDeleteContact(contact.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-error)', cursor: 'pointer', padding: '6px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
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
          <button 
            onClick={() => setShowAddModal(false)} 
            style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>

          <h3 className="gold-gradient-text" style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Agregar Contacto</h3>

          <form onSubmit={handleCreateContact} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Nombre Completo</label>
              <input type="text" className="text-input" required value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Email</label>
              <input type="email" className="text-input" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Teléfono</label>
                <input type="text" className="text-input" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Compañía</label>
                <input type="text" className="text-input" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Etiquetas (Separadas por comas)</label>
              <input type="text" className="text-input" placeholder="inversor, vip, socio" value={formTags} onChange={(e) => setFormTags(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Agente Comercial</label>
              <select className="text-input" value={formAgentId} onChange={(e) => setFormAgentId(e.target.value)}>
                <option value="">Dejar sin asignar</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                ))}
              </select>
            </div>

            <div className={formError ? "flex" : "hidden"} style={{ color: 'var(--text-error)', fontSize: '13px', gap: '6px' }}>
              <span>❌ {formError}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button type="button" className="secondary-button" onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button type="submit" className="gold-button" disabled={submitting}>
                <span className={submitting ? "hidden" : "flex"}>Guardar Contacto</span>
                <span className={submitting ? "flex" : "hidden"}>Guardando...</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
