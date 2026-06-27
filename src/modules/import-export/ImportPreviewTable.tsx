import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ImportRow, RowStatus } from './importUtils';

interface ImportPreviewTableProps {
  rows: ImportRow[];
  filterStatus?: RowStatus | 'all';
}

const STATUS_STYLES: Record<RowStatus, string> = {
  valid:     'bg-green-950/20 text-green-400 border-green-500/30',
  warning:   'bg-yellow-950/20 text-yellow-400 border-yellow-500/30',
  duplicate: 'bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border-[rgba(212,175,55,0.3)]',
  error:     'bg-red-950/20 text-red-400 border-red-500/30',
};

const STATUS_LABELS: Record<RowStatus, string> = {
  valid:     'Listo',
  warning:   'Warning',
  duplicate: 'Duplicado',
  error:     'Error',
};

const PAGE_SIZE = 50;

export function ImportPreviewTable({ rows, filterStatus = 'all' }: ImportPreviewTableProps) {
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<RowStatus | 'all'>(filterStatus);

  const filtered = activeFilter === 'all'
    ? rows
    : rows.filter((r) => r._status === activeFilter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filterBtns: Array<{ key: RowStatus | 'all'; label: string; count: number }> = [
    { key: 'all',       label: 'Todos',      count: rows.length },
    { key: 'valid',     label: 'Listos',     count: rows.filter((r) => r._status === 'valid').length },
    { key: 'warning',   label: 'Warnings',   count: rows.filter((r) => r._status === 'warning').length },
    { key: 'duplicate', label: 'Duplicados', count: rows.filter((r) => r._status === 'duplicate').length },
    { key: 'error',     label: 'Errores',    count: rows.filter((r) => r._status === 'error').length },
  ].filter((b) => b.count > 0 || b.key === 'all');

  return (
    <div className="space-y-3">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {filterBtns.map((btn) => (
          <button
            key={btn.key}
            onClick={() => { setActiveFilter(btn.key); setPage(1); }}
            className={`text-[10px] font-semibold px-3 py-1 rounded-full border transition-all ${
              activeFilter === btn.key
                ? 'bg-[#D4AF37] text-[#050814] border-[#D4AF37]'
                : 'border-[rgba(212,175,55,0.2)] text-[#94A3B8] hover:border-[#D4AF37]'
            }`}
          >
            {btn.label} ({btn.count})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-[rgba(212,175,55,0.15)] bg-[#0D1428] text-[10px] font-semibold text-[#D4AF37] uppercase tracking-wider">
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Estado</th>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Teléfono</th>
              <th className="p-3 text-left">País</th>
              <th className="p-3 text-left">Activo</th>
              <th className="p-3 text-left">Fuente</th>
              <th className="p-3 text-left">Notas / Errores</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row._rowIndex}
                className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(212,175,55,0.02)] transition-colors"
              >
                <td className="p-3 text-[#4A6080] font-mono">{row._rowIndex}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_STYLES[row._status]}`}>
                    {STATUS_LABELS[row._status]}
                  </span>
                </td>
                <td className="p-3 font-semibold text-[#F8FAFC] max-w-[140px] truncate">
                  {row.first_name} {row.last_name}
                </td>
                <td className="p-3 text-[#94A3B8] font-mono max-w-[160px] truncate">
                  {row.email || <span className="text-[#334155]">—</span>}
                </td>
                <td className="p-3 text-[#94A3B8] font-mono">
                  {row.phone || <span className="text-[#334155]">—</span>}
                </td>
                <td className="p-3 text-[#94A3B8]">
                  {row.country || <span className="text-[#334155]">—</span>}
                </td>
                <td className="p-3">
                  {row.campaign_asset ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border border-[rgba(212,175,55,0.2)]">
                      {row.campaign_asset}
                    </span>
                  ) : <span className="text-[#334155]">—</span>}
                </td>
                <td className="p-3 text-[#94A3B8] max-w-[120px] truncate">
                  {row.source || <span className="text-[#334155]">—</span>}
                </td>
                <td className="p-3 max-w-[200px]">
                  {row._errors.map((e, i) => (
                    <p key={i} className="text-red-400 text-[9px]">{e}</p>
                  ))}
                  {row._warnings.map((w, i) => (
                    <p key={i} className="text-yellow-400 text-[9px]">{w}</p>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="text-center py-8 text-[#4A6080] text-sm">Sin filas para mostrar.</p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#4A6080]">
          <span>
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded hover:text-[#D4AF37] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded hover:text-[#D4AF37] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
