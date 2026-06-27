import { useRef, useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';

interface FileDropzoneProps {
  onFileAccepted: (file: File) => void;
  loading?: boolean;
  error?: string | null;
}

const ACCEPTED = ['.xlsx', '.csv', '.xls'];
const MAX_MB = 20;

export function FileDropzone({ onFileAccepted, loading, error }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validate = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      return `Formato no soportado. Usa ${ACCEPTED.join(', ')}`;
    }
    if (file.size === 0) return 'El archivo está vacío';
    if (file.size > MAX_MB * 1024 * 1024) return `El archivo supera ${MAX_MB} MB`;
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      setLocalError(null);
      const err = validate(file);
      if (err) { setLocalError(err); return; }
      onFileAccepted(file);
    },
    [onFileAccepted]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const displayError = localError ?? error;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-4 p-12 rounded-xl border-2 border-dashed cursor-pointer transition-all
          ${dragging
            ? 'border-[#D4AF37] bg-[rgba(212,175,55,0.08)]'
            : 'border-[rgba(212,175,55,0.2)] bg-[rgba(8,15,32,0.5)] hover:border-[rgba(212,175,55,0.4)] hover:bg-[rgba(212,175,55,0.04)]'
          }
          ${loading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,.xls"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />

        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)]">
          {loading
            ? <div className="h-6 w-6 rounded-full border-2 border-[rgba(212,175,55,0.2)] border-t-[#D4AF37] animate-spin" />
            : <Upload className="h-7 w-7 text-[#D4AF37]" />
          }
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-[#F8FAFC]">
            {loading ? 'Procesando archivo...' : 'Arrastra tu archivo aquí'}
          </p>
          <p className="text-xs text-[#4A6080] mt-1">
            o <span className="text-[#D4AF37] underline">haz clic para seleccionar</span>
          </p>
          <p className="text-[10px] text-[#334155] mt-2">
            Formatos: .xlsx, .csv &nbsp;·&nbsp; Máximo {MAX_MB} MB
          </p>
        </div>

        {/* Supported formats chips */}
        <div className="flex gap-2">
          {ACCEPTED.map((ext) => (
            <span
              key={ext}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.04)] text-[#D4AF37]"
            >
              <FileSpreadsheet className="h-3 w-3" />
              {ext.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {displayError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-red-400 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
