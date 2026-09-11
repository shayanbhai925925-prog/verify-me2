'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    GranularPolicyState,
    PolicyAction,
    DEFAULT_POLICY,
    OPERATION_LABELS,
    PermissionOperation,
    serializePolicy,
} from '@/lib/permissionTypes';

export type { PolicyAction, GranularPolicyState };
export { DEFAULT_POLICY };

interface PolicyEditorProps {
    mediaId: string;
    initialPolicy?: Partial<GranularPolicyState>;
    onSaved?: (updatedPolicy: GranularPolicyState) => void;
    compact?: boolean;
}

export default function PolicyEditor({ mediaId, initialPolicy, onSaved, compact = false }: PolicyEditorProps) {
    const [policy, setPolicy] = useState<GranularPolicyState>({
        ...DEFAULT_POLICY,
        ...initialPolicy,
    });
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const categories: Array<{ key: PermissionOperation; label: string; description: string; icon: string }> = (
        Object.keys(OPERATION_LABELS) as PermissionOperation[]
    ).map((key) => ({
        key,
        ...OPERATION_LABELS[key],
    }));

    const updateCategory = (key: PermissionOperation, val: PolicyAction) => {
        setPolicy((prev) => ({ ...prev, [key]: val }));
        setStatusMsg(null);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setStatusMsg(null);

            // Check existing policy record
            const { data: existing, error: fetchErr } = await supabase
                .from('media_policies')
                .select('id')
                .eq('media_id', mediaId)
                .maybeSingle();

            if (fetchErr) throw fetchErr;

            const serialized = serializePolicy(policy);
            const dbPayload = {
                media_id: mediaId,
                ...serialized,
                updated_at: new Date().toISOString(),
            };

            if (existing) {
                const { error: updateErr } = await supabase
                    .from('media_policies')
                    .update(dbPayload)
                    .eq('media_id', mediaId);

                if (updateErr) throw updateErr;
            } else {
                const { error: insertErr } = await supabase
                    .from('media_policies')
                    .insert(dbPayload);

                if (insertErr) throw insertErr;
            }

            setStatusMsg({ type: 'success', text: 'All 7 permission rights saved and anchored to database.' });
            if (onSaved) onSaved(policy);
        } catch (err: any) {
            console.error('Error saving policy:', err);
            setStatusMsg({ type: 'error', text: err.message || 'Failed to save policy.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`bg-white rounded-xl border border-gray-200 font-sans ${compact ? 'p-4' : 'p-6'}`}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-display font-bold text-sm text-gray-900 flex items-center gap-2">
                        <span>🔒</span> Granular Permission Policy Matrix (7 Categories)
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 font-sans">
                        Set immutable usage rights for AI modification, synthesis, and commercial distribution.
                    </p>
                </div>
            </div>

            <div className="space-y-2.5">
                {categories.map((cat) => {
                    const currentVal = policy[cat.key];
                    return (
                        <div
                            key={cat.key}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                            <div className="space-y-0.5">
                                <div className="font-semibold text-gray-800 flex items-center gap-1.5 font-sans">
                                    <span>{cat.icon}</span>
                                    <span>{cat.label}</span>
                                </div>
                                <p className="text-[11px] text-gray-500 font-sans">{cat.description}</p>
                            </div>

                            {/* 3-Way Segmented Control */}
                            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-xs self-start sm:self-auto shrink-0 font-sans">
                                <button
                                    type="button"
                                    onClick={() => updateCategory(cat.key, 'allow')}
                                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                                        currentVal === 'allow'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    Allow
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateCategory(cat.key, 'require_approval')}
                                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                                        currentVal === 'require_approval'
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    Ask Permission
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateCategory(cat.key, 'deny')}
                                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                                        currentVal === 'deny'
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    Deny
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                {statusMsg && (
                    <span
                        className={`text-xs font-mono font-medium ${
                            statusMsg.type === 'success' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                    >
                        {statusMsg.type === 'success' ? '✓ ' : '⚠️ '}
                        {statusMsg.text}
                    </span>
                )}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="ml-auto w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-sans font-bold tracking-wider uppercase rounded-lg shadow-xs transition"
                >
                    {saving ? 'Saving to Ledger...' : 'Save Policy Settings'}
                </button>
            </div>
        </div>
    );
}
