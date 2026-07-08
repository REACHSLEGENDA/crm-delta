import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import type { ComplianceDocument } from "@/types";
import { FileText, UploadCloud, Trash2, Eye, Download, ShieldCheck, Folder } from "lucide-react";

interface ComplianceDocsProps {
  leadId: string;
}

const REQUIRED_DOCS = [
  "INE",
  "Comprobante de Domicilio",
  "Selfie con Contrato en mano",
  "Aceptacion de cada cargo o fondeo de su cuenta"
];

export const ComplianceDocs = ({ leadId }: ComplianceDocsProps) => {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("compliance_documents")
        .select("*")
        .eq("lead_id", leadId);
      
      if (!error && data) {
        setDocuments(data as ComplianceDocument[]);
      }
    } catch (err) {
      console.error("Error fetching docs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) fetchDocuments();
  }, [leadId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    try {
      setUploading(docType);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}/${docType.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("compliance_docs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Insert record in DB
      const { error: dbError } = await supabase
        .from("compliance_documents")
        .insert({
          lead_id: leadId,
          document_type: docType,
          file_path: fileName,
          file_name: file.name,
          uploaded_by: profile.id
        });

      if (dbError) throw dbError;

      await fetchDocuments();
    } catch (err) {
      console.error("Error uploading document:", err);
      alert("Error al subir el documento");
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (doc: ComplianceDocument) => {
    if (!confirm("¿Seguro que deseas eliminar este documento?")) return;

    try {
      // Remove from DB
      await supabase.from("compliance_documents").delete().eq("id", doc.id);
      
      // Remove from Storage
      await supabase.storage.from("compliance_docs").remove([doc.file_path]);

      setDocuments(docs => docs.filter(d => d.id !== doc.id));
    } catch (err) {
      console.error("Error deleting doc:", err);
    }
  };

  const handleView = async (doc: ComplianceDocument) => {
    try {
      const { data } = supabase.storage.from("compliance_docs").getPublicUrl(doc.file_path);
      if (data?.publicUrl) {
        window.open(data.publicUrl, "_blank");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 text-[#D4AF37]">
        <ShieldCheck className="h-5 w-5" />
        <h4 className="font-title font-semibold">Carpeta de Cumplimiento</h4>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {REQUIRED_DOCS.map(docType => {
          const uploadedDocs = documents.filter(d => d.document_type === docType);
          const isUploaded = uploadedDocs.length > 0;

          return (
            <div key={docType} className="bg-[#050814] border border-[rgba(212,175,55,0.15)] rounded p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className={`h-4 w-4 ${isUploaded ? "text-green-500" : "text-[#94A3B8]"}`} />
                  <span className={`text-xs font-semibold ${isUploaded ? "text-[#F8FAFC]" : "text-[#94A3B8]"}`}>
                    {docType}
                  </span>
                </div>
                
                <label className="cursor-pointer">
                  <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded ${
                    uploading === docType ? "bg-gray-800 text-gray-400" : "bg-[rgba(212,175,55,0.1)] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#050814]"
                  } transition-colors`}>
                    <UploadCloud className="h-3 w-3" />
                    {uploading === docType ? "Subiendo..." : "Subir"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, docType)}
                    disabled={uploading === docType}
                  />
                </label>
              </div>

              {uploadedDocs.length > 0 && (
                <div className="mt-2 space-y-2 border-t border-[rgba(255,255,255,0.05)] pt-2">
                  {uploadedDocs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between bg-[#0D1428] rounded p-2 text-xs">
                      <div className="flex items-center gap-2 truncate text-[#F8FAFC]">
                        <FileText className="h-3 w-3 text-[#D4AF37]" />
                        <span className="truncate w-32 md:w-48" title={doc.file_name}>{doc.file_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleView(doc)} className="p-1 hover:text-[#D4AF37] text-[#94A3B8]" title="Ver/Descargar">
                          <Eye className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleDelete(doc)} className="p-1 hover:text-red-400 text-[#94A3B8]" title="Eliminar">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
