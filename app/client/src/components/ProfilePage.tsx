import { useState, useEffect } from 'react';
import { injectBaseStyles } from '@/Shared';
import { getProfile, updateProfile, deleteAccount } from '@/api';
import type { TypioUser, UserProfile, HistoryEntry } from '@/types';

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const TABS = ['Overview', 'History', 'Settings'] as const;

function WpmChart({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) return null;
  const reversed = [...history].reverse();
  const max = Math.max(...reversed.map((r) => r.wpm)) + 10;
  const W = 560;
  const H = 100;
  const PAD = 16;
  const n = Math.max(1, reversed.length - 1);
  const step = (W - PAD * 2) / n;
  const toY = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const pts = reversed.map((r, i) => [PAD + i * step, toY(r.wpm)] as const);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const last = pts[pts.length - 1];
  const first = pts[0];
  const area = last && first ? `${path} L${last[0]},${H - PAD} L${first[0]},${H - PAD} Z` : '';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 100, display: 'block' }}>
      <defs>
        <linearGradient id="wpmGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b5bdb" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3b5bdb" stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill="url(#wpmGrad)" />}
      <path d={path} fill="none" stroke="#3b5bdb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  onUpdate: (updated: TypioUser) => void;
};

const EMPTY_PROFILE: UserProfile = {
  racesPlayed: 0,
  bestWpm: 0,
  avgWpm: 0,
  avgAccuracy: 0,
  joinedDate: null,
  history: [],
};

