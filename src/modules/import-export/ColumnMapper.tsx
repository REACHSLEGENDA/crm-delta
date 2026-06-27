import { TARGET_LABELS, type ColumnMapping, type TargetField } from './importUtils';

interface ColumnMapperProps {
  headers: string[];
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
}

const TARGET_OPTIONS: TargetField[] = [
  'full_name', 'email', 'phone', 'country',
  'campaign_name', 'source', 'interest_intent', 'registered_at', '__skip__',
];

const REQUIRED: TargetField[] = ['full_name', 'email', 'phone'];

export function ColumnMapper({ headers, mapping, onChange }: ColumnMapperProps) {
  const usedTargets = Object.values(mapping).filter((t) => t !== '__skip__');

  const handleChange = (header: string, target: TargetField) => {
    onChange({ ...mapping, [header]: target });
  };

  const isRequired = (target: TargetField) => REQUIRED.includes(target);

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#4A6080]">
        Verifica que cada columna del archivo corresponda al campo correcto del CRM.
        Los campos marcados con <span className="text-red-400">*</span> son obligatorios (al menos nombre + email o teléfono).
      </p>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(212,175,55,0.15)] bg-[#0D1428] text-[10px] font-semibold text-[#D4AF37] uppercase tracking-wider">
              <th className="p-3 text-left">Columna en el archivo</th>
              <th className="p-3 text-left">Campo del CRM</th>
              <th className="p-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((header) => {
              const target = mapping[header] ?? '__skip__';
              const isSkipped = target === '__skip__';
              const isReq = isRequired(target);
              const isDuplicated =
                !isSkipped &&
                usedTargets.filter((t) => t === target).length > 1;

              return (
                <tr
                  key={header}
                  className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(212,175,55,0.03)] transition-colors"
                >
                  <td className="p-3">
                    <span className="font-mono text-xs text-[#E2E8F0] bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.12)] px-2 py-0.5 rounded">
                      {header}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={target}
                      onChange={(e) => handleChange(header, e.target.value as TargetField)}
                      className={`px-2 py-1.5 text-xs rounded border focus:outline-none bg-[#050814] text-[#94A3B8]
                        ${isDuplicated
                          ? 'border-yellow-500/50 text-yellow-400'
                          : 'border-[rgba(212,175,55,0.15)] focus:border-[#D4AF37]'
                        }`}
                    >
                      {TARGET_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {TARGET_LABELS[opt]}
                          {isRequired(opt) ? ' *' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    {isSkipped ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#17213D] text-[#4A6080] border border-[rgba(255,255,255,0.05)]">
                        Omitida
                      </span>
                    ) : isDuplicated ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-950/20 text-yellow-400 border border-yellow-500/30">
                        Duplicada
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-green-950/20 text-green-400 border border-green-500/30 flex items-center gap-1 w-fit">
                        {isReq ? '✓ Requerida' : '✓ Mapeada'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {TARGET_OPTIONS.filter((t) => t !== '__skip__').map((opt) => {
          const mapped = Object.values(mapping).includes(opt);
          return (
            <span
              key={opt}
              className={`text-[10px] px-2 py-0.5 rounded border ${
                mapped
                  ? 'bg-green-950/20 text-green-400 border-green-500/30'
                  : isRequired(opt)
                  ? 'bg-red-950/20 text-red-400 border-red-500/30'
                  : 'bg-[#17213D] text-[#4A6080] border-[rgba(255,255,255,0.05)]'
              }`}
            >
              {TARGET_LABELS[opt]}
              {isRequired(opt) && !mapped ? ' — FALTA' : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}
