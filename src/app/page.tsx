'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Auth from '@/components/Auth';
import MediaUpload from '@/components/MediaUpload';
import MediaGallery from '@/components/MediaGallery';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [vaultEvents, setVaultEvents] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(true);

  // Monitor Supabase auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Public Evidence Vault records
  useEffect(() => {
    async function loadPublicVault() {
      try {
        const res = await fetch('/api/vault');
        if (res.ok) {
          const data = await res.json();
          setVaultEvents(data.records || []);
        }
      } catch (err) {
        console.error('Failed to load public vault events:', err);
      } finally {
        setLoadingVault(false);
      }
    }
    loadPublicVault();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500 selection:text-white">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/70 backdrop-blur-md">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-black tracking-widest text-blue-500 hover:text-blue-400 transition">
            VERIFYME
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/editor" className="text-gray-300 hover:text-white transition">
              AI Editor
            </Link>
            <a href="#vault" className="text-gray-300 hover:text-white transition">
              Evidence Vault
            </a>
            <Link href="/verify" className="text-gray-300 hover:text-white transition">
              Verify
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded">
                {user.email}
              </span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-xs font-semibold px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            Cryptographic Media Protection & AI Governance
          </h1>
          <p className="text-lg text-gray-400">
            Verify provenance, govern third-party AI edits, and track immutable audit trails across the decentralized media ecosystem.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link
              href="/editor"
              className="px-6 py-3 text-sm font-semibold rounded bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-500/20"
            >
              Launch AI Editor
            </Link>
            <a
              href="#vault"
              className="px-6 py-3 text-sm font-semibold rounded border border-white/20 hover:bg-white/5 transition"
            >
              View Public Vault
            </a>
          </div>
        </section>

        {/* Public Evidence Vault Section (Accessible before login) */}
        <section id="vault" className="space-y-6 pt-6 border-t border-white/10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Public Evidence Vault</h2>
            <p className="text-sm text-gray-400">
              Live audit logs of registered media fingerprints, enforcement actions, and security decisions.
            </p>
          </div>

          <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5 backdrop-blur">
            {loadingVault ? (
              <div className="p-8 text-center text-sm text-gray-500">Loading audit records...</div>
            ) : vaultEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No security audit records logged yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/10 text-gray-300 uppercase text-xs">
                    <tr>
                      <th className="p-4">Event Type</th>
                      <th className="p-4">Media Target</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Recorded At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {vaultEvents.map((evt, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition">
                        <td className="p-4 font-mono font-medium text-blue-400">
                          {evt.event_type || evt.eventType || 'SECURITY_CHECK'}
                        </td>
                        <td className="p-4 font-mono text-xs text-gray-400">
                          {evt.media_id || evt.mediaId || 'Unregistered'}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 text-xs rounded font-medium ${
                              evt.status === 'BLOCKED'
                                ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                                : 'bg-green-950/60 text-green-400 border border-green-800/40'
                            }`}
                          >
                            {evt.status || 'LOGGED'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-gray-500">
                          {new Date(evt.created_at || Date.now()).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Creator Control Hub (Private upload & gallery) */}
        <section className="space-y-6 pt-6 border-t border-white/10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Creator Dashboard</h2>
            <p className="text-sm text-gray-400">
              Sign in to register your media assets and manage your automated AI editing policies.
            </p>
          </div>

          {!user ? (
            <div className="max-w-md mx-auto p-6 rounded-lg border border-white/10 bg-white/5">
              <Auth />
            </div>
          ) : (
            <div className="space-y-12">
              <MediaUpload onUploadSuccess={() => {}} />
              <MediaGallery userId={user?.id || ''} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}