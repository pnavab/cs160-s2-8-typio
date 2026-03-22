import { useState, useEffect } from 'react';
import { injectBaseStyles } from '@/Shared';
import type { TypioUser } from '@/types';

const MOCK_PROFILE = {
  username: 'you',
  email: 'you@example.com',
  joinedDate: 'January 2026',
  racesPlayed: 47,
  bestWpm: 112,
  avgWpm: 84,
  avgAccuracy: 96.2,
  history: [
    { date: 'Mar 14', wpm: 91, acc: 97, placement: 2 },
    { date: 'Mar 13', wpm: 84, acc: 95, placement: 3 },
    { date: 'Mar 12', wpm: 112, acc: 98, placement: 1 },
    { date: 'Mar 11', wpm: 78, acc: 94, placement: 2 },
    { date: 'Mar 10', wpm: 88, acc: 96, placement: 1 },
    { date: 'Mar 9', wpm: 71, acc: 92, placement: 3 },
    { date: 'Mar 8', wpm: 80, acc: 95, placement: 2 },
    { date: 'Mar 7', wpm: 75, acc: 93, placement: 2 },
    { date: 'Mar 6', wpm: 68, acc: 91, placement: 4 },
    { date: 'Mar 5', wpm: 82, acc: 96, placement: 1 },
  ],
};

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const TABS = ['Overview', 'History', 'Settings'] as const;

function WpmChart({ history }: { history: typeof MOCK_PROFILE.history }) {
  const max = Math.max(...history.map((r) => r.wpm)) + 10;
  const W = 560;
  const H = 100;
  const PAD = 16;
  const n = Math.max(1, history.length - 1);
  const step = (W - PAD * 2) / n;
  const toY = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const pts = history.map((r, i) => [PAD + i * step, toY(r.wpm)] as const);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const last = pts[pts.length - 1];
  const first = pts[0];
  const area =
    last && first ? `${path} L${last[0]},${H - PAD} L${first[0]},${H - PAD} Z` : '';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 100, display: 'block' }}>
      <defs>
        <linearGradient id="wpmGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b5bdb" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3b5bdb" stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill="url(#wpmGrad)" />}
      <path
        d={path}
        fill="none"
        stroke="#3b5bdb"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#3b5bdb" />
      ))}
    </svg>
  );
}

type ProfilePageProps = {
  user: TypioUser | null;
  onBack: () => void;
  onLogout: () => void;
};

