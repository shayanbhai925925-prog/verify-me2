'use client';

import React, { useState } from 'react';

export default function AIEditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus(null);
  };

  const executeAITransform = async () => {
    if (!file) return;
    setLoading(true);
    setStatus(null);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('operation', 'ai_editing');
    fd.append('requesterApp', 'VerifyMe AI Studio');

    try {
      const res = await fetch('/api/agent/evaluate', { method: 'POST', body: fd });
      const json = await res.json();

      if (!res.ok || json.error) {
        setStatus({
          verdict: 'ERROR',
          allowed: false,
          message: json.error || `HTTP ${res.status}: Request failed`
        });
      } else {
        setStatus(json);
      }
    } catch (err: any) {
      setStatus({
        verdict: 'ERROR',
        allowed: false,
        message: err?.message || 'Network request failed'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">AI Editor Sandbox</h1>
      <p className="text-sm text-zinc-400">External AI editors query the VerifyMe Security Agent before running models.</p>

      <input type="file" accept="image/*" onChange={handleFile} className="block text-sm text-zinc-400" />

      {preview && (
        <div className="border border-zinc-700 rounded-lg p-4 bg-zinc-900 flex flex-col items-center gap-4">
          <img
            src={preview}
            alt="Source"
            className={`max-h-64 rounded object-contain transition duration-300 ${status?.allowed ? 'sepia hue-rotate-90' : ''}`}
          />
          <button
            onClick={executeAITransform}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded font-medium text-sm"
          >
            {loading ? 'Consulting Security Agent...' : 'Apply Generative AI Inpaint'}
          </button>
        </div>
      )}

      {status && (
        <div className={`p-4 rounded border text-sm ${status.allowed ? 'bg-emerald-950 border-emerald-700 text-emerald-200' : 'bg-rose-950 border-rose-700 text-rose-200'}`}>
          <div className="font-bold">VERDICT: {status.verdict}</div>
          <div className="mt-1">{status.message}</div>
          {status.token && <div className="mt-2 font-mono text-xs break-all">Token: {status.token}</div>}
        </div>
      )}
    </div>
  );
}