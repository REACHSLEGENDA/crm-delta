import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Lead } from '@/types';

export interface ExportFilters {
  status?: string;
  agentId?: string;
  campaignName?: string;
  campaignAsset?: string;
  batchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Columns included in exports
const EXPORT_COLUMNS: Array<{ key: keyof Lead | string; label: string }> = [
  { key: 'id',               label: 'ID' },
  { key: 'first_name',       label: 'Nombre' },
  { key: 'last_name',        label: 'Apellido' },
  { key: 'email',            label: 'Email' },
  { key: 'phone',            label: 'Teléfono' },
  { key: 'country',          label: 'País' },
  { key: 'campaign_name',    label: 'Campaña' },
  { key: 'campaign_asset',   label: 'Activo' },
  { key: 'source',           label: 'Fuente' },
  { key: 'interest_intent',  label: 'Intención' },
  { key: 'status',           label: 'Estado' },
  { key: 'investment_capacity', label: 'Capacidad Inversión' },
  { key: 'comments',         label: 'Comentarios' },
  { key: 'registered_at',    label: 'Fecha Registro' },
  { key: 'created_at',       label: 'Fecha Creación' },
  { key: 'updated_at',       label: 'Última Actualización' },
];

function leadsToRows(leads: Lead[]): Record<string, string>[] {
  return leads.map((lead) => {
    const row: Record<string, string> = {};
    for (const col of EXPORT_COLUMNS) {
      const val = (lead as Record<string, unknown>)[col.key];
      row[col.label] = val != null ? String(val) : '';
    }
    return row;
  });
}

export function exportToCSV(leads: Lead[], fileName = 'leads'): void {
  const rows = leadsToRows(leads);
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${fileName}.csv`);
}

export function exportToXLSX(leads: Lead[], fileName = 'leads'): void {
  const rows = leadsToRows(leads);
  const ws = XLSX.utils.json_to_sheet(rows);

  // Style header row width
  const colWidths = EXPORT_COLUMNS.map((c) => ({ wch: Math.max(c.label.length + 4, 14) }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileName}.xlsx`);
}

// Export import errors as CSV
export function exportErrorsToCSV(
  errors: Array<{ row_number: number; error_type: string; message: string; raw_data: Record<string, unknown> }>,
  fileName = 'errores'
): void {
  const rows = errors.map((e) => ({
    'Fila':       String(e.row_number),
    'Tipo Error': e.error_type,
    'Mensaje':    e.message,
    'Datos Originales': JSON.stringify(e.raw_data),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${fileName}.csv`);
}

export function applyExportFilters(leads: Lead[], filters: ExportFilters): Lead[] {
  return leads.filter((l) => {
    if (filters.status && l.status !== filters.status) return false;
    if (filters.agentId && l.agent_id !== filters.agentId) return false;
    if (filters.campaignName && l.campaign_name !== filters.campaignName) return false;
    if (filters.campaignAsset && l.campaign_asset !== filters.campaignAsset) return false;
    if (filters.batchId && l.import_batch_id !== filters.batchId) return false;
    if (filters.dateFrom && l.created_at < filters.dateFrom) return false;
    if (filters.dateTo && l.created_at > filters.dateTo) return false;
    return true;
  });
}
