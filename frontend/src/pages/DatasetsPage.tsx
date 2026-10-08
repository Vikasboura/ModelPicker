import React, { useEffect, useState } from 'react';
import {
  Database,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  FileText,
  RotateCw,
  Eye,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import type { Dataset } from '../types';

export const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    is_valid: boolean;
    total_rows: number;
    valid_rows: number;
    errors: string[];
    preview: any[];
  } | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const data = await api.getDatasets();
      setDatasets(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load datasets.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }

    // Auto-validate file
    setIsValidating(true);
    setValidationResult(null);
    setFeedback(null);
    try {
      const result = await api.validateDataset(selectedFile);
      setValidationResult(result);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Validation failed.' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) return;

    setIsUploading(true);
    setFeedback(null);
    try {
      const saved = await api.uploadDataset(name, description || undefined, file);
      setFeedback({ type: 'success', message: `Dataset "${saved.name}" uploaded successfully!` });
      setName('');
      setDescription('');
      setFile(null);
      setValidationResult(null);
      loadDatasets();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save dataset.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, datasetName: string) => {
    if (!window.confirm(`Delete dataset "${datasetName}"?`)) return;
    try {
      await api.deleteDataset(id);
      setDatasets((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete dataset');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Database className="w-6 h-6 text-brand-400" />
          Evaluation Datasets
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload custom benchmark datasets in JSON or JSONL format, validate schemas, and preview prompt items.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Upload & Validation Card */}
      <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Upload className="w-4 h-4 text-brand-400" />
          Upload New Dataset (JSON or JSONL)
        </h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Dataset Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Reasoning & Code QA"
                className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of benchmark domain"
                className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* File Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              File (.json or .jsonl) *
            </label>
            <div className="p-4 border-2 border-dashed border-dark-700 hover:border-brand-500/50 rounded-xl bg-dark-950/40 text-center cursor-pointer transition">
              <input
                type="file"
                accept=".json,.jsonl"
                onChange={handleFileChange}
                className="hidden"
                id="dataset-upload"
              />
              <label htmlFor="dataset-upload" className="cursor-pointer">
                <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-slate-300">
                  {file ? file.name : 'Click to select or drop a JSON/JSONL dataset'}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Format: array of <code className="text-slate-400">{`{ id, prompt, expected }`}</code>
                </p>
              </label>
            </div>
          </div>

          {/* Validation Feedback */}
          {isValidating && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-brand-400" />
              Validating dataset schema...
            </div>
          )}

          {validationResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-3 ${
                validationResult.is_valid
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-rose-950/20 border-rose-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {validationResult.is_valid ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="font-bold text-white">
                    {validationResult.is_valid
                      ? `Valid Dataset (${validationResult.valid_rows} rows ready)`
                      : 'Validation Failed'}
                  </span>
                </div>
              </div>

              {validationResult.errors.length > 0 && (
                <div className="space-y-1 text-rose-300">
                  <p className="font-semibold">Validation Errors:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 10-row preview table */}
              {validationResult.preview.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-300 block mb-2 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> First {validationResult.preview.length} Rows Preview:
                  </span>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-dark-800 bg-dark-950">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-dark-900 border-b border-dark-800 text-slate-400">
                        <tr>
                          <th className="p-2">ID</th>
                          <th className="p-2">Prompt</th>
                          <th className="p-2">Expected Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-800/60">
                        {validationResult.preview.map((p, i) => (
                          <tr key={i} className="text-slate-300">
                            <td className="p-2 text-brand-400">{p.id}</td>
                            <td className="p-2 truncate max-w-xs">{p.prompt}</td>
                            <td className="p-2 truncate max-w-xs text-slate-400">{p.expected || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || isUploading || (validationResult !== null && !validationResult.is_valid)}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" /> Saving Dataset...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Save Dataset
              </>
            )}
          </button>
        </form>
      </div>

      {/* Available Datasets Table */}
      <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-4">
        <h2 className="text-base font-bold text-white">Stored Datasets</h2>
        {loading ? (
          <div className="p-8 text-center">
            <RotateCw className="w-6 h-6 text-brand-500 animate-spin mx-auto" />
          </div>
        ) : datasets.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No custom datasets saved yet. The built-in 8-prompt evaluation dataset is active by default.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-dark-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Prompts Count</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800/60 text-xs">
                {datasets.map((d) => (
                  <tr key={d.id} className="hover:bg-dark-850/50 transition">
                    <td className="py-3 px-3 font-semibold text-white">{d.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{d.row_count} rows</td>
                    <td className="py-3 px-3 text-slate-400">{d.description || '-'}</td>
                    <td className="py-3 px-3 text-slate-400">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDelete(d.id, d.name)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-dark-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
