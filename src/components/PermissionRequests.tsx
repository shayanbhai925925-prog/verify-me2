'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    PermissionRequest,
    PermissionOperation,
    OPERATION_LABELS,
} from '@/lib/permissionTypes';

interface PermissionRequestsProps {
    userId: string;
    refreshTrigger?: number;
}

interface MediaSimpleItem {
    id: string;
    file_name: string;
    sha256_hash: string;
}

export default function PermissionRequests({ userId, refreshTrigger }: PermissionRequestsProps) {
    const [requests, setRequests] = useState<PermissionRequest[]>([]);
    const [mediaItems, setMediaItems] = useState<MediaSimpleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'simulator'>('pending');
    const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Simulator State
    const [simMediaId, setSimMediaId] = useState<string>('');
    const [simOp, setSimOp] = useState<PermissionOperation>('image_to_video');
    const [simName, setSimName] = useState('Runway Gen-3 AI Studio');
    const [simEmail, setSimEmail] = useState('partnerships@runwayml.com');
    const [simPurpose, setSimPurpose] = useState('Cinematic video animation for commercial showcase');
    const [simulating, setSimulating] = useState(false);
    const [simResult, setSimResult] = useState<any>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;

            const res = await fetch(`/api/permissions/creator?creatorId=${userId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const json = await res.json();
            if (json.requests) {
                setRequests(json.requests);
            }

            const { data: mediaList } = await supabase
                .from('media')
                .select('id, file_name, sha256_hash')
                .eq('user_id', userId);

            if (mediaList) {
                setMediaItems(mediaList);
                if (mediaList.length > 0 && !simMediaId) {
                    setSimMediaId(mediaList[0].id);
                }
            }
        } catch (err) {
            console.error('Error loading permission requests:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            loadData();
        }
    }, [userId, refreshTrigger]);

    const pendingRequests = requests.filter((r) => r.status === 'PENDING');
    const resolvedRequests = requests.filter((r) => r.status !== 'PENDING');

    const handleDecision = async (request: PermissionRequest, decision: 'APPROVED' | 'DENIED') => {
        try {
            setProcessingId(request.id);
            const note = decisionNotes[request.id] || '';
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;

            const res = await fetch('/api/permissions/decision', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    requestId: request.id,
                    mediaId: request.media_id,
                    decision,
                    decisionNote: note,
                }),
            });

            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error || 'Failed to submit decision.');
            }

            // Reload requests
            await loadData();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleSimulateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!simMediaId) return;

        try {
            setSimulating(true);
            setSimResult(null);

            const res = await fetch('/api/permissions/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mediaId: simMediaId,
                    operation: simOp,
                    requesterName: simName,
                    requesterEmail: simEmail,
                    requesterPurpose: simPurpose,
                }),
            });

            const json = await res.json();
            setSimResult(json);
            await loadData();
        } catch (err: any) {
            setSimResult({ error: err.message });
        } finally {
            setSimulating(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h2 className="text-base font-display font-bold text-gray-900 flex items-center gap-2">
                        <span>📡</span> Media Permission Network
                    </h2>
                    <p className="text-xs text-gray-500 font-sans">
                        Manage incoming authorization requests and audit automated policy evaluations.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs font-semibold self-start sm:self-auto font-sans">
                    <button
                        type="button"
                        onClick={() => setActiveTab('pending')}
                        className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                            activeTab === 'pending'
                                ? 'bg-white text-gray-900 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span>Inbox</span>
                        {pendingRequests.length > 0 && (
                            <span className="bg-rose-500 text-white px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono">
                                {pendingRequests.length}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className={`px-3 py-1.5 rounded-md transition ${
                            activeTab === 'history'
                                ? 'bg-white text-gray-900 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Decision History ({resolvedRequests.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('simulator')}
                        className={`px-3 py-1.5 rounded-md transition flex items-center gap-1 ${
                            activeTab === 'simulator'
                                ? 'bg-white text-blue-700 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span>🧪</span> Simulate Request
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8 text-xs font-mono text-gray-500 animate-pulse">
                    Loading permission requests from vault...
                </div>
            ) : (
                <>
                    {/* TAB 1: PENDING REQUESTS INBOX */}
                    {activeTab === 'pending' && (
                        <div className="space-y-4">
                            {pendingRequests.length === 0 ? (
                                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                                    <span className="text-3xl mb-1 block">✅</span>
                                    <p className="text-xs font-bold text-gray-700">No pending permission requests</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        Incoming requests requiring your authorization will appear here.
                                    </p>
                                </div>
                            ) : (
                                pendingRequests.map((req) => {
                                    const meta = OPERATION_LABELS[req.operation];
                                    const isProcessing = processingId === req.id;

                                    return (
                                        <div
                                            key={req.id}
                                            className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{meta?.icon || '🔒'}</span>
                                                    <div>
                                                        <span className="font-bold text-xs text-gray-900">
                                                            {meta?.label || req.operation}
                                                        </span>
                                                        <p className="text-[11px] text-gray-600">
                                                            Target Asset: <strong>{req.media_title}</strong>
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 self-start sm:self-auto">
                                                    ⏳ Pending Decision
                                                </span>
                                            </div>

                                            {/* Requester details */}
                                            <div className="bg-white p-3 rounded-lg border border-amber-100 text-xs space-y-1">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                                    <div>
                                                        <span className="font-semibold text-gray-700">Requester:</span>{' '}
                                                        <span className="text-gray-900">{req.requester_name}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-gray-700">Email:</span>{' '}
                                                        <span className="text-gray-900">{req.requester_email}</span>
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <span className="font-semibold text-gray-700">Stated Purpose:</span>{' '}
                                                        <span className="text-gray-800 italic">"{req.requester_purpose}"</span>
                                                    </div>
                                                    <div className="sm:col-span-2 text-[10px] text-gray-400 font-mono">
                                                        Requested: {new Date(req.created_at).toLocaleString()} &bull; Hash: {req.media_hash.slice(0, 16)}...
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Decision Input & Actions */}
                                            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                                                <input
                                                    type="text"
                                                    placeholder="Optional creator note or license terms..."
                                                    value={decisionNotes[req.id] || ''}
                                                    onChange={(e) =>
                                                        setDecisionNotes({ ...decisionNotes, [req.id]: e.target.value })
                                                    }
                                                    className="w-full sm:flex-1 text-xs p-2 border border-gray-300 rounded-lg bg-white focus:outline-blue-500"
                                                />

                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDecision(req, 'APPROVED')}
                                                        disabled={isProcessing}
                                                        className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-sans font-bold text-xs rounded-lg shadow-xs transition tracking-wider uppercase"
                                                    >
                                                        {isProcessing ? 'Saving...' : '✓ Allow'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDecision(req, 'DENIED')}
                                                        disabled={isProcessing}
                                                        className="flex-1 sm:flex-none px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-sans font-bold text-xs rounded-lg shadow-xs transition tracking-wider uppercase"
                                                    >
                                                        {isProcessing ? 'Saving...' : '✕ Deny'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* TAB 2: RESOLVED DECISION HISTORY */}
                    {activeTab === 'history' && (
                        <div className="space-y-3">
                            {resolvedRequests.length === 0 ? (
                                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                                    <p className="text-xs text-gray-500">No resolved authorization decisions recorded yet.</p>
                                </div>
                            ) : (
                                resolvedRequests.map((req) => {
                                    const meta = OPERATION_LABELS[req.operation];
                                    const isApproved = req.status === 'APPROVED' || req.status === 'AUTO_APPROVED';

                                    return (
                                        <div
                                            key={req.id}
                                            className="p-3.5 rounded-xl border border-gray-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span>{meta?.icon || '📄'}</span>
                                                    <span className="font-bold text-gray-900">
                                                        {meta?.label || req.operation}
                                                    </span>
                                                    <span className="text-gray-400">&bull;</span>
                                                    <span className="text-gray-700">{req.media_title}</span>
                                                </div>
                                                <p className="text-[11px] text-gray-500">
                                                    Requester: <strong>{req.requester_name}</strong> ({req.requester_email}) &bull; "{req.requester_purpose}"
                                                </p>
                                                {req.decision_note && (
                                                    <p className="text-[11px] text-gray-600 italic bg-white p-1.5 rounded border border-gray-200 inline-block mt-1">
                                                        Note: {req.decision_note}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span
                                                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                        isApproved
                                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                            : 'bg-rose-100 text-rose-800 border-rose-300'
                                                    }`}
                                                >
                                                    {req.status === 'AUTO_APPROVED'
                                                        ? '✓ Auto-Authorized (Policy)'
                                                        : req.status === 'APPROVED'
                                                        ? '✓ Approved by Creator'
                                                        : req.status === 'AUTO_DENIED'
                                                        ? '✕ Auto-Denied (Policy)'
                                                        : '✕ Denied by Creator'}
                                                </span>
                                                {req.resolved_at && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                        {new Date(req.resolved_at).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* TAB 3: SIMULATOR / TEST TOOL */}
                    {activeTab === 'simulator' && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                            <div>
                                <h3 className="text-xs font-bold text-gray-900">
                                    Simulate Incoming Permission Request
                                </h3>
                                <p className="text-[11px] text-gray-500">
                                    Test how third-party platforms (e.g. AI generators, remixers, ad networks) are evaluated against your saved policies in real-time.
                                </p>
                            </div>

                            {mediaItems.length === 0 ? (
                                <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                    You need to upload and register at least one media asset before simulating requests.
                                </p>
                            ) : (
                                <form onSubmit={handleSimulateRequest} className="space-y-3 text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Target Media Asset</label>
                                            <select
                                                value={simMediaId}
                                                onChange={(e) => setSimMediaId(e.target.value)}
                                                className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-blue-500"
                                            >
                                                {mediaItems.map((m) => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.file_name} ({m.sha256_hash.slice(0, 10)}...)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Requested Operation</label>
                                            <select
                                                value={simOp}
                                                onChange={(e) => setSimOp(e.target.value as PermissionOperation)}
                                                className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-blue-500"
                                            >
                                                {(Object.keys(OPERATION_LABELS) as PermissionOperation[]).map((key) => (
                                                    <option key={key} value={key}>
                                                        {OPERATION_LABELS[key].icon} {OPERATION_LABELS[key].label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Requester Entity / Tool</label>
                                            <input
                                                type="text"
                                                value={simName}
                                                onChange={(e) => setSimName(e.target.value)}
                                                className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-blue-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Requester Contact Email</label>
                                            <input
                                                type="email"
                                                value={simEmail}
                                                onChange={(e) => setSimEmail(e.target.value)}
                                                className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-blue-500"
                                                required
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block font-semibold text-gray-700 mb-1">Intended Application / Scope</label>
                                            <input
                                                type="text"
                                                value={simPurpose}
                                                onChange={(e) => setSimPurpose(e.target.value)}
                                                className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={simulating || !simMediaId}
                                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-sans font-bold text-xs rounded-lg shadow-xs transition tracking-wider uppercase"
                                    >
                                        {simulating ? 'Evaluating Against Ledger Policy...' : 'Submit Test Operation Request'}
                                    </button>
                                </form>
                            )}

                            {simResult && (
                                <div
                                    className={`p-3.5 rounded-xl border text-xs ${
                                        simResult.status === 'AUTO_APPROVED'
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                            : simResult.status === 'AUTO_DENIED'
                                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                                            : 'bg-amber-50 border-amber-200 text-amber-900'
                                    }`}
                                >
                                    <div className="flex items-center justify-between font-mono font-bold mb-1 text-[11px]">
                                        <span>Evaluation Result: {simResult.status}</span>
                                        <span>{simResult.authorized ? '🟢 AUTHORIZED' : '🔴 NOT AUTHORIZED'}</span>
                                    </div>
                                    <p className="font-mono text-xs">{simResult.message}</p>
                                    {simResult.status === 'PENDING' && (
                                        <p className="mt-1 text-[11px] font-medium text-amber-700 font-sans">
                                            👉 Check the <strong>Inbox</strong> tab above to approve or deny this simulated request.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
