'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import Auth from '@/components/Auth';

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setMounted(true);

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.replace('/verify');
      } else {
        setChecking(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace('/verify');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (!mounted || checking) {
    return (
      <div className="min-h-screen bg-[#040507] flex items-center justify-center font-mono text-xs text-amber-500/80">
        CHECKING SECURITY CLEARANCE...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#040507] bg-cyber-grid text-slate-100 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-sans font-medium text-xs text-slate-400 group-hover:text-amber-400 transition tracking-wider uppercase">
            ← RETURN TO NETWORK
          </span>
        </Link>
        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500 tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>VAULT READY</span>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md mx-auto my-12 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-950/20 text-amber-400 font-mono text-[10px] tracking-[0.14em] uppercase">
            VERIFYME CONTROL PLANE
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Creator Authentication
          </h1>
          <p className="font-sans text-xs sm:text-sm text-slate-300/80 max-w-xs mx-auto leading-relaxed">
            Authorize access to the Evidence Vault, issue media tokens, and register original assets.
          </p>
        </div>

        <Auth />
      </div>

      {/* Footer System Status */}
      <div className="relative z-10 max-w-5xl w-full mx-auto text-center border-t border-white/5 pt-6 text-[10px] font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 tracking-wider">
        <span>AUTHENTICATION PROTOCOL • ISO/IEC 27001 COMPLIANT</span>
        <span>VERIFYME AI FORENSICS ENGINE</span>
      </div>
    </main>
  );
}
