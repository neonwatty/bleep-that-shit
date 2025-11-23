'use client';

import { useState, useRef } from 'react';
import type { ImportResult } from '@/lib/types/wordset';

interface WordsetImportExportProps {
  onImport: (csvData: string, merge: boolean) => Promise<{
    success: boolean;
    data?: ImportResult;
    error?: string;
  }>;
  onExportAll: () => Promise<{ success: boolean; data?: string; error?: string }>;
  onClose: () => void;
}

export function WordsetImportExport({
  onImport,
  onExportAll,
  onClose,
}: WordsetImportExportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'skip'>('merge');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const text = await file.text();
      const result = await onImport(text, importMode === 'merge');

      if (result.success && result.data) {
        setImportResult(result.data);
      } else {
        setImportError(result.error || 'Failed to import CSV');
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to read file');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportAll = async () => {
    const result = await onExportAll();

    if (result.success && result.data) {
      // Create download
      const blob = new Blob([result.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bleep-wordsets-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      setImportError(result.error || 'Failed to export wordsets');
    }
  };

  const downloadSample = () => {
    const sample = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color
Profanity,,fuck;shit;damn,true,false,false,0,#EF4444
Brands,Competitor names,Nike;Adidas;Puma,false,true,false,0,#3B82F6`;

    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-wordsets.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <div>
        <h3 className="mb-3 text-lg font-bold text-gray-900">Export Wordsets</h3>
        <p className="mb-4 text-sm text-gray-600">
          Download all your wordsets as a CSV file for backup or sharing.
        </p>
        <button
          onClick={handleExportAll}
          className="btn btn-secondary"
          data-testid="export-all-button"
        >
          📤 Export All Wordsets (CSV)
        </button>
      </div>

      {/* Import Section */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="mb-3 text-lg font-bold text-gray-900">Import Wordsets from CSV</h3>

        {/* Import options */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold text-gray-700">Import Mode:</p>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center">
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={importMode === 'merge'}
                onChange={e => setImportMode(e.target.value as 'merge')}
                className="mr-3 h-4 w-4"
              />
              <div>
                <span className="font-medium">Merge (keep both)</span>
                <p className="text-sm text-gray-600">
                  Imports as &quot;Name (Imported)&quot; if name exists
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-center">
              <input
                type="radio"
                name="importMode"
                value="skip"
                checked={importMode === 'skip'}
                onChange={e => setImportMode(e.target.value as 'skip')}
                className="mr-3 h-4 w-4"
              />
              <div>
                <span className="font-medium">Skip duplicates</span>
                <p className="text-sm text-gray-600">
                  Keep existing wordsets, skip imports with duplicate names
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* File upload */}
        <div className="mb-4">
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={isImporting}
              className="hidden"
              id="csv-file-input"
              data-testid="import-file-input"
            />
            <label htmlFor="csv-file-input" className="cursor-pointer">
              <div className="mb-2 text-4xl">📄</div>
              <p className="mb-1 font-semibold text-gray-700">
                {isImporting ? 'Importing...' : 'Click to browse or drag and drop'}
              </p>
              <p className="text-sm text-gray-500">CSV files only</p>
            </label>
          </div>
        </div>

        {/* Expected format */}
        <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-4">
          <p className="mb-2 text-sm font-semibold text-gray-700">Expected CSV Format:</p>
          <pre className="overflow-x-auto rounded bg-white p-2 text-xs">
            name,description,words,exact,partial,fuzzy,fuzzyDistance,color
            Profanity,,fuck;shit;damn,true,false,false,0,#EF4444
          </pre>
          <button
            onClick={downloadSample}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            📄 Download sample CSV
          </button>
        </div>

        {/* Import result */}
        {importResult && (
          <div className="rounded border border-green-200 bg-green-50 p-4">
            <p className="mb-2 font-semibold text-green-800">Import Complete!</p>
            <ul className="space-y-1 text-sm text-green-700">
              <li>✅ Imported: {importResult.imported} wordset(s)</li>
              {importResult.skipped > 0 && <li>⏭ Skipped: {importResult.skipped} wordset(s)</li>}
              {importResult.errors.length > 0 && (
                <li className="text-red-700">
                  ⚠️ Errors: {importResult.errors.length}
                  <ul className="ml-4 mt-1 list-disc">
                    {importResult.errors.slice(0, 3).map((err, i) => (
                      <li key={i} className="text-xs">
                        {err}
                      </li>
                    ))}
                    {importResult.errors.length > 3 && (
                      <li className="text-xs">...and {importResult.errors.length - 3} more</li>
                    )}
                  </ul>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Import error */}
        {importError && (
          <div className="rounded border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-800">Import Failed</p>
            <p className="text-sm text-red-700">{importError}</p>
          </div>
        )}
      </div>

      {/* Close button */}
      <div className="border-t border-gray-200 pt-6">
        <button onClick={onClose} className="btn bg-gray-500 text-white hover:bg-gray-600">
          Close
        </button>
      </div>
    </div>
  );
}
