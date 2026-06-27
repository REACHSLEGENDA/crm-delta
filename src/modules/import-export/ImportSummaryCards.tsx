import { CheckCircle2, AlertTriangle, XCircle, Copy, FileText } from 'lucide-react';
import type { ImportStats } from './importUtils';

interface ImportSummaryCardsProps {
  stats: ImportStats;
  showImportable?: boolean;
}

export function ImportSummaryCards({ stats, showImportable = true }: ImportSummaryCardsProps) {
  const importable = stats.valid + stats.warnings;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="glass-card p-4 text-center space-y-1 col-span-2 md:col-span-1">
        <FileText className="h-5 w-5 text-[#94A3B8] mx-auto" />
        <p className="text-2xl font-mono-numbers font-bold text-[#F8FAFC]">{stats.total}</p>
        <p className="text-[10px] text-[#4A6080] uppercase tracking-wider font-semibold">Total Filas</p>
      </div>

      {showImportable && (
        <div className="glass-card card-accent-green p-4 text-center space-y-1">
          <CheckCircle2 className="h-5 w-5 text-[#22C55E] mx-auto" />
          <p className="text-2xl font-mono-numbers font-bold text-[#22C55E]">{importable}</p>
          <p className="text-[10px] text-[#4A6080] uppercase tracking-wider font-semibold">Para importar</p>
        </div>
      )}

      <div className="glass-card card-accent-gold p-4 text-center space-y-1">
        <AlertTriangle className="h-5 w-5 text-[#F59E0B] mx-auto" />
        <p className="text-2xl font-mono-numbers font-bold text-[#F59E0B]">{stats.warnings}</p>
        <p className="text-[10px] text-[#4A6080] uppercase tracking-wider font-semibold">Warnings</p>
      </div>

      <div className="glass-card p-4 text-center space-y-1 border border-[rgba(212,175,55,0.2)]">
        <Copy className="h-5 w-5 text-[#D4AF37] mx-auto" />
        <p className="text-2xl font-mono-numbers font-bold text-[#D4AF37]">{stats.duplicates}</p>
        <p className="text-[10px] text-[#4A6080] uppercase tracking-wider font-semibold">Duplicados</p>
      </div>

      <div className="glass-card card-accent-electric p-4 text-center space-y-1" style={{ '--before-color': '#EF4444' } as React.CSSProperties}>
        <XCircle className="h-5 w-5 text-red-400 mx-auto" />
        <p className="text-2xl font-mono-numbers font-bold text-red-400">{stats.errors}</p>
        <p className="text-[10px] text-[#4A6080] uppercase tracking-wider font-semibold">Errores</p>
      </div>
    </div>
  );
}
