import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Cpu, Power, Plus, Trash2, Sparkles } from 'lucide-react';

interface Rule {
  id: string;
  name: string;
  action_type: string;
  priority: number;
  is_active: boolean;
  executions_count: number;
}

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  is_active: boolean;
  executions_count: number;
}

export default function Automations() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Rule State
  const [showAddRule, setShowAddRule] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleAction, setRuleAction] = useState('auto_assign');
  const [rulePriority, setRulePriority] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rulesData } = await supabase.from('rules').select('*').order('priority', { ascending: true });
      const { data: automationsData } = await supabase.from('automations').select('*');

      setRules(rulesData || []);
      setAutomations(automationsData || []);
    } catch (err) {
      console.error('Error fetching automations data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('rules')
        .insert({
          name: ruleName.trim(),
          action_type: ruleAction,
          priority: rulePriority,
          is_active: true,
          conditions: [
            { field: 'source', operator: 'equals', value: 'WhatsApp' }
          ],
          action_config: { target: 'round_robin' }
        });

      if (error) throw error;

      setRuleName('');
      setRulePriority(1);
      setShowAddRule(false);
      fetchData();
    } catch (err) {
      console.error('Error creating rule:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRule = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('rules')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error toggling rule status:', err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta regla?')) return;
    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '26px', fontWeight: 700 }} className="gold-gradient-text">Centro de Automatización</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Crea flujos automáticos, auto-asignaciones por Round Robin y desencadenadores en Delta Capital.</p>
      </div>

      {/* Grid: Rules & Flows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Left Side: Business Rules */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={20} style={{ color: 'var(--text-gold)' }} /> Reglas de Negocio
            </h3>
            <button onClick={() => setShowAddRule(true)} className="gold-button" style={{ padding: '6px 12px', fontSize: '12px' }}>
              <Plus size={14} /> Nueva Regla
            </button>
          </div>

          <div className={loading ? "flex" : "hidden"} style={{ padding: '20px', justifyContent: 'center' }}>
            <span>Cargando reglas...</span>
          </div>

          <div className={loading ? "hidden" : "flex"} style={{ flexDirection: 'column', gap: '12px' }}>
            {rules.length === 0 ? (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', display: 'block', padding: '20px' }}>
                No hay reglas de negocio definidas.
              </span>
            ) : (
              rules.map(rule => (
                <div key={rule.id} style={{
                  padding: '14px',
                  backgroundColor: 'var(--bg-dark-input)',
                  border: '1px solid var(--border-dark)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-white)' }}>{rule.name}</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Prioridad: <strong style={{ color: 'var(--text-gold)' }}>{rule.priority}</strong> | Acción: <strong>{rule.action_type}</strong>
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ejecuciones: {rule.executions_count}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                      onClick={() => handleToggleRule(rule.id, rule.is_active)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: rule.is_active ? '#34d399' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex'
                      }}
                      title={rule.is_active ? "Desactivar" : "Activar"}
                    >
                      <Power size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteRule(rule.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-error)', cursor: 'pointer', display: 'flex' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Active Automations */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: 'var(--text-gold)' }} /> Flujos de Automatización
          </h3>

          <div className={loading ? "flex" : "hidden"} style={{ padding: '20px', justifyContent: 'center' }}>
            <span>Cargando flujos...</span>
          </div>

          <div className={loading ? "hidden" : "flex"} style={{ flexDirection: 'column', gap: '12px' }}>
            {automations.length === 0 ? (
              <div style={{
                padding: '24px',
                border: '1px dashed var(--border-gold-subtle)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }}>
                  No hay flujos automáticos activos. ¿Quieres activar una plantilla sugerida?
                </span>
                
                {/* Seed button */}
                <button 
                  onClick={async () => {
                    await supabase.from('automations').insert({
                      name: 'Notificar Lead de WhatsApp en Canal General',
                      trigger_type: 'lead_created',
                      is_active: true,
                      trigger_config: { source: 'WhatsApp' },
                      flow: { steps: [{ action: 'send_chat_message', channel: 'general' }] }
                    });
                    fetchData();
                  }}
                  className="secondary-button" 
                  style={{ margin: '0 auto', fontSize: '12px' }}
                >
                  Cargar Plantilla "Notificación de Leads"
                </button>
              </div>
            ) : (
              automations.map(aut => (
                <div key={aut.id} style={{
                  padding: '14px',
                  backgroundColor: 'var(--bg-dark-input)',
                  border: '1px solid var(--border-dark)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-white)' }}>{aut.name}</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Trigger: <strong style={{ color: 'var(--text-gold)' }}>{aut.trigger_type}</strong> | Ejecuciones: {aut.executions_count}
                    </p>
                  </div>
                  <span className={`badge ${aut.is_active ? 'badge-success' : 'badge-gold'}`}>
                    {aut.is_active ? 'Activo' : 'Pausado'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Add Rule Dialog Modal */}
      <div 
        className={showAddRule ? "flex" : "hidden"}
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
          maxWidth: '400px',
          padding: '24px',
          border: '1px solid var(--border-gold)'
        }}>
          <h3 className="gold-gradient-text" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Crear Regla Comercial</h3>

          <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Nombre de la Regla</label>
              <input 
                type="text" 
                className="text-input" 
                placeholder="ej. Auto-asignar Leads de WhatsApp" 
                required 
                value={ruleName} 
                onChange={(e) => setRuleName(e.target.value)} 
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Acción</label>
              <select 
                className="text-input" 
                value={ruleAction} 
                onChange={(e) => setRuleAction(e.target.value)}
              >
                <option value="auto_assign">Auto-asignación Round Robin</option>
                <option value="flag_vip">Marcar como VIP (Score 100)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Prioridad</label>
              <input 
                type="number" 
                className="text-input" 
                min="1" 
                value={rulePriority} 
                onChange={(e) => setRulePriority(Number(e.target.value))} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="secondary-button" onClick={() => setShowAddRule(false)}>Cancelar</button>
              <button type="submit" className="gold-button" disabled={submitting}>Guardar Regla</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
