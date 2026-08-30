'use client';

import { useState } from 'react';
import { signInWithMagicLink } from '../lib/auth';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signInWithMagicLink(email);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tight text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
            TraCar
          </h1>
          <p className="text-sm text-zinc-500">Keep your car in check</p>
        </div>

        {sent ? (
          <div
            className="rounded-2xl p-6 text-center space-y-3"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}
          >
            <div className="text-3xl">✉️</div>
            <p className="text-sm font-semibold text-emerald-400">Check your email</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We sent a magic link to <span className="text-white font-medium">{email}</span>.
              Click it to sign in — no password needed.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors pt-1"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Email address
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-400"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-black bg-white hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>

            <p className="text-center text-xs text-zinc-600 pt-1">
              New? Just enter your email — we'll create your account automatically.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
