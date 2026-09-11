'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function MediaPassportPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/passport/${id}`)
      .then((res) => res.json())
      .then((res) => {
        setData(res.passport);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-zinc-400">Loading Media Passport...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Asset passport not found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="border border-zinc-700 bg-zinc-900 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-white mb-2">VerifyMe Media Passport</h1>
        <p className="text-sm text-zinc-400">Unique Identity & Cryptographic Provenance</p>
        <div className="mt-4 grid grid-cols-2 gap-4 text-xs font-mono">
          <div><span className="text-zinc-500">Asset ID:</span> <span className="text-zinc-200">{data.identity.id}</span></div>
          <div><span className="text-zinc-500">pHash:</span> <span className="text-zinc-200">{data.identity.phash || 'N/A'}</span></div>
          <div className="col-span-2 break-all"><span className="text-zinc-500">SHA-256:</span> <span className="text-emerald-400">{data.identity.sha256}</span></div>
        </div>
      </div>

      <div className="border border-zinc-700 bg-zinc-900 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Active Creator Policy</h2>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(data.policies).filter(([k]) => k !== 'id' && k !== 'media_id').map(([k, v]) => (
            <div key={k} className="p-3 bg-zinc-800 rounded border border-zinc-700">
              <div className="text-xs text-zinc-400 capitalize">{k.replace('_', ' ')}</div>
              <div className={`text-sm font-bold ${v === 'allow' ? 'text-green-400' : v === 'deny' ? 'text-red-400' : 'text-amber-400'}`}>
                {String(v).toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-zinc-700 bg-zinc-900 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Evidence Timeline</h2>
        <div className="space-y-2">
          {data.timeline.length === 0 ? (
            <p className="text-sm text-zinc-500">No events recorded yet.</p>
          ) : (
            data.timeline.map((event: any) => (
              <div key={event.id} className="p-3 bg-zinc-800/60 rounded border border-zinc-800 flex justify-between text-xs">
                <span className="font-semibold text-zinc-200">{event.event_type}</span>
                <span className="text-zinc-400">{new Date(event.created_at).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
