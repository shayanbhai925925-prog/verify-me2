'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function VaultDashboardPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVaultData() {
      try {
        const res = await fetch('/api/vault');
        if (res.ok) {
          const data = await res.json();
          setRecords(data.records || []);
        }
      } catch (err) {
        console.error('Failed to load vault data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVaultData();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6 sm:p-12 selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-amber-500">Autonomous Evidence Protocol</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-wider">EVIDENCE VAULT DASHBOARD</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Public audit ledger for autonomous decisions, tamper detection, and AI policy enforcement.
          </p>
        </div>
        <Link
          href="/"
          className="text-xs border border-white/20 px-4 py-2 hover:border-amber-400 hover:text-amber-400 transition uppercase"
        >
          Back to Terminal
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border border-white/10 p-4 bg-white/[0.02]">
          <div className="text-xs text-neutral-500 uppercase">Total Logged Records</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{records.length}</div>
        </div>
        <div className="border border-white/10 p-4 bg-white/[0.02]">
          <div className="text-xs text-neutral-500 uppercase">Enforcement Status</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">ACTIVE</div>
        </div>
        <div className="border border-white/10 p-4 bg-white/[0.02]">
          <div className="text-xs text-neutral-500 uppercase">Tamper Invariant</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">SHA256 + pHash</div>
        </div>
      </div>

      {/* Audit Feed Table */}
      <div className="border border-white/10 bg-white/[0.01]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center text-xs text-neutral-400">
          <span>EVENT STREAM</span>
          <span>AUTONOMOUS AGENT VERIFIED</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-neutral-600 text-xs tracking-widest">QUERYING LEDGER...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-neutral-600 text-xs">NO AUDIT LOGS RECORDED YET.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-neutral-500 uppercase">
                <tr>
                  <th className="p-4">Action Type</th>
                  <th className="p-4">Asset Target</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {records.map((r, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition">
                    <td className="p-4 text-amber-400 font-semibold">{r.event_type || r.eventType || 'INSPECTION'}</td>
                    <td className="p-4 text-neutral-400 font-mono">{r.media_id || r.mediaId || 'HASH_TARGET'}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 text-[10px] uppercase border ${
                          r.status === 'BLOCKED'
                            ? 'border-red-500/40 text-red-400 bg-red-950/20'
                            : 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                        }`}
                      >
                        {r.status || 'VERIFIED'}
                      </span>
                    </td>
                    <td className="p-4 text-neutral-500">
                      {new Date(r.created_at || Date.now()).toLocaleTimeString()}
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
}