import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/useAuth';
import {
  parseExcelFile,
  detectColumnMapping,
  normalizeImportedLead,
  detectInternalDuplicates,
  markDbDuplicates,
  computeStats,
  type ParsedFile,
  type ImportRow,
  type ColumnMapping,
  type ImportStats,
} from './importUtils';

export type ImportStep = 1 | 2 | 3 | 4 | 5 | 6;

export type DuplicateAction = 'skip' | 'update' | 'import_anyway';

export type AssignmentMode = 'none' | 'single' | 'round_robin';

export interface ImportOptions {
  duplicateAction: DuplicateAction;
  assignmentMode: AssignmentMode;
  selectedAgentId: string;
  status: string;
}

export interface ImportResult {
  batchId: string;
  imported: number;
  skipped: number;
  errors: number;
  duplicates: number;
  total: number;
}

const DEFAULT_OPTIONS: ImportOptions = {
  duplicateAction: 'skip',
  assignmentMode: 'none',
  selectedAgentId: '',
  status: 'Nuevo',
};

export function useLeadImport() {
  const { profile } = useAuth();

  const [step, setStep] = useState<ImportStep>(1);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [options, setOptions] = useState<ImportOptions>(DEFAULT_OPTIONS);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — parse file
  const handleFileAccepted = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const parsed = await parseExcelFile(file);
      setParsedFile(parsed);
      setMapping(detectColumnMapping(parsed.headers));
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al leer el archivo');
    } finally {
      setLoading(false);
    }
  }, []);

  // Step 2 → 3 — validate all rows
  const handleMappingConfirmed = useCallback(async () => {
    if (!parsedFile) return;
    setLoading(true);
    setError(null);
    try {
      // Normalize all rows
      let normalized = parsedFile.rawRows.map((row, i) =>
        normalizeImportedLead(row, mapping, i + 2) // +2: header = row 1
      );

      // Internal duplicates first
      normalized = detectInternalDuplicates(normalized);

      // DB duplicate check — batch email + phone lookups
      const emails = normalized
        .filter((r) => r.email)
        .map((r) => r.email);
      const phones = normalized
        .filter((r) => r.phone)
        .map((r) => r.phone);

      const chunkSize = 50;
      
      const fetchEmails = async () => {
        if (!emails.length) return { data: [] };
        const results = [];
        for (let i = 0; i < emails.length; i += chunkSize) {
          const chunk = emails.slice(i, i + chunkSize);
          const { data, error } = await supabase.from('leads').select('email').in('email', chunk);
          if (error) throw error;
          if (data) results.push(...data);
        }
        return { data: results };
      };

      const fetchPhones = async () => {
        if (!phones.length) return { data: [] };
        const results = [];
        for (let i = 0; i < phones.length; i += chunkSize) {
          const chunk = phones.slice(i, i + chunkSize);
          const { data, error } = await supabase.from('leads').select('phone').in('phone', chunk);
          if (error) throw error;
          if (data) results.push(...data);
        }
        return { data: results };
      };

      const [emailRes, phoneRes] = await Promise.all([
        fetchEmails(),
        fetchPhones()
      ]);

      const existingEmails = new Set(
        ((emailRes.data ?? []) as Array<{ email: string }>).map((r) => r.email)
      );
      const existingPhones = new Set(
        ((phoneRes.data ?? []) as Array<{ phone: string }>).map((r) => r.phone)
      );

      normalized = markDbDuplicates(normalized, existingEmails, existingPhones);

      setRows(normalized);
      setStats(computeStats(normalized));
      setStep(3);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al validar los datos');
    } finally {
      setLoading(false);
    }
  }, [parsedFile, mapping]);

  // Step 3 → 4
  const handlePreviewConfirmed = useCallback(() => {
    setStep(4);
  }, []);

  // Step 4 → 5 — insert into Supabase
  const handleImportConfirmed = useCallback(async (agents: Array<{ id: string }>) => {
    if (!parsedFile || !profile) return;
    setLoading(true);
    setError(null);

    try {
      // Decide which rows to insert
      const toInsert = rows.filter((r) => {
        if (r._status === 'error') return false;
        if (r._status === 'duplicate') {
          return options.duplicateAction === 'import_anyway';
        }
        return true;
      });

      const skipped = rows.filter(
        (r) => r._status === 'duplicate' && options.duplicateAction === 'skip'
      ).length;

      // Build agent round-robin if needed
      const agentPool =
        options.assignmentMode === 'round_robin' && agents.length > 0
          ? agents.map((a) => a.id)
          : [];

      // Create import batch record
      const { data: batch, error: batchErr } = await supabase
        .from('import_batches')
        .insert({
          created_by:    profile.id,
          team_id:       profile.team_id ?? null,
          file_name:     parsedFile.fileName,
          file_type:     parsedFile.fileName.split('.').pop()?.toUpperCase() ?? 'XLSX',
          total_rows:    parsedFile.rowCount,
          imported_rows: 0,
          skipped_rows:  skipped,
          error_rows:    rows.filter((r) => r._status === 'error').length,
          duplicate_rows: rows.filter((r) => r._status === 'duplicate').length,
          status:        'processing',
          options:       options as unknown as Record<string, unknown>,
        })
        .select()
        .single();

      if (batchErr || !batch) throw new Error('No se pudo crear el lote de importación');

      const batchId: string = batch.id;

      // Build insert payload in chunks of 100
      const CHUNK = 100;
      let importedCount = 0;
      const errorRows: Array<{
        batch_id: string;
        row_number: number;
        error_type: string;
        message: string;
        raw_data: Record<string, unknown>;
      }> = [];

      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const chunk = toInsert.slice(i, i + CHUNK);
        const payload = chunk.map((row, idx) => {
          let agentId: string | null = null;
          if (options.assignmentMode === 'single' && options.selectedAgentId) {
            agentId = options.selectedAgentId;
          } else if (options.assignmentMode === 'round_robin' && agentPool.length > 0) {
            agentId = agentPool[(i + idx) % agentPool.length];
          }

          return {
            first_name:     row.first_name || 'Sin nombre',
            last_name:      row.last_name,
            email:          row.email || null,
            phone:          row.phone || null,
            country:        row.country || null,
            campaign_name:  row.campaign_name || null,
            campaign_asset: row.campaign_asset || null,
            source:         row.source || null,
            interest_intent: row.interest_intent || null,
            registered_at:  row.registered_at ?? null,
            status:         options.status,
            agent_id:       agentId,
            team_id:        profile.team_id ?? null,
            created_by:     profile.id,
            import_batch_id: batchId,
            raw_data:       row._raw,
          };
        });

        const { error: insertErr } = await supabase.from('leads').insert(payload);
        if (insertErr) {
          chunk.forEach((row) => {
            errorRows.push({
              batch_id:   batchId,
              row_number: row._rowIndex,
              error_type: 'insert_error',
              message:    insertErr.message,
              raw_data:   row._raw,
            });
          });
        } else {
          importedCount += chunk.length;
        }
      }

      // Save error rows
      if (errorRows.length > 0) {
        await supabase.from('import_errors').insert(errorRows);
      }

      // Update batch with final counts
      await supabase
        .from('import_batches')
        .update({
          imported_rows: importedCount,
          error_rows: rows.filter((r) => r._status === 'error').length + errorRows.length,
          status: 'completed',
        })
        .eq('id', batchId);

      setResult({
        batchId,
        imported: importedCount,
        skipped,
        errors: rows.filter((r) => r._status === 'error').length + errorRows.length,
        duplicates: rows.filter((r) => r._status === 'duplicate').length,
        total: parsedFile.rowCount,
      });
      setStep(6);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error durante la importación');
    } finally {
      setLoading(false);
    }
  }, [rows, parsedFile, profile, options]);

  const reset = useCallback(() => {
    setStep(1);
    setParsedFile(null);
    setMapping({});
    setRows([]);
    setStats(null);
    setOptions(DEFAULT_OPTIONS);
    setResult(null);
    setError(null);
  }, []);

  return {
    step, setStep,
    parsedFile,
    mapping, setMapping,
    rows,
    stats,
    options, setOptions,
    result,
    loading,
    error,
    handleFileAccepted,
    handleMappingConfirmed,
    handlePreviewConfirmed,
    handleImportConfirmed,
    reset,
  };
}
