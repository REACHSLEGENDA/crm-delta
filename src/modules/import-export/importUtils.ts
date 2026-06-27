import * as XLSX from 'xlsx';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RowStatus = 'valid' | 'warning' | 'duplicate' | 'error';

export interface ImportRow {
  _rowIndex: number;
  _status: RowStatus;
  _errors: string[];
  _warnings: string[];
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  campaign_name: string;
  campaign_asset: string;
  source: string;
  interest_intent: string;
  registered_at: string | null;
  _raw: Record<string, unknown>;
}

export type TargetField =
  | 'full_name'
  | 'email'
  | 'phone'
  | 'country'
  | 'campaign_name'
  | 'source'
  | 'interest_intent'
  | 'registered_at'
  | '__skip__';

export type ColumnMapping = Record<string, TargetField>;

export interface ParsedFile {
  headers: string[];
  rawRows: Record<string, unknown>[];
  fileName: string;
  fileSize: number;
  rowCount: number;
}

// ─── Column detection ────────────────────────────────────────────────────────

const HEADER_MAP: Record<string, TargetField> = {
  'nombre lead':   'full_name',
  'nombre':        'full_name',
  'name':          'full_name',
  'full name':     'full_name',
  'fullname':      'full_name',
  'email':         'email',
  'correo':        'email',
  'e-mail':        'email',
  'phonenumber':   'phone',
  'phone':         'phone',
  'teléfono':      'phone',
  'telefono':      'phone',
  'celular':       'phone',
  'ciudad':        'country',
  'country':       'country',
  'país':          'country',
  'pais':          'country',
  'campaña':       'campaign_name',
  'campaign':      'campaign_name',
  'campana':       'campaign_name',
  'web':           'source',
  'fuente':        'source',
  'source':        'source',
  'direccion':     'interest_intent',
  'dirección':     'interest_intent',
  'intention':     'interest_intent',
  'intención':     'interest_intent',
  'fecha registro':'registered_at',
  'fecha_registro':'registered_at',
  'fecharegistro': 'registered_at',
  'registration date': 'registered_at',
};

export const TARGET_LABELS: Record<TargetField, string> = {
  full_name:       'Nombre completo',
  email:           'Email',
  phone:           'Teléfono',
  country:         'País / Ciudad',
  campaign_name:   'Campaña',
  source:          'Fuente (Web)',
  interest_intent: 'Intención',
  registered_at:   'Fecha de Registro',
  __skip__:        'No importar',
};

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const h of headers) {
    const key = h.toLowerCase().trim();
    mapping[h] = HEADER_MAP[key] ?? '__skip__';
  }
  return mapping;
}

// ─── Normalization helpers ───────────────────────────────────────────────────

const COUNTRY_MAP: Record<string, string> = {
  'mexico': 'México', 'méxico': 'México',
  'peru': 'Perú', 'perú': 'Perú',
  'colombia': 'Colombia',
  'el salvador': 'El Salvador',
  'us': 'Estados Unidos', 'usa': 'Estados Unidos', 'estados unidos': 'Estados Unidos',
  'venezuela': 'Venezuela',
  'argentina': 'Argentina',
  'chile': 'Chile',
  'ecuador': 'Ecuador',
  'bolivia': 'Bolivia',
  'paraguay': 'Paraguay',
  'uruguay': 'Uruguay',
  'costa rica': 'Costa Rica',
  'panama': 'Panamá', 'panamá': 'Panamá',
  'guatemala': 'Guatemala',
  'honduras': 'Honduras',
  'nicaragua': 'Nicaragua',
  'cuba': 'Cuba',
  'republica dominicana': 'República Dominicana',
  'república dominicana': 'República Dominicana',
};

const SOURCE_MAP: Record<string, string> = {
  'aprender_trading': 'Aprender trading',
  'oportunidades_de_mercado': 'Oportunidades de mercado',
  'diversificación': 'Diversificación',
  'diversificacion': 'Diversificación',
  'protección_de_capital': 'Protección de capital',
  'proteccion_de_capital': 'Protección de capital',
};

const INTENT_MAP: Record<string, string> = {
  'estoy_investigando_opciones': 'Estoy investigando opciones',
  'busco_asesoría_especializada': 'Busco asesoría especializada',
  'busco_asesoria_especializada': 'Busco asesoría especializada',
  'quiero_empezar_pronto': 'Quiero empezar pronto',
  'ya_invierto_y_busco_nuevas_alternativas': 'Ya invierto y busco nuevas alternativas',
};

function normalizeCountry(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return COUNTRY_MAP[lower] ?? (raw.trim() || '');
}

function normalizeSource(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return SOURCE_MAP[lower] ?? raw.replace(/_/g, ' ').trim();
}

function normalizeIntent(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return INTENT_MAP[lower] ?? raw.replace(/_/g, ' ').trim();
}

