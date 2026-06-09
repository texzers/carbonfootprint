import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button, LoadingSpinner } from '../shared';

export function LoginPage() {
  const { signInWithGoogle, signInAsDemo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message ?? 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-eco-forest via-eco-leaf to-eco-mint flex items-center justify-center p-4">
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white text-eco-forest px-4 py-2 rounded-lg font-medium z-50"
      >
        Skip to main content
      </a>

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-eco-mint/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-eco-mist/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-eco-leaf/5 rounded-full blur-3xl" />
      </div>

      <main id="main-content" className="relative z-10 w-full max-w-md">
        {/* Glass card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.3)]">
          {/* Logo & brand */}
          <div className="text-center mb-8">
            <div
              className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              aria-hidden="true"
            >
              <span className="text-4xl">🌍</span>
            </div>
            <h1 className="font-display font-bold text-4xl text-white mb-2">
              EcoTrack<span className="text-eco-mint"> AI</span>
            </h1>
            <p className="text-white/70 text-sm leading-relaxed">
              Your intelligent carbon footprint tracker.<br />
              Understand, track, and reduce your impact.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { value: '2.3t', label: '1.5°C target/yr' },
              { value: '10', label: 'Google integrations' },
              { value: 'AI', label: 'Personalised coach' },
            ].map((stat) => (
              <div key={stat.label} className="text-center bg-white/10 rounded-xl p-3">
                <div className="font-display font-bold text-xl text-eco-mint">{stat.value}</div>
                <div className="text-white/60 text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Sign in button */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-eco-ink font-semibold py-3.5 px-6 rounded-2xl hover:bg-eco-mist transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-eco-leaf disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Sign in with Google"
            >
              {loading ? (
                <LoadingSpinner size={20} className="text-eco-leaf" />
              ) : (
                <GoogleIcon />
              )}
              <span>{loading ? 'Signing in…' : 'Continue with Google'}</span>
            </button>

            <button
              type="button"
              onClick={signInAsDemo}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-3.5 px-6 rounded-2xl border border-white/20 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/50 disabled:opacity-60"
            >
              <span>🧪 Try Offline Demo Mode</span>
            </button>

            {error && (
              <p className="text-red-300 text-sm text-center bg-red-900/30 rounded-xl py-2 px-4" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* Features list */}
          <div className="mt-8 space-y-3">
            {[
              { icon: '🔒', text: 'Your data stays private — only you can see it' },
              { icon: '📊', text: 'IPCC-calibrated carbon calculations' },
              { icon: '🤖', text: 'Gemini AI coach with personalised advice' },
            ].map((f) => (
              <div key={f.text} className="flex items-start gap-3 text-white/70 text-xs">
                <span aria-hidden="true">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          <p className="text-white/40 text-xs text-center mt-6">
            By signing in, you agree to our{' '}
            <a href="#privacy" className="underline hover:text-white/60">Privacy Policy</a>
            {' '}& {' '}
            <a href="#terms" className="underline hover:text-white/60">Terms of Service</a>
          </p>
        </div>

        {/* Bottom tagline */}
        <p className="text-center text-white/40 text-xs mt-4">
          Powered by Google Cloud • Gemini AI • Firebase
        </p>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-eco-mist flex items-center justify-center" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-eco-forest rounded-2xl flex items-center justify-center">
            <span className="text-2xl">🌍</span>
          </div>
          <LoadingSpinner size={24} className="text-eco-leaf" />
          <p className="text-eco-slate text-sm">Loading EcoTrack AI…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <>{children}</>;
}
