'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import type { TradeEntry } from '@/types/journal';

interface CSVImportExportProps {
  accountId: string | null;
  accounts: Array<{ id: string; name: string }>;
  onTradesImported?: () => void;
  className?: string;
}

export default function CSVImportExport({
  accountId,
  accounts,
  onTradesImported,
  className = ''
}: CSVImportExportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const exportToCSV = async () => {
    try {
      setIsExporting(true);
      setError(null);
      setSuccess(null);

      let query = supabase
        .from('trade_entries' as any)
        .select('*')
        .eq('status', 'closed')
        .order('entry_date', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data: trades, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(`Failed to fetch trades: ${fetchError.message}`);
      }

      if (!trades || trades.length === 0) {
        setError('No trades to export');
        return;
      }

      // Get account names for mapping
      const accountMap = new Map(accounts.map((acc) => [acc.id, acc.name]));

      // Convert trades to CSV format
      const headers = [
        'Date',
        'Time',
        'Symbol',
        'Direction',
        'RR',
        'Max Adverse',
        'Risk Multiplier',
        'Notes',
        'Image URL',
        'Account'
      ];

      const csvRows = [
        headers.join(','),
        ...(trades as any[]).map((trade) => {
          const date = new Date(trade.entry_date);
          const dateStr = date.toISOString().split('T')[0];
          const timeStr = date.toTimeString().slice(0, 5);
          const accountName = accountMap.get(trade.account_id) || 'Unknown';

          return [
            dateStr,
            timeStr,
            trade.symbol || '',
            trade.side || '',
            trade.rr || '',
            trade.max_adverse || '',
            trade.risk_multiplier || '1',
            `"${(trade.notes || '').replace(/"/g, '""')}"`,
            trade.image_url || '',
            accountName
          ].join(',');
        })
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `trades_export_${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(`Exported ${trades.length} trades successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError(err instanceof Error ? err.message : 'Failed to export trades');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const importFromCSV = async (file: File) => {
    try {
      setIsImporting(true);
      setError(null);
      setSuccess(null);

      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        throw new Error(
          'CSV file must contain at least a header row and one data row'
        );
      }

      // Parse header
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const dateIdx = headers.findIndex((h) => h.includes('date'));
      const timeIdx = headers.findIndex((h) => h.includes('time'));
      const symbolIdx = headers.findIndex((h) => h.includes('symbol'));
      const directionIdx = headers.findIndex(
        (h) => h.includes('direction') || h.includes('side')
      );
      const rrIdx = headers.findIndex((h) => h === 'rr' || h.includes('rr'));
      const maxAdverseIdx = headers.findIndex(
        (h) => h.includes('max') || h.includes('adverse')
      );
      const riskMultiplierIdx = headers.findIndex(
        (h) => h.includes('risk') || h.includes('multiplier')
      );
      const notesIdx = headers.findIndex((h) => h.includes('note'));
      const imageUrlIdx = headers.findIndex(
        (h) => h.includes('image') || h.includes('url')
      );
      const accountIdx = headers.findIndex((h) => h.includes('account'));

      if (
        dateIdx === -1 ||
        symbolIdx === -1 ||
        directionIdx === -1 ||
        rrIdx === -1
      ) {
        throw new Error(
          'CSV must contain Date, Symbol, Direction, and RR columns'
        );
      }

      // Get user
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Determine account to use
      let targetAccountId = accountId;
      if (!targetAccountId && accounts.length > 0) {
        targetAccountId = accounts[0].id;
      }
      if (!targetAccountId) {
        throw new Error(
          'No account available. Please create an account first.'
        );
      }

      // Parse and import trades
      const tradesToImport: any[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          // Parse CSV line (handle quoted values)
          const values: string[] = [];
          let current = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());

          const dateStr = values[dateIdx] || '';
          const timeStr = values[timeIdx] || '00:00';
          const symbol = (values[symbolIdx] || '').toUpperCase();
          const direction = (values[directionIdx] || 'long').toLowerCase();
          const rr = parseFloat(values[rrIdx] || '0');
          const maxAdverse = values[maxAdverseIdx]
            ? parseFloat(values[maxAdverseIdx])
            : null;
          const riskMultiplier = values[riskMultiplierIdx]
            ? parseFloat(values[riskMultiplierIdx])
            : 1.0;
          const notes = values[notesIdx]
            ? values[notesIdx].replace(/^"|"$/g, '')
            : null;
          const imageUrl = values[imageUrlIdx] || null;

          // Handle account name mapping if provided
          let finalAccountId = targetAccountId;
          if (accountIdx !== -1 && values[accountIdx]) {
            const accountName = values[accountIdx];
            const foundAccount = accounts.find(
              (acc) => acc.name === accountName
            );
            if (foundAccount) {
              finalAccountId = foundAccount.id;
            }
          }

          if (!symbol || isNaN(rr)) {
            errorCount++;
            continue;
          }

          // Parse date and time
          const entryDateTime = new Date(`${dateStr}T${timeStr}`);
          if (isNaN(entryDateTime.getTime())) {
            errorCount++;
            continue;
          }

          tradesToImport.push({
            account_id: finalAccountId,
            user_id: user.id,
            symbol,
            side: direction === 'short' ? 'short' : 'long',
            entry_date: entryDateTime.toISOString(),
            rr,
            max_adverse: maxAdverse,
            risk_multiplier: riskMultiplier,
            status: 'closed',
            notes,
            image_url: imageUrl,
            entry_price: 0,
            exit_price: null,
            size: 1.0,
            pnl_amount: null,
            pnl_percentage: null
          });
        } catch (err) {
          console.error(`Error parsing line ${i + 1}:`, err);
          errorCount++;
        }
      }

      if (tradesToImport.length === 0) {
        throw new Error('No valid trades found in CSV file');
      }

      // Insert trades in batches
      const batchSize = 50;
      for (let i = 0; i < tradesToImport.length; i += batchSize) {
        const batch = tradesToImport.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('trade_entries' as any)
          .insert(batch);

        if (insertError) {
          console.error('Error inserting batch:', insertError);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      if (successCount > 0) {
        setSuccess(
          `Successfully imported ${successCount} trades${errorCount > 0 ? ` (${errorCount} errors)` : ''}`
        );
        if (onTradesImported) {
          onTradesImported();
        }
      } else {
        throw new Error(
          `Failed to import trades. ${errorCount} errors encountered.`
        );
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error importing CSV:', err);
      setError(err instanceof Error ? err.message : 'Failed to import trades');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        setTimeout(() => setError(null), 3000);
        return;
      }
      importFromCSV(file);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
        id="csv-import-input"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting || accounts.length === 0}
        className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
        title="Import trades from CSV"
      >
        <ArrowUpTrayIcon className="h-4 w-4" />
        <span>{isImporting ? 'Importing...' : 'Import CSV'}</span>
      </button>
      <button
        onClick={exportToCSV}
        disabled={isExporting}
        className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
        title="Export trades to CSV"
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
      </button>

      {error && (
        <div className="absolute top-16 right-4 bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm z-50">
          {error}
        </div>
      )}

      {success && (
        <div className="absolute top-16 right-4 bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded-lg text-sm z-50">
          {success}
        </div>
      )}
    </div>
  );
}
