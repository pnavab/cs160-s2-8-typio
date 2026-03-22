import { useState, useEffect, type ChangeEvent } from 'react';
import { injectBaseStyles } from '@/Shared';
import type { TypioUser } from '@/types';
import { login as apiLogin, signup as apiSignup } from '@/api';

type AuthPageProps = {
  onSuccess: (u: TypioUser) => void;
  onBack: () => void;
};

export default function AuthPage({ onSuccess, onBack }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    injectBaseStyles();
  }, []);

  const set =
    (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setError('');
    };

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    if (mode === 'signup' && !form.username) {
      setError('Please choose a username.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result =
        mode === 'login'
          ? await apiLogin(form.email, form.password)
          : await apiSignup(form.username, form.email, form.password);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      onSuccess({
        username: result.user.username,
        email: result.user.email,
      });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="t-page">
      <style>{`
        .auth-nav { padding: 18px 40px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); background: var(--surface); }
        .auth-wrap { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 61px); padding: 40px 20px; }
        .auth-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; }
        .auth-title { font-size: 22px; font-weight: 600; letter-spacing: -0.5px; margin-bottom: 4px; }
        .auth-sub   { font-size: 13px; color: var(--muted); margin-bottom: 28px; }
        .auth-field { margin-bottom: 16px; }
        .auth-field label { font-family: var(--mono); font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px; }
        .auth-error { font-size: 13px; color: var(--red); background: #fff5f5; border: 1px solid #ffc9c9; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }
        .auth-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .auth-divider hr { flex: 1; border: none; border-top: 1px solid var(--border); }
        .auth-divider span { font-size: 12px; color: var(--muted); }
        .auth-switch { text-align: center; margin-top: 20px; font-size: 13px; color: var(--muted); }
        .auth-switch button { background: none; border: none; cursor: pointer; color: var(--accent); font-size: 13px; font-family: var(--sans); padding: 0; }
        .auth-switch button:hover { text-decoration: underline; }
        .tab-row { display: flex; background: var(--bg); border-radius: 10px; padding: 4px; margin-bottom: 28px; gap: 4px; }
        .tab-btn { flex: 1; padding: 8px; border: none; border-radius: 7px; cursor: pointer; font-family: var(--sans); font-size: 14px; font-weight: 500; transition: background 0.15s, color 0.15s; background: transparent; color: var(--muted); }
        .tab-btn.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
      `}</style>

      <nav className="auth-nav">
        <button
          type="button"
          className="t-logo"
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          typi<em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>o</em>
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onBack}>
          ← Back
        </button>
      </nav>

      <div className="auth-wrap">
        <div className="auth-card">
          <div className="tab-row">
            <button
              type="button"
              className={`tab-btn${mode === 'login' ? ' active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Log in
            </button>
            <button
              type="button"
              className={`tab-btn${mode === 'signup' ? ' active' : ''}`}
              onClick={() => {
                setMode('signup');
                setError('');
              }}
            >
              Sign up
            </button>
          </div>

          <div className="auth-title">{mode === 'login' ? 'Welcome back!' : 'Create your account!'}</div>
          <div className="auth-sub">
            {mode === 'login' ? 'Log in to track your stats and history.' : 'Join Typio and start racing.'}
          </div>

          {error && <div className="auth-error">{error}</div>}

          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="auth-username">Username</label>
              <input
                id="auth-username"
                className="t-input"
                value={form.username}
                onChange={set('username')}
                placeholder="e.g. SJSUSpartan"
                autoComplete="username"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="t-input"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="t-input"
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
              onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            onClick={() => void handleSubmit()}
            disabled={loading}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  );
}
