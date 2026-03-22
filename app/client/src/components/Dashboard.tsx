import { useState, useEffect, useRef } from 'react';
import { injectBaseStyles } from '@/Shared';
import type { TypioUser } from '@/types';

const MOCK_STATS = {
  racesPlayed: 47,
  bestWpm: 112,
  avgWpm: 84,
  avgAccuracy: 96.2,
  history: [
    { date: 'Mar 14', wpm: 91, acc: 97 },
    { date: 'Mar 13', wpm: 84, acc: 95 },
    { date: 'Mar 12', wpm: 112, acc: 98 },
    { date: 'Mar 11', wpm: 78, acc: 94 },
    { date: 'Mar 10', wpm: 88, acc: 96 },
    { date: 'Mar 9', wpm: 71, acc: 92 },
    { date: 'Mar 8', wpm: 80, acc: 95 },
  ],
};

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: 'var(--bg)',
          borderRadius: 3,
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${(value / max) * 100}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 12,
          color: 'var(--muted)',
          width: 36,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}

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
  const joinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    injectBaseStyles();
  }, []);

  const openJoin = () => {
    setJoinCode('');
    setJoinError('');
    setShowJoin(true);
    setTimeout(() => joinRef.current?.focus(), 80);
  };

  const handleJoinSubmit = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setJoinError('Code must be at least 4 characters.');
      return;
    }
    setShowJoin(false);
    onJoinRoom(code);
  };

  const stats = MOCK_STATS;
  const maxWpm = Math.max(...stats.history.map((r) => r.wpm));

  return (
    <div className="t-page">
      <style>{`
        .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 24px; }
        .stat-val { font-family: var(--mono); font-size: 36px; font-weight: 500; color: var(--accent); line-height: 1; margin-bottom: 4px; }
        .stat-label { font-size: 13px; color: var(--muted); }
        .history-row { display: flex; align-items: center; gap: 8px; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .history-row:last-child { border-bottom: none; }
        .history-date { font-family: var(--mono); font-size: 11px; color: var(--muted); width: 52px; flex-shrink: 0; }
        .history-acc  { font-family: var(--mono); font-size: 11px; color: var(--muted); width: 44px; text-align: right; }
        .welcome-row  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .welcome-name { font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
        .welcome-sub  { font-size: 14px; color: var(--muted); margin-top: 2px; }
        .action-row   { display: flex; gap: 10px; margin-bottom: 32px; }
        @media (max-width: 600px) { .dash-grid { grid-template-columns: 1fr; } .action-row { flex-direction: column; } }
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

        <div className="dash-grid">
          {[
            { val: stats.racesPlayed, label: 'Races played' },
            { val: stats.bestWpm, label: 'Best WPM' },
            { val: stats.avgWpm, label: 'Average WPM' },
            { val: `${stats.avgAccuracy}%`, label: 'Avg accuracy' },
          ].map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-val">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="t-card">
          <div className="t-label" style={{ marginBottom: 16 }}>
            Recent races
          </div>
          {stats.history.map((r) => (
            <div className="history-row" key={r.date}>
              <span className="history-date">{r.date}</span>
              <div style={{ flex: 1 }}>
                <MiniBar value={r.wpm} max={maxWpm + 10} color="var(--accent)" />
              </div>
              <span className="history-acc">{r.acc}%</span>
            </div>
          ))}
        </div>
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
              onKeyDown={(e) => e.key === 'Enter' && handleJoinSubmit()}
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
                onClick={handleJoinSubmit}
                disabled={joinCode.length < 4}
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
