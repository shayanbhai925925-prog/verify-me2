"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function CertificateVerifierPage() {
  const [certData, setCertData] = useState<any>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 100% UNTOUCHED LOGIC: JSON parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setVerificationResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setCertData(json);
      } catch {
        setErrorMessage("Invalid certificate format. File must be valid ProtectMedia JSON.");
      }
    };
    reader.readAsText(file);
  };

  // 100% UNTOUCHED LOGIC: Calls /api/media/certificate/verify
  const handleVerifyCertificate = async () => {
    if (!certData) return;

    setIsLoading(true);
    setErrorMessage(null);
    setVerificationResult(null);

    try {
      const res = await fetch("/api/media/certificate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(certData),
      });

      const data = await res.json();
      setVerificationResult(data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to verify certificate signature.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040507] bg-cyber-grid text-slate-100 font-sans p-6 sm:p-12 selection:bg-amber-500/20 selection:text-amber-200">
      {/* Header */}
      <header className="max-w-4xl mx-auto flex items-center justify-between pb-8 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          <h1 className="text-base sm:text-lg flex items-center gap-2">
            <span className="font-display font-bold tracking-widest text-white uppercase text-sm sm:text-base">
              Verify<span className="text-amber-400">Me</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400 tracking-wider uppercase hidden sm:inline">
              // CERTIFICATE INSPECTOR
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/verify"
            className="text-xs px-3.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition font-mono tracking-wider"
          >
            ← COMMAND STATION
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto mt-10 space-y-6">
        <div>
          <div className="font-mono text-[10px] text-amber-400 uppercase tracking-widest font-semibold">
            INDEPENDENT CRYPTOGRAPHIC AUDIT
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white mt-1">
            Public Certificate Verifier
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans leading-relaxed">
            Upload a signed ProtectMedia cryptographic certificate (.json) to independently confirm authorship, tamper integrity, and ledger registration.
          </p>
        </div>

        <div className="bg-[#090c12]/95 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 backdrop-blur-xl shadow-2xl corner-bracket">
          <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
            CERTIFICATE PAYLOAD (.JSON)
          </label>

          <div className="border-2 border-dashed border-white/15 hover:border-amber-500/40 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-black/40 transition">
            <input
              type="file"
              accept=".json,application/json"
              id="cert-upload"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="cert-upload"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-lg cursor-pointer border border-white/20 transition font-sans tracking-wider uppercase"
            >
              SELECT CERTIFICATE FILE
            </label>

            {certData ? (
              <div className="text-center font-mono text-xs text-amber-400 mt-2 bg-amber-950/30 border border-amber-800/50 px-3 py-1.5 rounded">
                ✓ Loaded: {certData.asset?.fileName || "Certificate JSON"}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">
                Drop any valid PM-Certificate-*.json file
              </p>
            )}
          </div>

          <button
            onClick={handleVerifyCertificate}
            disabled={!certData || isLoading}
            className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold tracking-wider uppercase rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed font-sans shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs">VERIFYING CRYPTOGRAPHIC SIGNATURE...</span>
              </>
            ) : (
              <span>VERIFY AUTHENTICITY</span>
            )}
          </button>

          {errorMessage && (
            <div className="p-4 rounded-xl border bg-red-950/40 border-red-800 text-red-300 text-xs font-mono">
              ✕ {errorMessage}
            </div>
          )}

          {verificationResult && (
            <div
              className={`p-6 rounded-xl border text-xs space-y-4 ${
                verificationResult.valid
                  ? "bg-emerald-950/20 border-emerald-800/80 text-emerald-300"
                  : "bg-red-950/20 border-red-800/80 text-red-300"
              }`}
            >
              <div className="flex items-center gap-2 font-display font-bold text-xs tracking-wider uppercase">
                {verificationResult.valid ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                    <span>✓ CRYPTOGRAPHIC SIGNATURE & PROVENANCE VALID</span>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                    <span>✕ CERTIFICATE VERIFICATION FAILED</span>
                  </>
                )}
              </div>

              {verificationResult.valid ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-slate-300">
                  <div className="p-3 bg-black/50 rounded border border-white/5">
                    <span className="text-slate-500 block text-[10px] font-mono tracking-wider uppercase">ASSET IDENTIFIER</span>
                    <span className="text-white break-all font-mono text-[11px]">{verificationResult.assetId}</span>
                  </div>
                  <div className="p-3 bg-black/50 rounded border border-white/5">
                    <span className="text-slate-500 block text-[10px] font-mono tracking-wider uppercase">REGISTERED FILE</span>
                    <span className="text-white font-sans text-xs font-medium">{verificationResult.fileName}</span>
                  </div>
                  <div className="p-3 bg-black/50 rounded border border-white/5">
                    <span className="text-slate-500 block text-[10px] font-mono tracking-wider uppercase">TIMESTAMP OF REGISTRY</span>
                    <span className="text-amber-400 font-mono text-[11px]">{verificationResult.registeredAt}</span>
                  </div>
                  <div className="p-3 bg-black/50 rounded border border-white/5">
                    <span className="text-slate-500 block text-[10px] font-mono tracking-wider uppercase">AUDIT CHAIN RECORD COUNT</span>
                    <span className="text-emerald-400 font-mono text-xs font-bold">{verificationResult.auditEventsCount} Events</span>
                  </div>
                </div>
              ) : (
                <p className="text-red-400 leading-relaxed font-mono text-xs">{verificationResult.reason}</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}