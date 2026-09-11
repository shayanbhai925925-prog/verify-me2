'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface CyberHUDOverlayProps {
  onInitializeVerification?: () => void;
  activeSection?: number;
  totalSections?: number;
}

export default function CyberHUDOverlay({
  onInitializeVerification,
  activeSection = 1,
  totalSections = 6,
}: CyberHUDOverlayProps) {
  // Demo state for scan results (connect to your inspection handler)
  const [scanResult, setScanResult] = useState<{
    completed: boolean;
    matched: boolean;
    phash: string;
  } | null>(null);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-6 sm:p-10 font-mono select-none">
      {/* Top Header Navigation */}
      <header className="pointer-events-auto flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2 text-white hover:opacity-80 transition">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-bold tracking-widest text-amber-500">VERIFYME</span>
          </Link>
          <span className="hidden sm:inline-block text-[10px] tracking-wider text-neutral-500 border border-neutral-800 px-2 py-0.5 rounded">
            AI SECURITY ARCHITECTURE
          </span>
        </div>

        <nav className="flex items-center space-x-5 sm:space-x-7 text-xs tracking-widest uppercase">
          <Link href="/editor" className="text-neutral-400 hover:text-amber-400 transition">
            AI Editor
          </Link>
          <Link href="/vault" className="text-neutral-400 hover:text-amber-400 transition">
            Vault Dashboard
          </Link>
          <Link href="/terminal" className="hidden md:inline-block text-neutral-400 hover:text-amber-400 transition">
            Terminal
          </Link>
          <Link href="/verify" className="text-neutral-400 hover:text-amber-400 transition">
            Certificates
          </Link>
          <Link href="/login" className="px-3 py-1 border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 transition">
            Sign In
          </Link>
        </nav>
      </header>

      {/* Main Hero & Scan Result Area */}
      <div className="pointer-events-auto max-w-xl space-y-6 my-auto">
        <div className="inline-flex items-center space-x-2 border border-neutral-800 bg-black/40 backdrop-blur px-3 py-1 text-[11px] tracking-widest uppercase text-amber-500">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span>Identity • Provenance • Authenticity</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight font-sans">
          Know what you&apos;re looking at.
        </h1>

        <p className="text-sm leading-relaxed text-neutral-400">
          VerifyMe is the autonomous AI security protocol engineered to instantly determine whether digital media is authentic, synthetic, altered, or authorized by its creator.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            onClick={onInitializeVerification}
            className="px-6 py-3 text-xs font-semibold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black transition font-mono flex items-center gap-2"
          >
            <span>Initialize Verification</span>
            <span>→</span>
          </button>
          <Link
            href="/vault"
            className="px-6 py-3 text-xs font-semibold uppercase tracking-wider border border-neutral-700 hover:border-amber-500 text-neutral-300 hover:text-amber-400 transition font-mono bg-black/40 backdrop-blur"
          >
            Vault Dashboard
          </Link>
        </div>

        {/* Informational State for Unregistered Media (Replaces the red error box) */}
        {scanResult && !scanResult.matched && (
          <div className="p-4 rounded border border-amber-500/40 bg-black/80 backdrop-blur text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                ANALYSIS COMPLETE: UNREGISTERED MEDIA
              </span>
              <span className="text-[10px] text-neutral-500">PROVENANCE: NEW</span>
            </div>
            <p className="text-neutral-300">
              This media has not yet been registered on the VerifyMe ledger. No prior tamper flags or creator records exist.
            </p>
            <div className="text-[10px] text-neutral-500 break-all pt-1 border-t border-white/5">
              Computed pHash: <span className="text-neutral-400 font-mono">{scanResult.phash}</span>
            </div>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 rounded transition text-xs uppercase"
              >
                Register as Original Creator →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer Status Indicators */}
      <footer className="flex items-end justify-between w-full text-[10px] text-neutral-500 uppercase tracking-widest pt-6">
        <div className="hidden sm:flex flex-col space-y-1">
          <div>SYS / STATUS: OPERATIONAL</div>
          <div>HASH ENGINE: SHA-256 + PHASH</div>
          <div className="text-emerald-500">PROVENANCE: C2PA READY</div>
        </div>

        <div className="text-right flex items-center space-x-2 ml-auto">
          <span>SECTION INDEX:</span>
          <span className="text-amber-500 font-bold">
            0{activeSection} / 0{totalSections}
          </span>
        </div>
      </footer>
    </div>
  );
}