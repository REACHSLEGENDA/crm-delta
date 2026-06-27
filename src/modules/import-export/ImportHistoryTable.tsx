import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Download, RefreshCw } from 'lucide-react';
import type { ImportBatch } from '@/types';
import { exportErrorsToCSV } from './exportUtils';
import { exportToXLSX } from './exportUtils';

export function ImportHistoryTable() {
  const { profile } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('import_batches')
        .select('*, profiles(first_name, last_name, email)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!isSuperAdmin && profile?.team_id) {
        q = q.eq('team_id', profile.team_id);
      }

      const { data, error } = await q;
      if (!error && data) setBatches(data as unknown as ImportBatch[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) fetchBatches();
  }, [profile]);

  const handleDownloadErrors = async (batchId: string, fileName: string) => {
    const { data } = await supabase
      .from('import_errors')
      .select('*')
      .eq('batch_id', batchId);
    if (data && data.length > 0) {
      exportErrorsToCSV(
        data as Array<{ row_number: number; error_type: string; message: string; raw_data: Record<string, unknown> }>,
        `errores_${fileName.replace(/\.[^.]+$/, '')}`
      );
    }
  };

  const handleExportBatch = async (batchId: string, fileName: string) => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('import_batch_id', batchId);
    if (data && data.length > 0) {
      exportToXLSX(data as any, `lote_${fileName.replace(/\.[^.]+$/, '')}`);
    }
  };

  const statusBadge = (status: ImportBatch['status']) => {
    const map = {
      completed:  'bg-green-950/20 text-green-400 border-green-500/30',
      failed:     'bg-red-950/20 text-red-400 border-red-500/30',
      processing: 'bg-blue-950/20 text-blue-400 border-blue-500/30',
      pending:    'bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border-[rgba(212,175,55,0.3)]',
    };
    return map[status] ?? '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 rounded-full border-2 border-[rgba(212,175,55,0.2)] border-t-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#4A6080]">Últimas 50 importaciones</p>
        <button
          onClick={fetchBatches}
          className="flex items-center gap-1.5 text-xs text-[#D4AF37] hover:text-[#E6C766]"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-[rgba(212,175,55,0.15)] bg-[#0D1428] text-[10px] font-semibold text-[#D4AF37] uppercase tracking-wider">
              <th className="p-3 text-left">Fecha</th>
              <th className="p-3 text-left">Archivo</th>
              <th className="p-3 text-left">Usuario</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Importados</th>
              <th className="p-3 text-right">Duplic.</th>
              <th className="p-3 text-right">Errores</th>
              <th className="p-3 text-left">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-[#4A6080]">
                  Sin historial de importaciones.
                </td>
              </tr>
            ) : batches.map((b) => (
              <tr
                key={b.id}
                className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(212,175,55,0.02)] transition-colors"
              >
                <td className="p-3 font-mono text-[#4A6080]">
                  {new Date(b.created_at).toLocaleDateString('es-MX')}
                  <br />
                  <span className="text-[9px]">{new Date(b.created_at).toLocaleTimeString('es-MX')}</span>
                </td>
                <td className="p-3 text-[#F8FAFC] font-medium max-w-[140px] truncate">
                  {b.file_name}
                  <br />
                  <span className="text-[9px] text-[#334155]">{b.file_type}</span>
                </td>
                <td className="p-3 text-[#94A3B8]">
                  {b.profiles
                    ? `${b.profiles.first_name ?? ''} ${b.profiles.last_name ?? ''}`.trim() || b.profiles.email
                    : '—'}
                </td>
                <td className="p-3 text-right font-mono text-[#F8FAFC]">{b.total_rows}</td>
                <td className="p-3 text-right font-mono text-green-400">{b.imported_rows}</td>
                <td className="p-3 text-right font-mono text-[#D4AF37]">{b.duplicate_rows}</td>
                <td className="p-3 text-right font-mono text-red-400">{b.error_rows}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${statusBadge(b.status)}`}>
                    {b.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    {b.error_rows > 0 && (
                      <button
                        onClick={() => handleDownloadErrors(b.id, b.file_name)}
                        title="Descargar errores"
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {b.imported_rows > 0 && (
                      <button
                        onClick={() => handleExportBatch(b.id, b.file_name)}
                        title="Exportar lote"
                        className="p-1 text-[#D4AF37] hover:text-[#E6C766]"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