export default function ProfilePage({ user, onBack, onLogout }: ProfilePageProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    username: user?.username || MOCK_PROFILE.username,
    email: user?.email || MOCK_PROFILE.email,
  });
  const p = MOCK_PROFILE;

  useEffect(() => {
    injectBaseStyles();
  }, []);

  const handleSave = async () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="t-page">
      <style>{`
        .profile-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
        .ptab { background: none; border: none; border-bottom: 2px solid transparent; padding: 10px 18px; font-family: var(--sans); font-size: 14px; font-weight: 500; color: var(--muted); cursor: pointer; margin-bottom: -1px; transition: color 0.15s, border-color 0.15s; }
        .ptab.active { color: var(--accent); border-bottom-color: var(--accent); }
        .ptab:hover:not(.active) { color: var(--text); }

        .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
        .stat-box { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; }
        .stat-val { font-family: var(--mono); font-size: 28px; font-weight: 500; color: var(--accent); line-height: 1; }
        .stat-lbl { font-size: 12px; color: var(--muted); margin-top: 4px; }

        .chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 24px; margin-bottom: 24px; }
        .chart-dates { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 10px; color: var(--muted); margin-top: 8px; }

        .hist-table { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
        .hist-row { display: grid; grid-template-columns: 80px 1fr 60px 40px; gap: 12px; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--border); font-size: 13px; }
        .hist-row:last-child { border-bottom: none; }
        .hist-row.header { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
        .hist-bar-wrap { flex: 1; }
        .hist-bar-track { height: 5px; background: var(--bg); border-radius: 3px; overflow: hidden; border: 1px solid var(--border); }
        .hist-bar-fill  { height: 100%; border-radius: 3px; background: var(--accent); }

        .settings-form { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 28px; max-width: 420px; }
        .settings-field { margin-bottom: 20px; }
        .settings-field label { font-family: var(--mono); font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px; }
        .danger-zone { margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border); }
        .danger-title { font-size: 14px; font-weight: 600; color: var(--red); margin-bottom: 8px; }
        .danger-sub   { font-size: 13px; color: var(--muted); margin-bottom: 16px; }

        @media (max-width: 640px) { .stat-row { grid-template-columns: 1fr 1fr; } .hist-row { grid-template-columns: 60px 1fr 48px 36px; } }
      `}</style>

      <nav className="t-nav">
        <div className="t-logo">
          typi<em>o</em>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onBack}>
            ← Dashboard
          </button>
        </div>
      </nav>

      <div className="t-main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--accent-light)',
              border: '2px solid var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--mono)',
              fontSize: 22,
              fontWeight: 500,
              color: 'var(--accent)',
              flexShrink: 0,
            }}
          >
            {(user?.username || p.username).slice(0, 1).toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.5 }}>
              {user?.username || p.username}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Joined {p.joinedDate}</div>
          </div>
        </div>

        <div className="profile-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`ptab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Overview' && (
          <>
            <div className="stat-row">
              {[
                { val: p.racesPlayed, lbl: 'Races played' },
                { val: p.bestWpm, lbl: 'Best WPM' },
                { val: p.avgWpm, lbl: 'Avg WPM' },
                { val: `${p.avgAccuracy}%`, lbl: 'Avg accuracy' },
              ].map((s) => (
                <div className="stat-box" key={s.lbl}>
                  <div className="stat-val">{s.val}</div>
                  <div className="stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>

            <div className="chart-card">
              <div className="t-label" style={{ marginBottom: 12 }}>
                WPM over time
              </div>
              <WpmChart history={[...p.history].reverse()} />
              <div className="chart-dates">
                <span>{p.history[p.history.length - 1]!.date}</span>
                <span>{p.history[0]!.date}</span>
              </div>
            </div>
          </>
        )}

        {tab === 'History' && (
          <div className="hist-table">
            <div className="hist-row header">
              <span>Date</span>
              <span>WPM</span>
              <span>Accuracy</span>
              <span>Place</span>
            </div>
            {p.history.map((r, i) => {
              const maxWpm = Math.max(...p.history.map((x) => x.wpm));
              return (
                <div className="hist-row" key={i}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                    {r.date}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="hist-bar-track" style={{ flex: 1 }}>
                        <div
                          className="hist-bar-fill"
                          style={{ width: `${(r.wpm / maxWpm) * 100}%` }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 12,
                          color: 'var(--accent)',
                          width: 36,
                        }}
                      >
                        {r.wpm}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                    {r.acc}%
                  </span>
                  <span style={{ fontSize: 16 }}>{MEDALS[r.placement] || `#${r.placement}`}</span>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'Settings' && (
          <div className="settings-form">
            <div className="settings-field">
              <label htmlFor="settings-username">Username</label>
              <input
                id="settings-username"
                className="t-input"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="settings-email">Email</label>
              <input
                id="settings-email"
                className="t-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="settings-password">New password</label>
              <input
                id="settings-password"
                className="t-input"
                type="password"
                placeholder="Leave blank to keep current"
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSave()}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {saved ? '✓ Saved!' : 'Save changes'}
            </button>

            <div className="danger-zone">
              <div className="danger-title">Danger Zone</div>
              <div className="danger-sub">Logging out will clear your session.</div>
              <button type="button" className="btn btn-danger btn-sm" onClick={onLogout}>
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
