"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

interface VaultEvent {
  id: string;
  media_id: string | null;
  event_type: string;
  status: string;
  metadata: Record<string, any>;
  created_at: string;
}

export default function VerifyDashboard() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [vaultEvents, setVaultEvents] = useState<VaultEvent[]>([]);

  // Fetch audit logs from the Evidence Vault
  const fetchVaultLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/vault");
      if (!res.ok) throw new Error("Failed to fetch vault records");
      const data = await res.json();
      setVaultEvents(data.events || []);
    } catch (err: unknown) {
      console.error("Vault retrieval error:", err);
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    setMounted(true);

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
      } else {
        setUserEmail(session.user.email ?? "Authenticated Creator");
      }
      setLoading(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        window.location.href = "/login";
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (mounted && !loading) {
      fetchVaultLogs();
    }
  }, [mounted, loading, fetchVaultLogs]);

  // Handle file selection and preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setActiveMediaId(null);
    setGeneratedToken(null);
    setStatusMessage(null);

    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
    } else {
      setFilePreview(null);
    }
  };

  // Register image as original asset (Locked Business Logic)
  const handleRegister = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/media/register", {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();
      const mediaId = data?.media?.id || data?.mediaId || data?.id;
      if (!res.ok || !mediaId) {
        throw new Error(data?.error || "Failed to register media asset.");
      }

      setActiveMediaId(mediaId);
      setStatusType("success");
      setStatusMessage(`Media asset successfully registered. Media ID: ${mediaId}`);
      fetchVaultLogs();
    } catch (err: unknown) {
      setStatusType("error");
      setStatusMessage(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Check perceptual hash for derivative matches (Locked Business Logic)
  const handleVerify = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/derivatives/check", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification check failed.");

      if (data.matchesFound && data.matches.length > 0) {
        const topMatch = data.matches[0];
        setActiveMediaId(topMatch.mediaId);
        setStatusType("success");
        setStatusMessage(
          `Original asset match detected (${topMatch.confidence}% confidence). Media ID: ${topMatch.mediaId}`
        );
      } else {
        setStatusType("info");
        setStatusMessage(`No matching registered media found. Query pHash: ${data.queryHash || "Computed"}`);
      }
      fetchVaultLogs();
    } catch (err: unknown) {
      setStatusType("error");
      setStatusMessage(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate authorization token (Locked Business Logic)
  const handleGenerateToken = async () => {
    if (!activeMediaId) {
      setStatusType("error");
      setStatusMessage("Register or verify the asset first to acquire an active Media ID.");
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: activeMediaId,
          requesterApp: "External-AI-Agent-Demo",
          durationMinutes: 120,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Token generation failed.");

      setGeneratedToken(data.token);
      setStatusType("success");
      setStatusMessage("Cryptographic usage authorization token issued successfully.");
      fetchVaultLogs();
    } catch (err: unknown) {
      setStatusType("error");
      setStatusMessage(err instanceof Error ? err.message : "Token creation failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Revoke active token (Locked Business Logic)
  const handleRevokeToken = async () => {
    if (!generatedToken) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: generatedToken,
          reason: "Manually revoked by creator",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke token.");

      setStatusType("error");
      setStatusMessage("Authorization token revoked and blacklisted from network.");
      setGeneratedToken(null);
      fetchVaultLogs();
    } catch (err: unknown) {
      setStatusType("error");
      setStatusMessage(err instanceof Error ? err.message : "Revocation failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Download cryptographic certificate (Locked Business Logic)
  const handleDownloadCertificate = async () => {
    if (!activeMediaId) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/media/${activeMediaId}/certificate`);
      if (!res.ok) throw new Error("Failed to retrieve certificate.");

      const certData = await res.json();
      const blob = new Blob([JSON.stringify(certData, null, 2)], {
        type: "application/json",
      });

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `PM-Certificate-${activeMediaId.slice(0, 8)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setStatusType("success");
      setStatusMessage("Cryptographic certificate exported successfully.");
    } catch (err: unknown) {
      setStatusType("error");
      setStatusMessage(err instanceof Error ? err.message : "Certificate export failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#040507] flex items-center justify-center font-mono text-xs text-amber-500/80 tracking-widest">
        LOADING FORENSIC CONTROL ROOM...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040507] bg-cyber-grid text-slate-100 font-sans pb-16 selection:bg-amber-500/20 selection:text-amber-200">
      {/* Forensic Header */}
      <header className="border-b border-white/5 bg-[#070a10]/80 backdrop-blur-md sticky top-0 z-30 px-6 sm:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span className="font-display font-bold tracking-widest text-sm text-white uppercase">
              Verify<span className="text-amber-400">Me</span>
            </span>
          </Link>
          <span className="hidden sm:inline-block text-[10px] bg-white/5 text-amber-400/90 px-2 py-0.5 rounded border border-amber-500/20 font-mono tracking-wider">
            COMMAND STATION
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <Link
            href="/verify/certificate"
            className="text-slate-400 hover:text-white transition hidden md:inline-block tracking-wider"
          >
            CERTIFICATE INSPECTOR
          </Link>
          <span className="text-slate-500 hidden sm:inline tracking-wider">
            OPERATOR: <span className="text-slate-300 font-mono">{userEmail}</span>
          </span>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 rounded bg-white/5 hover:bg-red-950/50 text-slate-300 hover:text-red-400 border border-white/10 hover:border-red-800 transition font-mono text-[11px] tracking-wider"
          >
            DISCONNECT
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-6xl mx-auto mt-8 px-6 space-y-8">
        {/* Title Area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="font-mono text-[10px] text-amber-400 tracking-widest uppercase font-semibold">
              SECURITY ENGINE // ACTIVE WORKSPACE
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white mt-1">
              Media Registry & Evidence Vault
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans leading-relaxed">
              Register original assets, verify derivatives, issue agent authorization tokens, and inspect audit chains.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono border border-white/10 transition tracking-wider"
            >
              ← Public Experience
            </Link>
          </div>
        </div>

        {/* Action Panel */}
        <section className="bg-[#090c12]/90 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md corner-bracket">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xs tracking-wider text-amber-400 uppercase">
                ASSET INGESTION & PIPELINE
              </span>
            </div>
            {activeMediaId && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800 text-emerald-300 tracking-wider">
                ACTIVE ASSET: {activeMediaId.slice(0, 16)}...
              </span>
            )}
          </div>

          {/* Upload Dropzone */}
          <div className="border border-dashed border-white/15 hover:border-amber-500/40 rounded-xl p-6 flex flex-col items-start gap-4 bg-black/30 transition">
            <input
              type="file"
              accept="image/*"
              id="file-upload-verify"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-upload-verify"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg cursor-pointer border border-white/20 transition tracking-wider uppercase font-sans flex items-center gap-2"
            >
              <span>SELECT MEDIA FILE</span>
              <span>+</span>
            </label>

            {selectedFile && filePreview && (
              <div className="flex items-center justify-between bg-black/60 p-3.5 rounded-lg border border-white/10 w-full">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-black border border-white/20">
                    <Image
                      src={filePreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="text-xs">
                    <p className="font-medium text-slate-200 font-sans">{selectedFile.name}</p>
                    <p className="text-slate-500 font-mono text-[11px]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-1 rounded tracking-wider">
                  LOADED
                </span>
              </div>
            )}
          </div>

          {/* Execution Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRegister}
              disabled={!selectedFile || isProcessing}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed font-sans tracking-wider uppercase shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              REGISTER AS ORIGINAL
            </button>
            <button
              onClick={handleVerify}
              disabled={!selectedFile || isProcessing}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed font-sans tracking-wider uppercase shadow-[0_0_15px_rgba(245,158,11,0.25)]"
            >
              VERIFY AUTHENTICITY
            </button>
            <button
              onClick={handleGenerateToken}
              disabled={!activeMediaId || isProcessing}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed font-sans tracking-wider uppercase"
            >
              MINT AUTH TOKEN
            </button>
            <button
              onClick={handleDownloadCertificate}
              disabled={!activeMediaId || isProcessing}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium rounded-lg border border-white/15 transition disabled:opacity-40 disabled:cursor-not-allowed font-sans tracking-wider uppercase"
            >
              EXPORT CERTIFICATE
            </button>
          </div>

          {/* Status Feedback */}
          {statusMessage && (
            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed ${
                statusType === "success"
                  ? "bg-emerald-950/30 border-emerald-800 text-emerald-300"
                  : statusType === "error"
                  ? "bg-red-950/30 border-red-800 text-red-300"
                  : "bg-blue-950/30 border-blue-800 text-blue-300"
              }`}
            >
              <div className="font-display font-bold text-xs tracking-wider mb-1">
                {statusType === "success" ? "✓ EXECUTION SUCCESS" : statusType === "error" ? "✕ ALERT / FAILURE" : "ℹ DIAGNOSTIC INFO"}
              </div>
              <p className="font-mono text-xs">{statusMessage}</p>
            </div>
          )}

          {/* Token Display and Revocation Block */}
          {generatedToken && (
            <div className="p-5 bg-purple-950/20 border border-purple-800/60 rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-300 font-display font-bold uppercase tracking-wider text-xs">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>AUTHORIZATION CREDENTIAL ISSUED</span>
                </div>
                <button
                  type="button"
                  onClick={handleRevokeToken}
                  disabled={isProcessing}
                  className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white font-semibold rounded text-xs transition disabled:opacity-50 font-sans tracking-wider uppercase"
                >
                  {isProcessing ? "Revoking..." : "REVOKE TOKEN"}
                </button>
              </div>
              <div className="p-3 bg-black/70 rounded-lg border border-purple-900/60 text-purple-200 select-all overflow-x-auto break-all font-mono text-[11px]">
                {generatedToken}
              </div>
              <p className="text-slate-400 text-xs font-sans leading-relaxed">
                Valid for 120 minutes. Presentable by external AI crawler agents or syndicators to verify authorization rights.
              </p>
            </div>
          )}
        </section>

        {/* Immutable Evidence Vault Ledger */}
        <section className="bg-[#090c12]/90 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <div className="font-mono text-[10px] text-amber-400 uppercase tracking-widest font-semibold">
                IMMUTABLE AUDIT LOG
              </div>
              <h2 className="text-lg font-display font-bold text-white mt-0.5">
                Evidence Vault Chain
              </h2>
            </div>
            <button
              onClick={fetchVaultLogs}
              className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-amber-400 text-xs font-sans font-semibold border border-white/10 transition flex items-center gap-1.5 tracking-wider uppercase"
            >
              <span>REFRESH LOGS</span>
              <span>↻</span>
            </button>
          </div>

          <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Media Reference</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Metadata Payload</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {vaultEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-sans text-xs">
                        No cryptographic evidence events recorded in the vault.
                      </td>
                    </tr>
                  ) : (
                    vaultEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                          {event.event_type}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {event.media_id ? (
                            <span className="text-amber-400/80 font-mono">{event.media_id.slice(0, 14)}...</span>
                          ) : (
                            <span className="text-slate-600 font-mono">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase ${
                              event.status === "APPROVED" || event.status === "REGISTERED"
                                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800"
                                : event.status === "REJECTED" || event.status === "FLAGGED"
                                ? "bg-red-950/60 text-red-400 border border-red-800"
                                : "bg-amber-950/60 text-amber-400 border border-amber-800"
                            }`}
                          >
                            {event.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 truncate max-w-xs font-mono text-[11px]">
                          {JSON.stringify(event.metadata)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}