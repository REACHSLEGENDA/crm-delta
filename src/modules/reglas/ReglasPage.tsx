// modules/reglas/ReglasPage.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Rule } from '@/types';
import Badge from '@/components/shared/Badge';
import Modal from '@/components/shared/Modal';
import { Plus, ToggleLeft, ToggleRight, Trash2, Edit2, Play, Save, Check, Filter } from 'lucide-react';
import { useNotificationsStore } from '@/store/notificationsStore';

export default function ReglasPage() {
  const addToast = useNotificationsStore((state) => state.addToast);

  // States
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);

  // Builder form states
  const [ruleName, setRuleName] = useState('');
  const [field, setField] = useState('country');
  const [operator, setOperator] = useState('eq');
  const [value, setValue] = useState('');
  const [action, setAction] = useState('assign_agent');
  const [actionValue, setActionValue] = useState('');
  const [stopOnMatch, setStopOnMatch] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('rules').select('*').order('priority');
      if (!error && data) {
        setRules(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await supabase.from('rules').update({ is_active: !current }).eq('id', id);
      setRules(rules.map((r) => r.id === id ? { ...r, is_active: !current } : r));
      addToast({
        title: 'Regla actualizada',
        description: `La regla ha sido ${!current ? 'activada' : 'desactivada'}.`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (confirm('¿Deseas eliminar esta regla de negocio?')) {
      try {
        await supabase.from('rules').delete().eq('id', id);
        setRules(rules.filter((r) => r.id !== id));
        addToast({
          title: 'Regla eliminada',
          description: 'La regla fue borrada correctamente.',
          type: 'warning',
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveRule = async () => {
    if (!ruleName.trim()) {
      alert('Ingresa el nombre de la regla');
      return;
    }

    try {
      const conditionObj = { field, operator, value };
      const actionConfigObj = { value: actionValue };

      const newRule = {
        name: ruleName,
        conditions: [conditionObj],
        action_type: action,
        action_config: actionConfigObj,
        priority: rules.length + 1,
        is_active: true,
        executions_count: 0,
        stop_on_match: stopOnMatch
      };

      const { data, error } = await supabase.from('rules').insert(newRule);
      if (!error && data) {
        setRules([...rules, data[0]]);
        addToast({
          title: 'Regla Guardada',
          description: `La regla de asignación "${ruleName}" fue agregada.`,
          type: 'success',
        });
        setBuilderOpen(false);
        // Reset builder form
        setRuleName('');
        setValue('');
        setActionValue('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Operator list based on selected field type
  const getOperators = () => {
    if (field === 'amount' || field === 'score') {
      return [
        { id: 'gt', label: 'mayor que (>)' },
        { id: 'lt', label: 'menor que (<)' },
        { id: 'eq', label: 'igual a (=)' },
      ];
    }
    return [
      { id: 'eq', label: 'es igual a' },
      { id: 'ne', label: 'no es igual a' },
      { id: 'contains', label: 'contiene' },
    ];
  };

  const getRuleDescription = (r: Rule) => {
    const cond = r.conditions[0];
    if (!cond) return 'Sin condiciones';
    const fieldNames: Record<string, string> = { country: 'País', source: 'Fuente', amount: 'Monto', score: 'Score' };
    const opNames: Record<string, string> = { eq: 'es', ne: 'no es', contains: 'contiene', gt: '>', lt: '<' };
    return `${fieldNames[cond.field] || cond.field} ${opNames[cond.operator] || cond.operator} "${cond.value}"`;
  };

  const getActionDescription = (r: Rule) => {
    const actNames: Record<string, string> = { 
      assign_agent: 'Asignar Agente', 
      tag_lead: 'Añadir Etiqueta', 
      send_email: 'Enviar Email',
      change_status: 'Mover Estado'
    };
    return `${actNames[r.action_type] || r.action_type} → "${r.action_config?.value || 'config'}"`;
  };

  return (
    <div className="space-y-6 select-none animate-fade-in text-kovex-text">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-white">Reglas de Negocio</h1>
          <p className="text-xs text-kovex-muted mt-1">
            {rules.length} reglas configuradas · {rules.filter(r => r.is_active).length} activas
          </p>
        </div>
        <button
          onClick={() => setBuilderOpen(true)}
          className="flex items-center gap-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-xs font-bold px-4 py-2.5 rounded-xl text-white transition-all shadow-lg"
        >
          <Plus size={14} /> Nueva Regla
        </button>
      </div>

      {/* Rules Table */}
      <div className="bg-[#0F1525]/40 border border-kovex-border rounded-2xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-kovex-border bg-white/[0.015]">
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider w-16">Prioridad</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Nombre</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Condición</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider">Acción</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider w-24">Estado</th>
              <th className="p-4 text-xs font-bold text-kovex-muted uppercase tracking-wider w-16">Eliminar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-kovex-muted text-xs">Cargando reglas...</td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-kovex-muted text-xs">No hay reglas de negocio definidas</td>
              </tr>
            ) : (
              rules.map((rule) => {
                const priorityColors = rule.priority <= 2 ? 'danger' : rule.priority <= 4 ? 'warning' : 'gray';
                return (
                  <tr key={rule.id} className="border-b border-kovex-border/30 hover:bg-white/[0.01] transition-all">
                    <td className="p-4">
                      <Badge variant={priorityColors}>#{rule.priority}</Badge>
                    </td>
                    <td className="p-4 text-xs font-bold text-white">{rule.name}</td>
                    <td className="p-4 text-xs text-kovex-text">
                      <code className="text-kovex-warning font-mono mr-1.5 font-bold">SI</code>
                      {getRuleDescription(rule)}
                    </td>
                    <td className="p-4 text-xs text-kovex-text">
                      <code className="text-kovex-accent font-mono mr-1.5 font-bold">ENTONCES</code>
                      {getActionDescription(rule)}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(rule.id, rule.is_active)}
                        className="text-kovex-muted hover:text-white transition-colors"
                      >
                        {rule.is_active ? (
                          <ToggleRight size={28} className="text-kovex-primary" />
                        ) : (
                          <ToggleLeft size={28} />
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-kovex-muted hover:text-kovex-danger p-1.5 rounded-lg hover:bg-kovex-surface transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* RULE BUILDER MODAL */}
      <Modal
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
        title="Constructor de Reglas de Negocio"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">Nombre de la regla</label>
            <input
              type="text"
              placeholder="Ej. Asignar Leads VIP MX a Diego"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="w-full bg-kovex-bg border border-kovex-border text-white text-xs rounded-xl p-3 outline-none focus:border-kovex-primary/40"
            />
          </div>

          <div className="bg-kovex-bg/60 border border-kovex-border rounded-xl p-4 space-y-4">
            {/* Condition SI Row */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-kovex-warning font-mono font-bold text-sm">SI</span>
              
              {/* Field Select */}
              <select
                value={field}
                onChange={(e) => { setField(e.target.value); setValue(''); }}
                className="bg-kovex-surface border border-kovex-border text-white text-xs rounded-xl px-3 py-2 outline-none"
              >
                <option value="country">País</option>
                <option value="source">Fuente</option>
                <option value="amount">Monto</option>
                <option value="score">Score</option>
              </select>

              {/* Operator Select */}
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="bg-kovex-surface border border-kovex-border text-white text-xs rounded-xl px-3 py-2 outline-none"
              >
                {getOperators().map((op) => (
                  <option key={op.id} value={op.id}>{op.label}</option>
                ))}
              </select>

              {/* Value Input */}
              <input
                type="text"
                placeholder="Valor..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="flex-1 bg-kovex-surface border border-kovex-border text-white text-xs rounded-xl px-3 py-2 outline-none min-w-[120px]"
              />
            </div>

            {/* Action ENTONCES Row */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-kovex-accent font-mono font-bold text-sm">ENTONCES</span>
              
              {/* Action Select */}
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="bg-kovex-surface border border-kovex-border text-white text-xs rounded-xl px-3 py-2 outline-none"
              >
                <option value="assign_agent">Asignar Agente</option>
                <option value="tag_lead">Añadir Etiqueta</option>
                <option value="send_email">Enviar Email</option>
                <option value="change_status">Cambiar Estado</option>
              </select>

              {/* Action Value Input */}
              <input
                type="text"
                placeholder="Parámetro (nombre, tag, estado)..."
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                className="flex-1 bg-kovex-surface border border-kovex-border text-white text-xs rounded-xl px-3 py-2 outline-none min-w-[180px]"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="stopMatch"
              checked={stopOnMatch}
              onChange={(e) => setStopOnMatch(e.target.checked)}
              className="w-4 h-4 accent-kovex-primary bg-kovex-bg border-kovex-border"
            />
            <label htmlFor="stopMatch" className="ml-2 text-xs text-kovex-muted cursor-pointer select-none">
              Parar si coincide (Stop on match - no procesar reglas de menor prioridad)
            </label>
          </div>

          <div className="pt-4 border-t border-kovex-border flex justify-end gap-3">
            <button
              onClick={() => setBuilderOpen(false)}
              className="px-4 py-2 border border-kovex-border hover:bg-white/[0.02] text-xs font-semibold rounded-xl text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveRule}
              className="px-4 py-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-xs font-bold rounded-xl text-white transition-all shadow-lg"
            >
              <Save size={14} className="inline mr-1.5" /> Guardar Regla
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