function detectCampaignAsset(name: string): string {
  const u = name.toUpperCase();
  if (u.includes('ORO'))                         return 'Oro';
  if (u.includes('PETROLEO') || u.includes('PETRÓLEO')) return 'Petróleo';
  if (u.includes('PLATA'))                       return 'Plata';
  if (u.includes('FOREX'))                       return 'Forex';
  if (u.includes('CRYPTO') || u.includes('CRIPTO')) return 'Crypto';
  if (u.includes('ACCIONES'))                    return 'Acciones';
  return '';
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function splitName(full: string): { first_name: string; last_name: string } {
  const parts = full.trim().replace(/\s+/g, ' ').split(' ');
  if (parts.length === 0 || parts[0] === '') return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

// Phone numbers come as JavaScript numbers from Excel (e.g. 522224247425).
// We must convert to string immediately without losing precision.
function rawPhoneToString(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';
  // Number → convert before floating point issues
  if (typeof val === 'number') {
    return Math.round(val).toString();
  }
  const str = String(val)
    .replace(/\.0+$/, '')   // remove .0 suffix if Excel coerced to float
    .replace(/[^\d+]/g, ''); // keep digits and leading +
  return str;
}

// ─── Row normalizer ──────────────────────────────────────────────────────────

export function normalizeImportedLead(
  row: Record<string, unknown>,
  mapping: ColumnMapping,
  rowIndex: number
): ImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Collect raw values per target field
  const vals: Partial<Record<TargetField, string>> = {};
  for (const [col, target] of Object.entries(mapping)) {
    if (target === '__skip__') continue;
    const rawVal = row[col];
    // Phone needs special handling
    if (target === 'phone') {
      vals.phone = rawPhoneToString(rawVal);
    } else {
      vals[target] = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
    }
  }

  // 1. Name
  const fullName = (vals.full_name ?? '').replace(/\s+/g, ' ').trim();
  const { first_name, last_name } = splitName(fullName);
  if (!first_name) errors.push('Nombre requerido');

  // 2. Email
  const email = (vals.email ?? '').toLowerCase().trim();
  const phone = vals.phone ?? '';
  if (!email && !phone) {
    errors.push('Se requiere email o teléfono');
  } else if (email && !isValidEmail(email)) {
    errors.push(`Email con formato inválido`);
  } else if (!email && phone) {
    warnings.push('Sin email — solo teléfono');
  }

  // 3. Country
  const country = vals.country ? normalizeCountry(vals.country) : '';

  // 4. Campaign
  const campaign_name = (vals.campaign_name ?? '').trim();
  const campaign_asset = detectCampaignAsset(campaign_name);

  // 5. Source
  const source = vals.source ? normalizeSource(vals.source) : '';

  // 6. Intent
  const interest_intent = vals.interest_intent ? normalizeIntent(vals.interest_intent) : '';

  // 7. Date
  let registered_at: string | null = null;
  const rawDate = vals.registered_at ?? '';
  if (rawDate) {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) {
      warnings.push('Fecha inválida — se usará fecha de hoy');
    } else {
      registered_at = d.toISOString();
    }
  }

  const status: RowStatus =
    errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid';

  return {
    _rowIndex: rowIndex,
    _status: status,
    _errors: errors,
    _warnings: warnings,
    first_name,
    last_name,
    email,
    phone,
    country,
    campaign_name,
    campaign_asset,
    source,
    interest_intent,
    registered_at,
    _raw: row,
  };
}

// ─── File parser ─────────────────────────────────────────────────────────────

export async function parseExcelFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array', raw: true, cellDates: false });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        // header:1 gives us rows as arrays first, then objects
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: '',
          raw: true,
        });

        if (rawRows.length === 0) {
          reject(new Error('El archivo no contiene datos'));
          return;
        }

        const headers = Object.keys(rawRows[0]);
        resolve({
          headers,
          rawRows,
          fileName: file.name,
          fileSize: file.size,
          rowCount: rawRows.length,
        });
      } catch {
        reject(new Error('No se pudo leer el archivo. Verifica que sea .xlsx o .csv válido.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Duplicate detection ─────────────────────────────────────────────────────

export function detectInternalDuplicates(rows: ImportRow[]): ImportRow[] {
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  return rows.map((row) => {
    if (row._status === 'error') return row;
    const dupEmail = row.email && seenEmails.has(row.email);
    const dupPhone = row.phone && seenPhones.has(row.phone);
    if (dupEmail || dupPhone) {
      return {
        ...row,
        _status: 'duplicate' as RowStatus,
        _warnings: [...row._warnings, dupEmail ? 'Email duplicado en el archivo' : 'Teléfono duplicado en el archivo'],
      };
    }
    if (row.email) seenEmails.add(row.email);
    if (row.phone) seenPhones.add(row.phone);
    return row;
  });
}

export function markDbDuplicates(
  rows: ImportRow[],
  existingEmails: Set<string>,
  existingPhones: Set<string>
): ImportRow[] {
  return rows.map((row) => {
    if (row._status === 'error') return row;
    const dupEmail = row.email && existingEmails.has(row.email);
    const dupPhone = row.phone && existingPhones.has(row.phone);
    if (dupEmail || dupPhone) {
      return {
        ...row,
        _status: 'duplicate' as RowStatus,
        _warnings: [
          ...row._warnings,
          dupEmail ? 'Email ya existe en la BD' : 'Teléfono ya existe en la BD',
        ],
      };
    }
    return row;
  });
}

// ─── Stats helper ─────────────────────────────────────────────────────────────

export interface ImportStats {
  total: number;
  valid: number;
  warnings: number;
  duplicates: number;
  errors: number;
}

export function computeStats(rows: ImportRow[]): ImportStats {
  return {
    total:      rows.length,
    valid:      rows.filter((r) => r._status === 'valid').length,
    warnings:   rows.filter((r) => r._status === 'warning').length,
    duplicates: rows.filter((r) => r._status === 'duplicate').length,
    errors:     rows.filter((r) => r._status === 'error').length,
  };
}
