import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Search, Eye, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { Lead, ComplianceDocument } from "@/types";

const REQUIRED_DOCS = [
  "INE",
  "Comprobante de Domicilio",
  "Selfie con Contrato en mano",
  "Aceptacion de cada cargo o fondeo de su cuenta"
];

interface LeadWithDocs extends Lead {
  agent_name?: string;
  docs: ComplianceDocument[];
}

export const CumplimientoDashboard = () => {
  const [leads, setLeads] = useState<LeadWithDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch leads with their assigned agent profile and compliance documents
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          agent:profiles!leads_agent_id_fkey(first_name, last_name),
          compliance_documents(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedLeads: LeadWithDocs[] = data.map((item: any) => ({
          ...item,
          agent_name: item.agent ? `${item.agent.first_name || ''} ${item.agent.last_name || ''}`.trim() : 'Sin asignar',
          docs: item.compliance_documents || []
        }));
        setLeads(formattedLeads);
      }
    } catch (err) {
      console.error("Error fetching cumplimiento data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleViewDoc = (doc: ComplianceDocument) => {
    try {
      const { data } = supabase.storage.from("compliance_docs").getPublicUrl(doc.file_path);
      if (data?.publicUrl) {
        window.open(data.publicUrl, "_blank");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLeads = leads.filter(l => {
    const term = search.toLowerCase();
    const fullName = `${l.first_name} ${l.last_name}`.toLowerCase();
    return fullName.includes(term) || (l.email && l.email.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6 p-6 bg-[#050814] min-h-screen text-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[rgba(212,175,55,0.15)] pb-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-[#D4AF37]" />
          <div>
            <h1 className="text-2xl font-title font-bold text-[#F8FAFC]">Revisión Total</h1>
            <p className="text-xs text-[#94A3B8] mt-1">Dashboard global de cumplimiento y documentación requerida.</p>
          </div>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Buscar prospecto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#0D1428] border border-[rgba(212,175,55,0.2)] rounded-full focus:outline-none focus:border-[#D4AF37] text-white transition-colors"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center p-20 text-[#D4AF37] text-sm">Cargando revisión de cumplimiento...</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-[rgba(212,175,55,0.2)] bg-[#0D1428] text-[11px] font-semibold text-[#D4AF37] uppercase tracking-wider">
                  <th className="p-4">Prospecto</th>
                  <th className="p-4">Agente</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center border-l border-[rgba(212,175,55,0.1)]">INE</th>
                  <th className="p-4 text-center">Comprobante Dom.</th>
                  <th className="p-4 text-center">Selfie / Contrato</th>
                  <th className="p-4 text-center border-r border-[rgba(212,175,55,0.1)]">Aceptación Cargos</th>
                  <th className="p-4 text-center">Estatus Global</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  // Mapeo de documentos subidos por este lead
                  const docsByType = REQUIRED_DOCS.map(reqDoc => {
                    const found = lead.docs.find(d => d.document_type === reqDoc);
                    return { type: reqDoc, doc: found };
                  });
                  
                  const docsCount = docsByType.filter(d => d.doc).length;
                  const isComplete = docsCount === REQUIRED_DOCS.length;

                  return (
                    <tr key={lead.id} className="border-b border-[rgba(255,255,255,0.05)] table-row-hover transition-all text-sm">
                      <td className="p-4">
                        <div className="font-semibold text-[#F8FAFC]">
                          {lead.first_name} {lead.last_name}
                        </div>
                        <div className="text-xs text-[#94A3B8] flex items-center gap-1 mt-0.5">
                          {lead.email}
                        </div>
                      </td>
                      <td className="p-4 text-[#94A3B8] text-xs">
                        {lead.agent_name}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#050814] border border-[rgba(212,175,55,0.2)] text-[#D4AF37]">
                          {lead.status}
                        </span>
                      </td>
                      
                      {/* Document columns */}
                      {docsByType.map(({ type, doc }) => (
                        <td key={type} className="p-4 text-center">
                          {doc ? (
                            <button 
                              onClick={() => handleViewDoc(doc)}
                              className="inline-flex flex-col items-center gap-1 p-1.5 rounded bg-green-950/20 text-green-400 hover:bg-green-900/30 transition-colors cursor-pointer group"
                              title="Ver documento"
                            >
                              <CheckCircle2 className="h-5 w-5" />
                              <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity absolute mt-6 bg-[#050814] px-1 rounded shadow-lg border border-green-900/50">
                                Ver
                              </span>
                            </button>
                          ) : (
                            <div className="inline-flex flex-col items-center gap-1 p-1.5 text-red-400/50" title="Falta documento">
                              <XCircle className="h-5 w-5" />
                            </div>
                          )}
                        </td>
                      ))}
                      
                      {/* Estatus Global */}
                      <td className="p-4 text-center">
                        {isComplete ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-950/30 text-green-400 border border-green-900/50 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <ShieldCheck className="h-3 w-3" />
                            Completo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-950/30 text-yellow-500 border border-yellow-900/50 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <AlertCircle className="h-3 w-3" />
                            {docsCount} / {REQUIRED_DOCS.length}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          
          {!loading && filteredLeads.length === 0 && (
            <div className="text-center p-12 text-[#94A3B8] text-sm flex flex-col items-center gap-3">
              <FileText className="h-8 w-8 text-[rgba(212,175,55,0.3)]" />
              <p>No se encontraron prospectos para la revisión de cumplimiento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
