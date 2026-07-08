import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import type { Lead, Profile, Note, Activity } from "@/types";
import {
  Search, Plus, Tag, Trash2,
  Edit3, X, Phone, Mail, CheckCircle2, Globe, TrendingUp, MessageSquare,
  ChevronLeft, ChevronRight, Users
} from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ComplianceDocs } from "./ComplianceDocs";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100, 200, 500, 1000, 3000];

export const ProspectosList = () => {
  const { profile } = useAuth();
  const { isSuperAdmin, isManager, isAgent, canDelete, isRetention, isCompliance } = usePermissions();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterAgent, setFilterAgent] = useState("");

  // ✅ NUEVO: Paginación
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // ✅ NUEVO: Selección múltiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAgentId, setBulkAgentId] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Drawer / Form state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    country: "",
    investment_capacity: "",
    comments: "",
    status: "Nuevo",
    source: "Web",
    agent_id: "",
  });

  // Notes & Activity state inside drawer
  const [notes, setNotes] = useState<Note[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newNote, setNewNote] = useState("");

  const fetchLeads = async () => {
    try {
      setLoading(true);
      let query = supabase.from("leads").select("*").order("created_at", { ascending: false });

      if (isAgent && profile?.id) {
        query = query.eq("agent_id", profile.id);
      } else if (profile?.team_id && !isAgent) {
        query = query.eq("team_id", profile.team_id);
      }

      const { data, error } = await query;
      if (!error && data) {
        setLeads(data as Lead[]);
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["AGENT", "MANAGER"]);
      if (!error && data) {
        setAgents(data as Profile[]);
      }
    } catch (err) {
      console.error("Error fetching agents:", err);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchLeads();
      fetchAgents();
    }
  }, [profile]);

  // Handle drawer load detail
  const handleOpenLeadDetails = async (lead: Lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
    
    // Fetch activities
    const { data: actData } = await supabase
      .from("activities")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    if (actData) setActivities(actData as Activity[]);

    // Fetch notes
    const { data: noteData } = await supabase
      .from("notes")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    if (noteData) setNotes(noteData as Note[]);
  };

  // Add Note
  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedLead || !profile) return;
    try {
      const { data, error } = await supabase
        .from("notes")
        .insert({
          lead_id: selectedLead.id,
          user_id: profile.id,
          content: newNote,
        })
        .select()
        .single();
      
      if (!error && data) {
        setNotes([data as Note, ...notes]);
        setNewNote("");

        // Register Activity
        await supabase.from("activities").insert({
          lead_id: selectedLead.id,
          user_id: profile.id,
          description: `Nota agregada: "${newNote.slice(0, 30)}..."`,
          type: "note",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create / Update Lead Submit
  const handleSaveLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const payload = {
        ...formData,
        team_id: profile.team_id || null,
        agent_id: formData.agent_id || null,
      };

      if (selectedLead?.id) {
        // Update
        const { error } = await supabase
          .from("leads")
          .update(payload)
          .eq("id", selectedLead.id);
        
        if (!error) {
          // Log activity
          await supabase.from("activities").insert({
            lead_id: selectedLead.id,
            user_id: profile.id,
            description: `Prospecto actualizado: ${payload.first_name} ${payload.last_name}`,
            type: "update",
          });
        }
      } else {
        // Create
        const { data, error } = await supabase
          .from("leads")
          .insert(payload)
          .select()
          .single();
        
        if (!error && data) {
          // Log activity
          await supabase.from("activities").insert({
            lead_id: data.id,
            user_id: profile.id,
            description: `Prospecto creado: ${payload.first_name} ${payload.last_name}`,
            type: "creation",
          });
        }
      }
      setIsFormOpen(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Modal state
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; targetId: string; targetName: string}>({
    isOpen: false, targetId: "", targetName: ""
  });

  const confirmDeleteLead = async () => {
    try {
      const { error } = await supabase.from("leads").delete().eq("id", confirmModal.targetId);
      if (!error) {
        setLeads(leads.filter(l => l.id !== confirmModal.targetId));
        if (selectedLead?.id === confirmModal.targetId) {
          setIsDrawerOpen(false);
          setSelectedLead(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Lead
  const handleDeleteLead = (leadId: string, name: string) => {
    setConfirmModal({ isOpen: true, targetId: leadId, targetName: name });
  };

  const filteredLeads = leads.filter(lead => {
    const term = search.toLowerCase();
    const fullName = `${lead.first_name} ${lead.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(term) || 
                          (lead.email && lead.email.toLowerCase().includes(term)) ||
                          (lead.phone && lead.phone.includes(term)) ||
                          (lead.id && lead.id.toLowerCase().includes(term));
    const matchesStatus = filterStatus ? lead.status === filterStatus : true;
    const matchesSource = filterSource ? lead.source === filterSource : true;
    const matchesAgent = filterAgent ? lead.agent_id === filterAgent : true;

    return matchesSearch && matchesStatus && matchesSource && matchesAgent;
  });

  // ✅ Paginación
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ✅ Helpers de selección múltiple
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedLeads.map(l => l.id)));
    }
  };

  // ✅ Asignación masiva de agente
  const handleBulkAssign = async () => {
    if (!bulkAgentId || selectedIds.size === 0) return;
    setBulkAssigning(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from("leads")
        .update({ agent_id: bulkAgentId })
        .in("id", ids);
      if (!error) {
        setSelectedIds(new Set());
        setBulkAgentId("");
        fetchLeads();
      }
    } catch (err) { console.error(err); }
    finally { setBulkAssigning(false); }
  };

  return (
    <div className="space-y-6 p-6 bg-[#050814] min-h-screen text-[#F8FAFC]">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[rgba(212,175,55,0.15)] pb-4">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#F8FAFC]">Mesa de Prospectos</h1>
          <p className="text-xs text-[#94A3B8] mt-1">Gestión institucional de leads de inversión y trading</p>
        </div>
        <button 
          onClick={() => {
            setFormData({
              first_name: "",
              last_name: "",
              email: "",
              phone: "",
              country: "",
              investment_capacity: "",
              comments: "",
              status: "Nuevo",
              source: "Web",
              agent_id: profile?.id || "",
            });
            setSelectedLead(null);
            setIsFormOpen(true);
          }}
          className="gold-button-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded"
        >
          <Plus className="h-4 w-4" />
          <span>Agregar Prospecto</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 glass-card">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, email o teléfono..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full text-sm bg-[#0D1428] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
        <div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 w-full text-sm bg-[#0D1428] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] text-[#94A3B8]"
          >
            <option value="">-- Todos los Estados --</option>
            <option value="Nuevo">Nuevo</option>
            <option value="Contactado">Contactado</option>
            <option value="Interesado">Interesado</option>
            <option value="Asesoría">Asesoría</option>
            <option value="Depósito pendiente">Depósito pendiente</option>
            <option value="Ganado">Ganado</option>
            <option value="Perdido">Perdido</option>
          </select>
        </div>
        <div>
          <select 
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-3 py-2 w-full text-sm bg-[#0D1428] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] text-[#94A3B8]"
          >
            <option value="">-- Todas las Fuentes --</option>
            <option value="Web">Web</option>
            <option value="Recomendado">Recomendado</option>
            <option value="Campaña">Campaña</option>
            <option value="Cold Call">Cold Call</option>
          </select>
        </div>
        <div>
          <select 
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="px-3 py-2 w-full text-sm bg-[#0D1428] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] text-[#94A3B8]"
          >
            <option value="">-- Todos los Agentes --</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => {
            setSearch("");
            setFilterStatus("");
            setFilterSource("");
            setFilterAgent("");
          }}
          className="gold-button-secondary py-2 text-sm rounded font-medium"
        >
          Limpiar filtros
        </button>
      </div>

      {/* ✅ NUEVO: Barra de acciones masivas */}
      {selectedIds.size > 0 && (isSuperAdmin || isManager) && (
        <div className="flex items-center gap-3 p-3 rounded-lg"
          style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)" }}>
          <Users className="h-4 w-4 text-[#D4AF37]" />
          <span className="text-xs font-semibold text-[#D4AF37]">{selectedIds.size} seleccionados</span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={bulkAgentId}
              onChange={(e) => setBulkAgentId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#0D1428] border border-[rgba(212,175,55,0.2)] rounded text-[#94A3B8] focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="">Asignar agente...</option>
              {agents.map(a => (<option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>))}
            </select>
            <button
              onClick={handleBulkAssign}
              disabled={!bulkAgentId || bulkAssigning}
              className="gold-button-primary px-3 py-1.5 text-xs font-bold rounded disabled:opacity-50"
            >
              {bulkAssigning ? "Asignando..." : "Asignar"}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs text-[#64748B] hover:text-[#F8FAFC] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="text-center p-12 text-[#D4AF37]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#D4AF37] mx-auto mb-2"></div>
            Cargando base de prospectos...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center p-12 text-[#94A3B8]">
            No hay prospectos que coincidan con la búsqueda.
          </div>
        ) : (
          <>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[rgba(212,175,55,0.2)] bg-[#0D1428] text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">
                  {/* ✅ Checkbox selección masiva */}
                  {(isSuperAdmin || isManager) && (
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === paginatedLeads.length && paginatedLeads.length > 0}
                        onChange={toggleSelectAll}
                        className="accent-[#D4AF37] h-3.5 w-3.5 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="p-4">Nombre</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Teléfono</th>
                  <th className="p-4">Fuente</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-[rgba(255,255,255,0.05)] table-row-hover transition-all text-sm cursor-pointer ${
                      selectedIds.has(lead.id) ? "bg-[rgba(212,175,55,0.04)]" : ""
                    }`}
                    onClick={() => handleOpenLeadDetails(lead)}
                  >
                    {(isSuperAdmin || isManager) && (
                      <td className="p-4" onClick={(e) => { e.stopPropagation(); toggleSelect(lead.id); }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="accent-[#D4AF37] h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="p-4 font-semibold text-[#F8FAFC]">{lead.first_name} {lead.last_name}</td>
                    <td className="p-4 text-[#94A3B8] font-mono">{lead.email || "-"}</td>
                    <td className="p-4 text-[#94A3B8] font-mono">{lead.phone || "-"}</td>
                    <td className="p-4 text-xs">
                      <span className="px-2 py-0.5 rounded bg-[#17213D] text-[#E6C766] border border-[rgba(212,175,55,0.15)]">
                        {lead.source}
                      </span>
                    </td>
                    <td className="p-4 text-xs">
                      <span className={`px-2 py-0.5 rounded border ${
                        lead.status === "Ganado" ? "bg-green-950/20 text-green-400 border-green-500/30" :
                        lead.status === "Perdido" ? "bg-red-950/20 text-red-400 border-red-500/30" :
                        "bg-[rgba(212,175,55,0.05)] text-[#D4AF37] border-[rgba(212,175,55,0.2)]"
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setFormData({ first_name: lead.first_name, last_name: lead.last_name, email: lead.email, phone: lead.phone, country: lead.country || "", investment_capacity: lead.investment_capacity || "", comments: lead.comments || "", status: lead.status, source: lead.source, agent_id: lead.agent_id || "" });
                          setIsFormOpen(true);
                        }}
                        className="p-1 hover:text-[#D4AF37] text-[#94A3B8]"
                        title="Editar"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      {canDelete && (
                        <button onClick={() => handleDeleteLead(lead.id, `${lead.first_name} ${lead.last_name}`)} className="p-1 hover:text-red-400 text-[#94A3B8]" title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ✅ NUEVO: Footer con paginación y selector de tamaño */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(212,175,55,0.1)] bg-[#0D1428]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#4A6080]">Mostrar</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); setSelectedIds(new Set()); }}
                  className="px-2 py-1 text-xs bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded text-[#94A3B8] focus:outline-none focus:border-[#D4AF37]"
                >
                  {PAGE_SIZE_OPTIONS.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
                <span className="text-[11px] text-[#4A6080]">de {filteredLeads.length} registros</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); setSelectedIds(new Set()); }}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded text-[#64748B] hover:text-[#D4AF37] disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-[#94A3B8] px-2 font-mono">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); setSelectedIds(new Set()); }}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded text-[#64748B] hover:text-[#D4AF37] disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawer Details Lateral */}
      {isDrawerOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0D1428] border-l border-[rgba(212,175,55,0.2)] h-full overflow-y-auto p-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Top Drawer Header */}
              <div className="flex justify-between items-start border-b border-[rgba(212,175,55,0.12)] pb-4">
                <div>
                  <h3 className="text-xl font-title font-bold text-[#F8FAFC]">
                    {selectedLead.first_name} {selectedLead.last_name}
                  </h3>
                  <span className="text-[10px] tracking-wider text-[#D4AF37] uppercase">ID: {selectedLead.id.slice(0,8)}</span>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 text-[#94A3B8] hover:text-[#F8FAFC] rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Contact Information */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-[#94A3B8]">
                  <Mail className="h-4 w-4 text-[#D4AF37]" />
                  <span>{selectedLead.email || "Sin email"}</span>
                </div>
                <div className="flex items-center gap-3 text-[#94A3B8]">
                  <Phone className="h-4 w-4 text-[#D4AF37]" />
                  <span>{selectedLead.phone || "Sin teléfono"}</span>
                </div>
                <div className="flex items-center gap-3 text-[#94A3B8]">
                  <Globe className="h-4 w-4 text-[#D4AF37]" />
                  <span>{selectedLead.country || "País no especificado"}</span>
                </div>
                <div className="flex items-center gap-3 text-[#94A3B8]">
                  <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
                  <span>{selectedLead.investment_capacity || "Capacidad no indicada"}</span>
                </div>
                <div className="flex items-center gap-3 text-[#94A3B8]">
                  <Tag className="h-4 w-4 text-[#D4AF37]" />
                  <span>Fuente: {selectedLead.source}</span>
                </div>
                <div className="flex items-center gap-3 text-[#94A3B8]">
                  <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                  <span>Estado: {selectedLead.status}</span>
                </div>
                {selectedLead.comments && (
                  <div className="flex items-start gap-3 text-[#94A3B8] mt-1">
                    <MessageSquare className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                    <span className="text-xs leading-relaxed">{selectedLead.comments}</span>
                  </div>
                )}
              </div>

              {/* Notes Feed */}
              <div className="space-y-3 pt-4 border-t border-[rgba(212,175,55,0.12)]">
                <h4 className="text-sm font-title font-semibold text-[#D4AF37]">Notas Comerciales</h4>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Agregar nota de la sesión..." 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none"
                  />
                  <button 
                    onClick={handleAddNote}
                    className="gold-button-primary px-3 text-xs font-semibold rounded"
                  >
                    Guardar
                  </button>
                </div>
                
                <div className="space-y-2 h-40 overflow-y-auto">
                  {notes.length === 0 ? (
                    <p className="text-[10px] text-[#64748B] text-center pt-4">No hay notas registradas para este lead.</p>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="p-2.5 bg-[#050814] border border-[rgba(212,175,55,0.1)] rounded text-xs">
                        <p className="text-[#F8FAFC]">{note.content}</p>
                        <span className="text-[9px] text-[#64748B] block mt-1">{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Activity Logs */}
              <div className="space-y-3 pt-4 border-t border-[rgba(212,175,55,0.12)]">
                <h4 className="text-sm font-title font-semibold text-[#D4AF37]">Historial de Actividades</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {activities.map((act) => (
                    <div key={act.id} className="flex gap-2.5 items-start text-xs">
                      <div className="mt-1 h-2 w-2 rounded-full bg-[#D4AF37]" />
                      <div>
                        <p className="text-[#94A3B8]">{act.description}</p>
                        <span className="text-[9px] text-[#64748B]">{new Date(act.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Compliance Docs Section (Only for Cumplimiento) */}
              {isCompliance && selectedLead && (
                <div className="space-y-3 pt-4 border-t border-[rgba(212,175,55,0.12)]">
                  <ComplianceDocs leadId={selectedLead.id} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveLeadSubmit}
            className="w-full max-w-lg bg-[#0D1428] border border-[rgba(212,175,55,0.2)] rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-title font-bold text-[#D4AF37] sticky top-0 bg-[#0D1428] pb-2 border-b border-[rgba(212,175,55,0.12)]">
              {selectedLead?.id ? "Editar Prospecto" : "Nuevo Prospecto"}
            </h3>

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  disabled={isRetention || isCompliance}
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="px-3 py-2 w-full text-sm bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Apellido</label>
                <input
                  type="text"
                  required
                  disabled={isRetention || isCompliance}
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="px-3 py-2 w-full text-sm bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Email</label>
                <input
                  type="email"
                  disabled={isRetention || isCompliance}
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-3 py-2 w-full text-sm bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Teléfono</label>
                <input
                  type="text"
                  disabled={isRetention || isCompliance}
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="px-3 py-2 w-full text-sm bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Country + Investment Capacity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">País</label>
                <input
                  type="text"
                  placeholder="Ej. México"
                  disabled={isRetention || isCompliance}
                  value={formData.country || ""}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="px-3 py-2 w-full text-sm bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Capacidad de Inversión</label>
                <select
                  value={formData.investment_capacity || ""}
                  disabled={isRetention || isCompliance}
                  onChange={(e) => setFormData({ ...formData, investment_capacity: e.target.value })}
                  className="px-3 py-2 w-full text-sm bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] text-[#94A3B8] disabled:opacity-50"
                >
                  <option value="">Seleccionar rango...</option>
                  <option value="Menos de $5,000">Menos de $5,000</option>
                  <option value="$5,000 - $25,000">$5,000 – $25,000</option>
                  <option value="$25,000 - $100,000">$25,000 – $100,000</option>
                  <option value="$100,000 - $500,000">$100,000 – $500,000</option>
                  <option value="Más de $500,000">Más de $500,000</option>
                </select>
              </div>
            </div>

            {/* Status + Source */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Estado</label>
                <select
                  value={formData.status}
                  disabled={isCompliance}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="px-3 py-2 w-full text-sm bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] text-[#94A3B8] disabled:opacity-50"
                >
                  {!isRetention && (
                    <>
                      <option value="Nuevo">Nuevo</option>
                      <option value="Contactado">Contactado</option>
                      <option value="Interesado">Interesado</option>
                      <option value="Asesoría">Asesoría</option>
                      <option value="Depósito pendiente">Depósito pendiente</option>
                      <option value="Ganado">Ganado</option>
                      <option value="Perdido">Perdido</option>
                    </>
                  )}
                  {isRetention && (
                    <>
                      <option value="Lead nuevo con comentarios">Lead nuevo con comentarios</option>
                      <option value="Venta 1">Venta 1</option>
                      <option value="Venta 2">Venta 2</option>
                      <option value="Venta 3">Venta 3</option>
                      <option value="Venta 4">Venta 4</option>
                      <option value="Venta 5">Venta 5</option>
                      <option value="Venta 6">Venta 6</option>
                      <option value="Venta 7">Venta 7</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Fuente</label>
                <select
                  value={formData.source}
                  disabled={isRetention || isCompliance}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="px-3 py-2 w-full text-sm bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] text-[#94A3B8] disabled:opacity-50"
                >
                  <option value="Web">Web</option>
                  <option value="Recomendado">Recomendado</option>
                  <option value="Campaña">Campaña</option>
                  <option value="Cold Call">Cold Call</option>
                </select>
              </div>
            </div>

            {/* Assigned agent */}
            {(isSuperAdmin || isManager) && (
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Agente Asignado</label>
                <select
                  value={formData.agent_id || ""}
                  onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                  className="px-3 py-2 w-full text-sm bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] text-[#94A3B8]"
                >
                  <option value="">Asignar agente...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.first_name} {a.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Comments */}
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Comentarios</label>
              <textarea
                rows={3}
                placeholder="Observaciones iniciales, contexto del prospecto..."
                value={formData.comments || ""}
                disabled={isCompliance}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                className="px-3 py-2 w-full text-sm bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded focus:outline-none focus:border-[#D4AF37] resize-none disabled:opacity-50"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="gold-button-secondary px-4 py-2 text-xs font-semibold rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="gold-button-primary px-4 py-2 text-xs font-semibold rounded"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Eliminar Prospecto"
        message={`¿Estás seguro de que deseas eliminar a "${confirmModal.targetName}"? Esta acción borrará todas sus notas e historial y no se puede deshacer.`}
        onConfirm={confirmDeleteLead}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};
