import { useState, useEffect, useRef } from 'react';
import { injectBaseStyles } from '@/Shared';
import { joinRoom } from '@/api';
import type { TypioUser } from '@/types';

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
        @media (max-width: 600px) { .action-row { flex-direction: column; } }
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

        <div className="t-card">
          <div className="empty-state">
            No race history yet — create or join a room to get started!
          </div>
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
