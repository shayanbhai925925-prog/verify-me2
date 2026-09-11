'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface MediaGalleryProps {
    userId: string;
}

interface MediaItem {
    id: string;
    file_name: string;
    file_path: string;
    sha256_hash: string;
    created_at: string;
}

export default function MediaGallery({ userId }: MediaGalleryProps) {
    const [mediaList, setMediaList] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const fetchMedia = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('media')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMediaList(data || []);
        } catch (err) {
            console.error('Error fetching media:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchMedia();
        }
    }, [userId]);

    const handleDownload = async (item: MediaItem) => {
        try {
            setDownloadingId(item.id);

            const { data, error } = await supabase.storage
                .from('media')
                .download(item.file_path);

            if (error) throw error;

            // Create a blob URL and trigger an automatic file download
            const blobUrl = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = item.file_name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('Failed to download image:', err);
            alert('Could not download image. Ensure your Supabase storage permissions allow file downloads.');
        } finally {
            setDownloadingId(null);
        }
    };

    if (loading) {
        return <div className="text-xs font-mono text-slate-500">Querying registered media database...</div>;
    }

    return (
        <div className="bg-[#090c12]/95 p-6 sm:p-8 rounded-2xl shadow-xl border border-white/10 text-slate-100 space-y-4 font-sans">
            <div className="border-b border-white/5 pb-3">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-semibold block">PROVENANCE REPOSITORY</span>
                <h2 className="text-lg font-display font-bold text-white">Your Secured Media Library</h2>
            </div>

            {mediaList.length === 0 ? (
                <p className="text-xs font-mono text-slate-500 py-4">No assets registered yet. Anchor an original to populate this vault.</p>
            ) : (
                <div className="space-y-3">
                    {mediaList.map((item) => (
                        <div
                            key={item.id}
                            className="p-4 border border-white/10 bg-black/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-500/30 transition"
                        >
                            <div className="space-y-1">
                                <p className="text-sm font-sans font-semibold text-slate-200">{item.file_name}</p>
                                <p className="text-xs font-mono text-slate-400 break-all">
                                    <span className="text-slate-500">SHA-256:</span> {item.sha256_hash.slice(0, 16)}...{item.sha256_hash.slice(-8)}
                                </p>
                                <p className="text-[10px] font-mono text-slate-500">
                                    Registered: {new Date(item.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownload(item)}
                                    disabled={downloadingId === item.id}
                                    className="px-3.5 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white rounded-lg text-xs font-sans font-semibold tracking-wider uppercase border border-white/15 transition shadow-sm"
                                >
                                    {downloadingId === item.id ? 'DOWNLOADING...' : 'DOWNLOAD'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}