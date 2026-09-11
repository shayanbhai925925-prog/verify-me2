'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setIsError(true);
      setMessage(error.message);
    } else {
      setMessage(
        'Identity credentials registered. Check your email for verification before signing in.'
      );
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setIsError(true);
      setMessage(error.message);
    }
    // On success the onAuthStateChange listener in LoginPage handles redirect
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-[#090c12]/95 border border-white/10 p-7 sm:p-9 shadow-2xl backdrop-blur-xl relative corner-bracket space-y-6">
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </div>
          <span className="font-mono text-xs tracking-wider uppercase text-slate-300 font-semibold">
            SECURE ACCESS GATEWAY
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 border border-white/10 px-2 py-0.5 rounded">
          TLS 1.3 • SHA-256
        </span>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-black/60 border border-white/5 font-sans text-xs">
        <button
          type="button"
          onClick={() => { setAuthMode('login'); setMessage(''); }}
          className={`py-2 rounded-md transition font-semibold tracking-wider uppercase ${
            authMode === 'login'
              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          LOG IN
        </button>
        <button
          type="button"
          onClick={() => { setAuthMode('signup'); setMessage(''); }}
          className={`py-2 rounded-md transition font-semibold tracking-wider uppercase ${
            authMode === 'signup'
              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ENROLL
        </button>
      </div>

      <form className="space-y-4" onSubmit={authMode === 'login' ? handleLogin : handleSignUp}>
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">
            CREATOR IDENTITY / EMAIL
          </label>
          <div className="relative">
            <input
              type="email"
              placeholder="user@network.security"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/60 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 transition font-mono tracking-wide"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">
            SECURITY KEYPHRASE
          </label>
          <div className="relative">
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/60 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 transition font-mono tracking-widest"
              required
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          </div>
          <p className="text-[11px] font-sans text-slate-500 mt-1 font-normal">
            Minimum 6 characters • Cryptographically salted
          </p>
        </div>

        <div className="pt-2">
          {authMode === 'login' ? (
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-sans font-bold text-xs tracking-wider uppercase transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <span>AUTHENTICATE SESSION</span>
                  <span className="font-mono">→</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-sans font-bold text-xs tracking-wider uppercase rounded-lg border border-white/20 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>REGISTERING...</span>
                </>
              ) : (
                <>
                  <span>ENROLL NEW CREATOR</span>
                  <span className="font-mono">→</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>

      {/* Response Message */}
      {message && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-mono leading-relaxed ${
            isError
              ? 'bg-red-950/40 border-red-800 text-red-300'
              : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
          }`}
        >
          <div className="font-bold mb-0.5 tracking-wider">
            {isError ? '✕ AUTHENTICATION ALERT' : '✓ IDENTITY CONFIRMED'}
          </div>
          <p className="font-sans text-xs">{message}</p>
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500 tracking-wider">
        <span>SESSION ENCRYPTED</span>
        <span>SUPABASE RLS PROTECTED</span>
      </div>
    </div>
  );
}
