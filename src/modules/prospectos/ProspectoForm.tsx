// modules/prospectos/ProspectoForm.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lead } from '@/types';
import { useProspectosStore } from './useProspectos';
import { useNotificationsStore } from '@/store/notificationsStore';
import { supabase } from '@/lib/supabase';

const leadFormSchema = z.object({
  full_name: z.string().min(2, { message: 'El nombre es obligatorio' }),
  email: z.string().email({ message: 'Ingresa un correo electrónico válido' }),
  phone: z.string().optional(),
  country: z.string().min(1, { message: 'Selecciona un país' }),
  source: z.enum(['WhatsApp', 'Web', 'Referido', 'Llamada']),
  status: z.enum(['Nuevo', 'Contactado', 'Calificado', 'Descartado']),
  agent_id: z.string().nullable(),
  notes: z.string().optional(),
});

type LeadFormFields = z.infer<typeof leadFormSchema>;

interface ProspectoFormProps {
  lead?: Lead | null; // If present, edit mode
  onClose: () => void;
}

export default function ProspectoForm({ lead, onClose }: ProspectoFormProps) {
  const createLead = useProspectosStore((state) => state.createLead);
  const updateLead = useProspectosStore((state) => state.updateLead);
  const addToast = useNotificationsStore((state) => state.addToast);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<LeadFormFields>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      country: 'México',
      source: 'Web',
      status: 'Nuevo',
      agent_id: null,
      notes: '',
    }
  });

  useEffect(() => {
    async function loadAgents() {
      const { data, error } = await supabase.from('profiles').select('id, full_name');
      if (!error && data) {
        setAgents(data.map((p: any) => ({ id: p.id, name: p.full_name })));
      }
    }
    loadAgents();
  }, []);

  useEffect(() => {
    if (lead) {
      reset({
        full_name: lead.full_name,
        email: lead.email,
        phone: lead.phone || '',
        country: lead.country || 'México',
        source: lead.source,
        status: lead.status,
        agent_id: lead.agent_id,
        notes: lead.notes || '',
      });
    }
  }, [lead, reset]);

  const onSubmit = async (data: LeadFormFields) => {
    try {
      if (lead) {
        await updateLead(lead.id, {
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || null,
          country: data.country || null,
          source: data.source,
          status: data.status,
          agent_id: data.agent_id,
          notes: data.notes || null,
        });
        addToast({
          title: 'Prospecto actualizado',
          description: `${data.full_name} ha sido modificado con éxito.`,
          type: 'success',
        });
      } else {
        await createLead({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || null,
          country: data.country || null,
          source: data.source,
          status: data.status,
          agent_id: data.agent_id,
          notes: data.notes || null,
          score: Math.floor(Math.random() * 40) + 50,
          tags: []
        });
        addToast({
          title: 'Prospecto creado',
          description: `${data.full_name} ha sido registrado en el sistema.`,
          type: 'success',
        });
      }
      onClose();
    } catch (err) {
      addToast({
        title: 'Error',
        description: 'No se pudo guardar el prospecto.',
        type: 'error',
      });
    }
  };

  const countries = ['México', 'Colombia', 'Argentina', 'Chile', 'Perú'];
  const sources = ['WhatsApp', 'Web', 'Referido', 'Llamada'];
  const statuses = ['Nuevo', 'Contactado', 'Calificado', 'Descartado'];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-kovex-text">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">
            Nombre completo
          </label>
          <input
            type="text"
            placeholder="Ej. María González"
            {...register('full_name')}
            className="w-full bg-kovex-bg border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl p-3 text-sm outline-none transition-all"
          />
          {errors.full_name && (
            <span className="text-[10px] text-kovex-danger mt-1 block">{errors.full_name.message}</span>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">
            Email
          </label>
          <input
            type="email"
            placeholder="maria@email.com"
            {...register('email')}
            className="w-full bg-kovex-bg border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl p-3 text-sm outline-none transition-all"
          />
          {errors.email && (
            <span className="text-[10px] text-kovex-danger mt-1 block">{errors.email.message}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">
            Teléfono
          </label>
          <input
            type="text"
            placeholder="+52 55 1234 5678"
            {...register('phone')}
            className="w-full bg-kovex-bg border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl p-3 text-sm outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">
            País
          </label>
          <select
            {...register('country')}
            className="w-full bg-kovex-bg border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl p-3 text-sm outline-none transition-all"
          >
            {countries.map((c) => (
              <option key={c} value={c} className="bg-kovex-surface">{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">
            Fuente
          </label>
          <select
            {...register('source')}
            className="w-full bg-kovex-bg border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl p-3 text-sm outline-none transition-all"
          >
            {sources.map((s) => (
              <option key={s} value={s} className="bg-kovex-surface">{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">
            Estado
          </label>
          <select
            {...register('status')}
            className="w-full bg-kovex-bg border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl p-3 text-sm outline-none transition-all"
          >
            {statuses.map((s) => (
              <option key={s} value={s} className="bg-kovex-surface">{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">
            Agente asignado
          </label>
          <select
            {...register('agent_id')}
            className="w-full bg-kovex-bg border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl p-3 text-sm outline-none transition-all"
          >
            <option value="" className="bg-kovex-surface">Sin asignar</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id} className="bg-kovex-surface">{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-kovex-muted uppercase tracking-wider mb-2">
          Notas iniciales
        </label>
        <textarea
          placeholder="Escribe el contexto del prospecto, presupuestos, intereses..."
          {...register('notes')}
          rows={3}
          className="w-full bg-kovex-bg border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl p-3 text-sm outline-none resize-none transition-all"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-kovex-border">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-kovex-border hover:bg-white/[0.02] text-xs font-semibold rounded-xl text-kovex-text transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-kovex-primary hover:brightness-105 active:scale-[0.98] text-xs font-bold rounded-xl text-white transition-all"
        >
          {lead ? 'Guardar Cambios' : 'Crear Prospecto'}
        </button>
      </div>
    </form>
  );
}
