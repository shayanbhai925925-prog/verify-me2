'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#050505] text-white flex flex-col justify-between selection:bg-amber-500/20 selection:text-amber-400 overflow-hidden font-mono">
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 w-full border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="font-bold tracking-widest text-amber-500 text-sm">VERIFYME</span>
          <span className="text-[11px] text-zinc-500 hidden sm:inline tracking-wider">AI SECURITY ARCHITECTURE</span>
        </div>

        <nav className="flex items-center space-x-6 text-xs tracking-wider">
          <Link href="/editor" className="text-zinc-400 hover:text-amber-400 transition-colors">
            AI EDITOR
          </Link>
          <Link href="/vault" className="text-zinc-400 hover:text-amber-400 transition-colors">
            EVIDENCE VAULT
          </Link>
          <Link href="/verify" className="text-zinc-400 hover:text-amber-400 transition-colors">
            VERIFY
          </Link>
          <Link href="/login" className="px-3 py-1.5 border border-zinc-800 text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 transition-all">
            SIGN IN
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 flex flex-col items-start justify-center flex-1">
        <div className="inline-flex items-center space-x-2 border border-amber-500/30 bg-amber-500/10 px-3 py-1 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span className="text-[11px] text-amber-400 tracking-widest uppercase">Identity • Provenance • Authenticity</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-sans font-bold tracking-tight text-white mb-6 leading-tight">
          Know what <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-400 to-zinc-600">
            you&apos;re looking at.
          </span>
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base max-w-xl mb-10 leading-relaxed font-sans">
          VerifyMe is the autonomous AI security protocol engineered to instantly determine whether digital media is authentic, synthetic, altered, or authorized by its creator.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/verify"
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs tracking-wider px-6 py-3.5 flex items-center space-x-2 transition-colors uppercase"
          >
            <span>Initialize Verification</span>
            <span>→</span>
          </Link>

          <Link
            href="/login"
            className="border border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 text-zinc-300 hover:text-white text-xs tracking-wider px-6 py-3.5 transition-colors uppercase"
          >
            Creator Access
          </Link>
        </div>
      </div>

      {/* Minimal Bottom Bar */}
      <footer className="relative z-10 w-full border-t border-zinc-900 px-6 py-3 flex items-center justify-between text-[11px] text-zinc-600">
        <span>PROTOCOL STATUS: ACTIVE</span>
        <span>END-TO-END CRYPTOGRAPHIC TRACE</span>
      </footer>
    </main>
  );
}