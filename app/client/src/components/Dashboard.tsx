import { useState, useEffect, useRef } from 'react';
import { injectBaseStyles } from '@/Shared';
import { joinRoom, getProfile, getLeaderboard } from '@/api';
import type { LeaderboardEntry } from '@/api';
import type { TypioUser, HistoryEntry } from '@/types';

type DashboardProps = {
  user: TypioUser | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onProfile: () => void;
  onLogout: () => void;
};

export default function Dashboard({
  user,
  onCreateRoom,
  onJoinRoom,
  onProfile,
  onLogout,
}: DashboardProps) {
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [lbPeriod, setLbPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [lbData, setLbData] = useState<Record<'day' | 'week' | 'month', LeaderboardEntry[] | null>>({ day: null, week: null, month: null });
  const [lbLoading, setLbLoading] = useState(true);
  const joinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    injectBaseStyles();
  }, []);

  useEffect(() => {
    if (!user?.username) return;
    void getProfile(user.username).then((res) => {
      if ('profile' in res) setHistory(res.profile.history.slice(0, 5));
      setHistoryLoading(false);
    });
  }, [user?.username]);

  useEffect(() => {
    if (lbData[lbPeriod] !== null) return;
    setLbLoading(true);
    void getLeaderboard(lbPeriod).then((res) => {
      setLbData((prev) => ({ ...prev, [lbPeriod]: 'players' in res ? res.players : [] }));
      setLbLoading(false);
    });
  }, [lbPeriod, lbData]);

  const openJoin = () => {
    setJoinCode('');
    setJoinError('');
    setShowJoin(true);
    setTimeout(() => joinRef.current?.focus(), 80);
  };

  const handleJoinSubmit = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setJoinError('Code must be at least 4 characters.');
      return;
    }
    if (!user?.username) return;
    setJoining(true);
    setJoinError('');
    const result = await joinRoom(user.username, code);
    setJoining(false);
    if ('error' in result) {
      setJoinError(result.error);
      return;
    }
    setShowJoin(false);
    onJoinRoom(code);
  };

  return (
    <div className="t-page">
      <style>{`
        .welcome-row  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .welcome-name { font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
        .welcome-sub  { font-size: 14px; color: var(--muted); margin-top: 2px; }
        .action-row   { display: flex; gap: 10px; margin-bottom: 32px; }
        .empty-state  { text-align: center; padding: 48px 0; color: var(--muted); font-size: 14px; }
        .lb-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
        .lb-tab { font-family: var(--mono); font-size: 11px; padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border); background: none; cursor: pointer; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; transition: background 0.1s, color 0.1s; }
        .lb-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
        .lb-row { display: grid; grid-template-columns: 28px 1fr 56px; gap: 10px; align-items: center; padding: 10px 20px; border-bottom: 1px solid var(--border); font-size: 13px; }
        .lb-row:last-child { border-bottom: none; }
        .lb-rank { font-family: var(--mono); font-size: 11px; color: var(--muted); text-align: center; }
        .dash-hist-table { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
        .dash-hist-row { display: grid; grid-template-columns: 72px 1fr 70px 70px 40px; gap: 12px; align-items: center; padding: 11px 20px; border-bottom: 1px solid var(--border); font-size: 13px; }
        .dash-hist-row:last-child { border-bottom: none; }
        .dash-hist-row.header { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
        .dash-bar-track { height: 5px; background: var(--bg); border-radius: 3px; overflow: hidden; border: 1px solid var(--border); }
        .dash-bar-fill  { height: 100%; border-radius: 3px; background: var(--accent); }
        @media (max-width: 600px) { .action-row { flex-direction: column; } .dash-hist-row { grid-template-columns: 60px 1fr 56px 48px 32px; } }
      `}</style>

      <nav className="t-nav">
        <div className="t-logo">
          typi<em>o</em>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onProfile}>
            Profile
          </button>
          <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            {user?.username}
          </span>
          <button type="button" className="btn btn-outline btn-sm" onClick={onLogout}>
            Log out
          </button>
        </div>
      </nav>

      <div className="t-main">
        <div className="welcome-row">
          <div>
            <div className="welcome-name">Hey, {user?.username || 'racer'} 👋</div>
            <div className="welcome-sub">Ready for another race?</div>
          </div>
        </div>

        <div className="action-row">
          <button type="button" className="btn btn-primary btn-lg" onClick={onCreateRoom}>
            Create Room
          </button>
          <button type="button" className="btn btn-outline btn-lg" onClick={openJoin}>
            Join Room
          </button>
        </div>

        <div className="t-label" style={{ marginBottom: 12 }}>Top players</div>
        <div className="lb-tabs">
          {(['day', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              type="button"
              className={`lb-tab${lbPeriod === p ? ' active' : ''}`}
              onClick={() => setLbPeriod(p)}
            >
              {p === 'day' ? 'Today' : p === 'week' ? 'This week' : 'This month'}
            </button>
          ))}
        </div>
        {lbLoading && lbData[lbPeriod] === null ? (
          <div className="t-card" style={{ marginBottom: 32 }}><div className="empty-state">Loading…</div></div>
        ) : (lbData[lbPeriod] ?? []).length === 0 ? (
          <div className="t-card" style={{ marginBottom: 32 }}><div className="empty-state">No races recorded yet for this period.</div></div>
        ) : (
          <div className="dash-hist-table" style={{ marginBottom: 32 }}>
            {(lbData[lbPeriod] ?? []).map((entry, i) => {
              const medal = ({ 0: '🥇', 1: '🥈', 2: '🥉' } as Record<number, string>)[i];
              const maxWpm = Math.max(...(lbData[lbPeriod] ?? []).map((x) => x.wpm));
              return (
                <div className="lb-row" key={entry.username}>
                  <span className="lb-rank">{medal ?? `#${i + 1}`}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="dash-bar-track" style={{ flex: 1 }}>
                      <div className="dash-bar-fill" style={{ width: `${(entry.wpm / maxWpm) * 100}%` }} />
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, minWidth: 48 }}>{entry.username}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', textAlign: 'right' }}>
                    {entry.wpm} <span style={{ color: 'var(--muted)', fontSize: 10 }}>wpm</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="t-label" style={{ marginBottom: 12 }}>Recent races</div>
        {historyLoading ? (
          <div className="t-card"><div className="empty-state">Loading…</div></div>
        ) : history.length === 0 ? (
          <div className="t-card">
            <div className="empty-state">No race history yet — create or join a room to get started!</div>
          </div>
        ) : (
          <div className="dash-hist-table">
            <div className="dash-hist-row header">
              <span>Date</span>
              <span>WPM</span>
              <span>Accuracy</span>
              <span>Difficulty</span>
              <span>Place</span>
            </div>
            {history.map((r, i) => {
              const maxWpm = Math.max(...history.map((x) => x.wpm));
              return (
                <div className="dash-hist-row" key={i}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                    {r.date}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="dash-bar-track" style={{ flex: 1 }}>
                      <div className="dash-bar-fill" style={{ width: `${(r.wpm / maxWpm) * 100}%` }} />
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', width: 32, flexShrink: 0 }}>
                      {r.wpm}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                    {r.acc}%
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                    {r.difficulty}
                  </span>
                  <span style={{ fontSize: 15 }}>
                    {({ 1: '🥇', 2: '🥈', 3: '🥉' } as Record<number, string>)[r.placement] ?? `#${r.placement}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showJoin && (
        <div
          className="t-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowJoin(false)}
          role="presentation"
        >
          <div className="t-modal">
            <button type="button" className="t-modal-close" onClick={() => setShowJoin(false)}>
              ✕
            </button>
            <h2>Join a Room</h2>
            <p>Enter the room code from your host.</p>
            {joinError && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--red)',
                  background: '#fff5f5',
                  border: '1px solid #ffc9c9',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginBottom: 12,
                }}
              >
                {joinError}
              </div>
            )}
            <input
              ref={joinRef}
              style={{
                width: '100%',
                fontFamily: 'var(--mono)',
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: 8,
                textAlign: 'center',
                padding: 14,
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: 'var(--bg)',
                color: 'var(--accent)',
                outline: 'none',
                textTransform: 'uppercase',
                caretColor: 'var(--accent)',
                marginBottom: 16,
                transition: 'border-color 0.15s',
                display: 'block',
              }}
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.slice(0, 6));
                setJoinError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && void handleJoinSubmit()}
              placeholder="XXXXXX"
              maxLength={6}
              spellCheck={false}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setShowJoin(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => void handleJoinSubmit()}
                disabled={joinCode.length < 4 || joining}
              >
                {joining ? 'Joining…' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