export default function ProfilePage({ user, onBack, onLogout, onUpdate }: ProfilePageProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);

  // Settings form state
  const [form, setForm] = useState({
    username: user?.username ?? '',
    email: user?.email ?? '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete-account confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    injectBaseStyles();
  }, []);

  useEffect(() => {
    if (!user?.username) return;
    setLoading(true);
    void getProfile(user.username).then((res) => {
      if ('profile' in res) setProfile(res.profile);
      setLoading(false);
    });
  }, [user?.username]);

  const handleSave = async () => {
    setSaveError('');
    setSaveSuccess('');
    if (!user?.username) return;

    if (!form.currentPassword) {
      setSaveError('Enter your current password to save changes.');
      return;
    }
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setSaveError('New passwords do not match.');
      return;
    }

    setSaving(true);
    const res = await updateProfile(user.username, form.currentPassword, {
      username: form.username !== user.username ? form.username : undefined,
      email: form.email !== user.email ? form.email : undefined,
      newPassword: form.newPassword || undefined,
    });
    setSaving(false);

    if ('error' in res) {
      setSaveError(res.error);
      return;
    }

    setSaveSuccess('Changes saved!');
    setForm((f) => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
    onUpdate({ username: res.user.username, email: res.user.email });
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const handleDelete = async () => {
    if (!user?.username || !deletePassword) return;
    setDeleteError('');
    setDeleting(true);
    const res = await deleteAccount(user.username, deletePassword);
    setDeleting(false);
    if ('error' in res) {
      setDeleteError(res.error);
      return;
    }
    onLogout();
  };

  const displayName = user?.username ?? '?';
  const maxHistoryWpm = profile.history.length > 0 ? Math.max(...profile.history.map((r) => r.wpm)) : 1;

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
        .hist-row { display: grid; grid-template-columns: 80px 1fr 70px 60px 40px; gap: 12px; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--border); font-size: 13px; }
        .hist-row:last-child { border-bottom: none; }
        .hist-row.header { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
        .hist-bar-track { height: 5px; background: var(--bg); border-radius: 3px; overflow: hidden; border: 1px solid var(--border); }
        .hist-bar-fill  { height: 100%; border-radius: 3px; background: var(--accent); }

        .settings-form { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 28px; max-width: 420px; }
        .settings-field { margin-bottom: 20px; }
        .settings-field label { font-family: var(--mono); font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px; }
        .danger-zone { margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border); }
        .danger-title { font-size: 14px; font-weight: 600; color: var(--red); margin-bottom: 8px; }
        .danger-sub   { font-size: 13px; color: var(--muted); margin-bottom: 16px; }

        .empty-state { text-align: center; padding: 48px 20px; color: var(--muted); font-size: 14px; }

        @media (max-width: 640px) { .stat-row { grid-template-columns: 1fr 1fr; } .hist-row { grid-template-columns: 60px 1fr 52px 48px 36px; } }
      `}</style>

      <nav className="t-nav">
        <div className="t-logo">typi<em>o</em></div>
        <button type="button" className="btn btn-outline btn-sm" onClick={onBack}>
          ← Dashboard
        </button>
      </nav>

      <div className="t-main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--accent-light)', border: '2px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 500,
              color: 'var(--accent)', flexShrink: 0,
            }}
          >
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.5 }}>{displayName}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {loading ? 'Loading…' : profile.joinedDate ? `Joined ${profile.joinedDate}` : 'Welcome!'}
            </div>
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
                { val: loading ? '…' : profile.racesPlayed, lbl: 'Races played' },
                { val: loading ? '…' : profile.bestWpm, lbl: 'Best WPM' },
                { val: loading ? '…' : profile.avgWpm, lbl: 'Avg WPM' },
                { val: loading ? '…' : `${profile.avgAccuracy}%`, lbl: 'Avg accuracy' },
              ].map((s) => (
                <div className="stat-box" key={s.lbl}>
                  <div className="stat-val">{s.val}</div>
                  <div className="stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>

            {!loading && profile.history.length > 0 ? (
              <div className="chart-card">
                <div className="t-label" style={{ marginBottom: 12 }}>WPM over time</div>
                <WpmChart history={profile.history} />
                <div className="chart-dates">
                  <span>{profile.history[profile.history.length - 1]!.date}</span>
                  <span>{profile.history[0]!.date}</span>
                </div>
              </div>
            ) : !loading ? (
              <div className="empty-state">No races played yet. Jump in and start racing!</div>
            ) : null}
          </>
        )}

        {tab === 'History' && (
          <>
            {!loading && profile.history.length === 0 ? (
              <div className="empty-state">No race history yet.</div>
            ) : (
              <div className="hist-table">
                <div className="hist-row header">
                  <span>Date</span>
                  <span>WPM</span>
                  <span>Accuracy</span>
                  <span>Difficulty</span>
                  <span>Place</span>
                </div>
                {profile.history.map((r, i) => (
                  <div className="hist-row" key={i}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                      {r.date}
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="hist-bar-track" style={{ flex: 1 }}>
                          <div
                            className="hist-bar-fill"
                            style={{ width: `${(r.wpm / maxHistoryWpm) * 100}%` }}
                          />
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', width: 36 }}>
                          {r.wpm}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                      {r.acc}%
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                      {r.difficulty}
                    </span>
                    <span style={{ fontSize: 16 }}>{MEDALS[r.placement] ?? `#${r.placement}`}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'Settings' && (
          <div className="settings-form">
            <div className="settings-field">
              <label htmlFor="settings-username">Username</label>
              <input
                id="settings-username"
                className="t-input"
                value={form.username}
                onChange={(e) => { setSaveError(''); setForm((f) => ({ ...f, username: e.target.value })); }}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="settings-email">Email</label>
              <input
                id="settings-email"
                className="t-input"
                type="email"
                value={form.email}
                onChange={(e) => { setSaveError(''); setForm((f) => ({ ...f, email: e.target.value })); }}
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0 20px' }} />

            <div className="settings-field">
              <label htmlFor="settings-new-password">New password</label>
              <input
                id="settings-new-password"
                className="t-input"
                type="password"
                placeholder="Leave blank to keep current"
                value={form.newPassword}
                onChange={(e) => { setSaveError(''); setForm((f) => ({ ...f, newPassword: e.target.value })); }}
              />
            </div>
            {form.newPassword && (
              <div className="settings-field">
                <label htmlFor="settings-confirm-password">Confirm new password</label>
                <input
                  id="settings-confirm-password"
                  className="t-input"
                  type="password"
                  placeholder="Re-enter new password"
                  value={form.confirmPassword}
                  onChange={(e) => { setSaveError(''); setForm((f) => ({ ...f, confirmPassword: e.target.value })); }}
                />
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0 20px' }} />

            <div className="settings-field">
              <label htmlFor="settings-current-password">Current password <span style={{ color: 'var(--red)' }}>*</span></label>
              <input
                id="settings-current-password"
                className="t-input"
                type="password"
                placeholder="Required to save any changes"
                value={form.currentPassword}
                onChange={(e) => { setSaveError(''); setForm((f) => ({ ...f, currentPassword: e.target.value })); }}
              />
            </div>

            {saveError && (
              <div style={{ fontSize: 13, color: 'var(--red)', background: '#fff5f5', border: '1px solid #ffc9c9', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div style={{ fontSize: 13, color: 'var(--green)', background: 'var(--green-light)', border: '1px solid var(--green)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                {saveSuccess}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSave()}
              disabled={saving}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>

            <div className="danger-zone">
              <div className="danger-title">Danger Zone</div>
              <div className="danger-sub">Logging out will clear your session.</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={onLogout}>
                  Log out
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => { setDeletePassword(''); setDeleteError(''); setShowDeleteModal(true); }}>
                  Delete account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div
          className="t-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
          role="presentation"
        >
          <div className="t-modal">
            <button type="button" className="t-modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            <h2 style={{ color: 'var(--red)' }}>Delete account</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
              This permanently deletes your account and all race history. This cannot be undone.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="delete-confirm-password" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                Confirm your password
              </label>
              <input
                id="delete-confirm-password"
                className="t-input"
                type="password"
                placeholder="Enter your password"
                value={deletePassword}
                onChange={(e) => { setDeleteError(''); setDeletePassword(e.target.value); }}
                onKeyDown={(e) => e.key === 'Enter' && void handleDelete()}
                autoFocus
              />
            </div>
            {deleteError && (
              <div style={{ fontSize: 13, color: 'var(--red)', background: '#fff5f5', border: '1px solid #ffc9c9', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => void handleDelete()}
                disabled={!deletePassword || deleting}
              >
                {deleting ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
