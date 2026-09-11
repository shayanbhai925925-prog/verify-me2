'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function MediaUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [mediaHash, setMediaHash] = useState<string>('');
    const [alreadyRegistered, setAlreadyRegistered] = useState(false);

    // Policy options state (100% UNTOUCHED LOGIC)
    const [allowAiTraining, setAllowAiTraining] = useState(false);
    const [allowAiEditing, setAllowAiEditing] = useState('require_approval');
    const [allowFaceSwap, setAllowFaceSwap] = useState(false);
    const [allowCommercial, setAllowCommercial] = useState(false);

    const calculateSHA256 = async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    };

    const handleUpload = async () => {
        if (!file) return;

        try {
            setUploading(true);
            setAlreadyRegistered(false);
            setStatus('Calculating cryptographic hash...');

            const hash = await calculateSHA256(file);
            setMediaHash(hash);

            setStatus('Checking provenance registry...');
            const { data: existingMedia, error: checkError } = await supabase
                .from('media')
                .select('id, file_name, created_at, user_id')
                .eq('sha256_hash', hash)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingMedia) {
                setAlreadyRegistered(true);
                setStatus(`Notice: This file was already registered on ${new Date(existingMedia.created_at).toLocaleDateString()}. Duplicate entry prevented.`);
                setUploading(false);
                return;
            }

            setStatus('Checking authentication session...');
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setStatus('Error: You must be logged in to upload and register media.');
                setUploading(false);
                return;
            }

            setStatus('Uploading file to secure storage...');
            const filePath = `${user.id}/${Date.now()}_${file.name}`;

            const { error: storageError } = await supabase.storage
                .from('uploads')
                .upload(filePath, file);

            if (storageError) throw storageError;

            setStatus('Writing provenance and policy records...');
            const { data: mediaData, error: dbError } = await supabase
                .from('media')
                .insert({
                    user_id: user.id,
                    file_name: file.name,
                    storage_path: filePath,
                    media_type: file.type,
                    sha256_hash: hash,
                })
                .select()
                .single();

            if (dbError) throw dbError;

            const { error: policyError } = await supabase.from('media_policies').insert({
                media_id: mediaData.id,
                allow_ai_training: allowAiTraining,
                allow_ai_editing: allowAiEditing,
                allow_face_swap: allowFaceSwap,
                allow_commercial: allowCommercial,
            });

            if (policyError) throw policyError;

            setStatus('Registration complete! Media fingerprint and customized policies secured.');
            if (onUploadSuccess) onUploadSuccess();
        } catch (err: any) {
            setStatus(`Error: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-xl w-full p-6 sm:p-8 bg-[#090c12]/95 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl text-slate-100 corner-bracket space-y-5 font-sans">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-semibold block">IDENTITY ANCHOR</span>
                    <h2 className="text-lg font-display font-bold text-white">Register & Protect Media</h2>
                </div>
                <Link href="/verify" className="text-xs font-mono text-amber-400 hover:underline tracking-wider">
                    Verification Console &rarr;
                </Link>
            </div>

            <div className="border border-dashed border-white/15 hover:border-amber-500/40 rounded-xl p-4 bg-black/40 transition">
                <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                        setFile(e.target.files?.[0] || null);
                        setStatus('');
                        setMediaHash('');
                        setAlreadyRegistered(false);
                    }}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/15 cursor-pointer font-sans tracking-wider uppercase"
                />
            </div>

            {/* Policy Configuration Controls */}
            <div className="bg-black/50 p-4 rounded-xl border border-white/10 space-y-3 text-xs">
                <h3 className="text-[10px] font-display font-bold uppercase tracking-wider text-amber-400">
                    CONFIGURE AI RE-USE RIGHTS
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                            type="checkbox"
                            checked={allowAiTraining}
                            onChange={(e) => setAllowAiTraining(e.target.checked)}
                            className="rounded border-white/20 bg-black text-amber-500 focus:ring-amber-500/50"
                        />
                        <span>Allow AI Training</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                            type="checkbox"
                            checked={allowFaceSwap}
                            onChange={(e) => setAllowFaceSwap(e.target.checked)}
                            className="rounded border-white/20 bg-black text-amber-500 focus:ring-amber-500/50"
                        />
                        <span>Allow Face Swapping</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                            type="checkbox"
                            checked={allowCommercial}
                            onChange={(e) => setAllowCommercial(e.target.checked)}
                            className="rounded border-white/20 bg-black text-amber-500 focus:ring-amber-500/50"
                        />
                        <span>Allow Commercial Use</span>
                    </label>

                    <div className="flex flex-col gap-1">
                        <span className="text-slate-400 text-[11px] font-sans">AI Editing:</span>
                        <select
                            value={allowAiEditing}
                            onChange={(e) => setAllowAiEditing(e.target.value)}
                            className="border border-white/15 rounded p-1.5 bg-[#090c12] text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
                        >
                            <option value="prohibited">Prohibited</option>
                            <option value="require_approval">Require Approval</option>
                            <option value="allowed">Allowed</option>
                        </select>
                    </div>
                </div>
            </div>

            <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-sans font-bold py-3 px-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.25)]"
            >
                {uploading ? 'PROCESSING CRYPTOGRAPHIC RECORD...' : 'UPLOAD & ANCHOR IDENTITY'}
            </button>

            {status && (
                <div className={`p-4 rounded-xl text-xs font-mono border ${alreadyRegistered ? 'bg-amber-950/40 border-amber-800 text-amber-300' : 'bg-white/5 border-white/10 text-slate-200'}`}>
                    <p className="font-semibold">{status}</p>
                    {mediaHash && (
                        <p className="mt-1 font-mono text-[11px] text-slate-400 break-all select-all">
                            SHA-256: {mediaHash}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}