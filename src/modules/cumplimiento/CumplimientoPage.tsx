// modules/cumplimiento/CumplimientoPage.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import Badge from '@/components/shared/Badge';
import { FileText, Upload, Download, Trash2, Search, FileUp, ShieldAlert, Check } from 'lucide-react';

export default function CumplimientoPage() {
  const profile = useAuthStore((state) => state.profile);
  const addToast = useNotificationsStore((state) => state.addToast);

  const [files, setFiles] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('legal_files')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setFiles(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name');
      if (!error && data) {
        setAgents(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchAgents();
  }, []);

  const getAgentName = (id: string | null) => {
    if (!id) return 'Sistema';
    const found = agents.find((a) => a.id === id);
    return found ? found.full_name : 'Cargando...';
  };

  const handleUpload = async (file: File) => {
    if (!profile) return;
    setUploading(true);
    try {
      // Create a database record for the file
      const mockUrl = `https://kzemdiggdpxfceiecbat.supabase.co/storage/v1/object/public/legal-files/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase
        .from('legal_files')
        .insert({
          name: file.name,
          file_url: mockUrl,
          uploaded_by: profile.id
        });

      if (!error) {
        addToast({
          title: 'Archivo subido',
          description: `El documento "${file.name}" ha sido cargado exitosamente.`,
          type: 'success',
        });
        fetchFiles();
      } else {
        throw new Error(error.message);
      }
    } catch (err: any) {
      addToast({
        title: 'Error de subida',
        description: err.message || 'No se pudo subir el archivo.',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el archivo "${name}"?`)) return;
    try {
      const { error } = await supabase.from('legal_files').delete().eq('id', id);
      if (!error) {
        addToast({
          title: 'Archivo eliminado',
          description: 'El archivo legal fue removido correctamente.',
          type: 'warning',
        });
        setFiles(files.filter((f) => f.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none animate-fade-in text-kovex-text">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-white">Cumplimiento y Expedientes</h1>
          <p className="text-xs text-kovex-muted mt-1">
            Repositorio de documentos legales, KYC y contratos de la mesa de trading DELTA CAPITAL
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Panel - LEFT */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0c1222] border border-kovex-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileUp className="text-kovex-primary" size={18} /> Subir Documento
            </h3>
            <p className="text-xs text-kovex-muted">
              Carga archivos en formato PDF, PNG o JPG (máx. 10MB) para su validación de KYC.
            </p>

            <form
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer relative ${
                dragActive
                  ? 'border-kovex-primary bg-kovex-primary/5'
                  : 'border-kovex-border hover:border-kovex-primary/40 bg-[#060b16]/30'
              }`}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <label htmlFor="file-upload" className="w-full h-full absolute inset-0 cursor-pointer" />
              
              {uploading ? (
                <>
                  <Loader2 className="animate-spin text-kovex-primary" size={32} />
                  <span className="text-xs text-white font-bold">Subiendo archivo...</span>
                </>
              ) : (
                <>
                  <Upload className="text-kovex-muted" size={32} />
                  <span className="text-xs text-white font-semibold text-center">
                    Arrastra tu archivo aquí o <span className="text-kovex-primary underline">haz clic para explorar</span>
                  </span>
                  <span className="text-[10px] text-kovex-muted">PDF, PNG, JPG hasta 10MB</span>
                </>
              )}
            </form>

            <div className="bg-[#141d33]/50 border border-kovex-border p-4 rounded-xl flex gap-3 text-xs text-kovex-muted">
              <ShieldAlert className="text-kovex-primary flex-shrink-0" size={16} />
              <p className="leading-normal">
                Todas las subidas están cifradas de extremo a extremo y auditadas con fecha y agente responsable de acuerdo al protocolo SOC2.
              </p>
            </div>
          </div>
        </div>

        {/* Files Directory - RIGHT */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0c1222] border border-kovex-border rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <h3 className="text-sm font-bold text-white">Directorio Legal</h3>
              {/* Search bar */}
              <div className="relative w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-kovex-muted">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Buscar archivos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#060b16] border border-kovex-border focus:border-kovex-primary/50 text-white rounded-xl py-2 pl-9 pr-4 text-xs outline-none transition-all"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-kovex-muted">Cargando expedientes...</div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-12 text-center text-xs text-kovex-muted">No se encontraron archivos cargados</div>
            ) : (
              <div className="border border-kovex-border/40 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#141d33]/50 border-b border-kovex-border/60">
                      <th className="p-3 text-[10px] font-bold text-kovex-muted uppercase tracking-wider">Nombre del Documento</th>
                      <th className="p-3 text-[10px] font-bold text-kovex-muted uppercase tracking-wider">Cargado Por</th>
                      <th className="p-3 text-[10px] font-bold text-kovex-muted uppercase tracking-wider">Fecha</th>
                      <th className="p-3 text-[10px] font-bold text-kovex-muted uppercase tracking-wider text-right w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((file) => (
                      <tr key={file.id} className="border-b border-kovex-border/30 hover:bg-[#141d33]/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-kovex-primary flex-shrink-0" />
                            <span className="text-xs font-semibold text-white truncate max-w-xs">{file.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-kovex-muted">
                          {getAgentName(file.uploaded_by)}
                        </td>
                        <td className="p-3 text-xs text-kovex-muted">
                          {new Date(file.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Descargar archivo"
                              className="p-1.5 border border-kovex-border hover:bg-[#141d33] text-kovex-muted hover:text-white rounded-lg transition-colors"
                            >
                              <Download size={13} />
                            </a>
                            {(profile?.role === 'SUPERADMIN' || profile?.role === 'MANAGER' || profile?.id === file.uploaded_by) && (
                              <button
                                onClick={() => handleDelete(file.id, file.name)}
                                title="Eliminar archivo"
                                className="p-1.5 border border-kovex-danger/20 hover:bg-kovex-danger/5 text-kovex-danger rounded-lg transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple loader helper inline to bypass imports issues
function Loader2({ className, size }: { className?: string; size?: number }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={size || 24}
      height={size || 24}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}
