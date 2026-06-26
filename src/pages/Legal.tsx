import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LegalFile, Profile } from '../types';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Plus, 
  X,
  Link2
} from 'lucide-react';

interface LegalProps {
  currentProfile: Profile | null;
}

export default function Legal({ currentProfile }: LegalProps) {
  const [files, setFiles] = useState<LegalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('url');
  
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('legal_files')
        .select('*, uploader:uploaded_by(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (err) {
      console.error('Error fetching legal files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      let finalUrl = formUrl;

      if (uploadMode === 'upload' && selectedFile) {
        // 1. Upload to Supabase Storage Bucket 'legal_files'
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Attempt upload
        const { error: uploadError } = await supabase.storage
          .from('legal_files')
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw new Error(`Error subiendo archivo a Supabase Storage: ${uploadError.message}. Intenta con el método URL.`);
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('legal_files')
          .getPublicUrl(filePath);

        finalUrl = publicUrlData.publicUrl;
      }

      if (!finalUrl) {
        throw new Error('Debes proporcionar un enlace o seleccionar un archivo para subir.');
      }

      // 2. Insert record into public.legal_files
      const { error } = await supabase
        .from('legal_files')
        .insert({
          name: formName,
          file_url: finalUrl,
          uploaded_by: currentProfile?.id || null
        });

      if (error) throw error;

      // Reset
      setFormName('');
      setFormUrl('');
      setSelectedFile(null);
      setShowAddModal(false);
      fetchFiles();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Error al guardar el archivo legal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este documento legal de la base de datos?')) return;
    try {
      const { error } = await supabase
        .from('legal_files')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchFiles();
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700 }} className="gold-gradient-text">Repositorio Legal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Gestión de contratos, términos de servicio y documentación legal corporativa.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="gold-button">
          <Plus size={18} /> Subir Documento
        </button>
      </div>

      {/* Grid of Legal Files */}
      <div className={loading ? "flex" : "hidden"} style={{ padding: '60px', justifyContent: 'center' }}>
        <span>Cargando repositorio legal...</span>
      </div>

      <div 
        className={loading ? "hidden" : "grid"} 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px'
        }}
      >
        {files.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }} className="glass-panel">
            No hay documentos legales registrados aún.
          </div>
        ) : (
          files.map(file => (
            <div 
              key={file.id} 
              className="glass-panel" 
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  backgroundColor: 'rgba(212, 175, 55, 0.1)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: 'var(--text-gold)'
                }}>
                  <FileText size={22} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <h4 style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }} title={file.name}>
                    {file.name}
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Por: {file.uploader?.full_name || 'Sistema'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-dark)', paddingTop: '12px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  {new Date(file.created_at).toLocaleDateString()}
                </span>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a 
                    href={file.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="secondary-button" 
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border-gold-subtle)' }}
                  >
                    <Download size={12} /> Ver
                  </a>
                  <button 
                    onClick={() => handleDeleteFile(file.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-error)', cursor: 'pointer', padding: '6px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Document Modal */}
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
          maxWidth: '450px',
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

          <h3 className="gold-gradient-text" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Subir Documento Legal</h3>

          <form onSubmit={handleCreateFile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Nombre del Documento</label>
              <input 
                type="text" 
                className="text-input" 
                placeholder="ej. Contrato de Adhesión" 
                required 
                value={formName} 
                onChange={(e) => setFormName(e.target.value)} 
              />
            </div>

            {/* Upload Method Selector */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                className="secondary-button" 
                style={{ flex: 1, backgroundColor: uploadMode === 'url' ? 'rgba(212,175,55,0.15)' : 'none', border: uploadMode === 'url' ? '1px solid var(--gold-primary)' : '1px solid var(--border-dark)' }}
                onClick={() => setUploadMode('url')}
              >
                <Link2 size={14} /> Enlace URL
              </button>
              <button 
                type="button" 
                className="secondary-button" 
                style={{ flex: 1, backgroundColor: uploadMode === 'upload' ? 'rgba(212,175,55,0.15)' : 'none', border: uploadMode === 'upload' ? '1px solid var(--gold-primary)' : '1px solid var(--border-dark)' }}
                onClick={() => setUploadMode('upload')}
              >
                <Upload size={14} /> Subir Archivo
              </button>
            </div>

            {/* Input URL mode */}
            <div className={uploadMode === 'url' ? "flex" : "hidden"} style={{ flexDirection: 'column' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Enlace del Archivo (URL)</label>
              <input 
                type="text" 
                className="text-input" 
                placeholder="https://example.com/documento.pdf" 
                value={formUrl} 
                onChange={(e) => setFormUrl(e.target.value)} 
              />
            </div>

            {/* Input Upload file mode */}
            <div className={uploadMode === 'upload' ? "flex" : "hidden"} style={{ flexDirection: 'column' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Seleccionar Documento</label>
              <input 
                type="file" 
                className="text-input" 
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Subirá directamente a Supabase Storage (requiere bucket 'legal_files' configurado).
              </span>
            </div>

            {/* Error display */}
            <div className={formError ? "flex" : "hidden"} style={{ color: 'var(--text-error)', fontSize: '13px', gap: '6px' }}>
              <span>❌ {formError}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button type="button" className="secondary-button" onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button type="submit" className="gold-button" disabled={submitting}>
                <span className={submitting ? "hidden" : "flex"}>Guardar Documento</span>
                <span className={submitting ? "flex" : "hidden"}>Guardando...</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
