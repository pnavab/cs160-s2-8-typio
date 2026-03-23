import { useState, useEffect } from 'react';
import { injectBaseStyles } from '@/Shared';
import type { TypioRoom, TypioUser } from '@/types';
import {createRoom} from '@/api';

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;
const MAX_PLAYERS = [2, 3, 4, 5, 6] as const;

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

type CreateRoomProps = {
  user: TypioUser | null;
  onRoomCreated: (r: TypioRoom) => void;
  onBack: () => void;
};

export default function CreateRoom({ user: _user, onRoomCreated, onBack }: CreateRoomProps) {
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('Beginner');
  const [maxPlayers, setMaxPlayers] = useState<(typeof MAX_PLAYERS)[number]>(4);
  const [roomCode, setRoomCode] = useState(generateCode());
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    injectBaseStyles();
  }, []);

  const handleCreate = async () => {
    if (!_user) return
    setCreating(true);
    const result = await createRoom({
      hostId: _user.email,
      username: _user.username,
      maxPlayers
    })
    setCreating(false);
    if ('error' in result) {
      console.error(result.error)
      return
    }
    onRoomCreated({ code: result.room.code, difficulty, maxPlayers });
  };

  const copyCode = () => {
    void navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="t-page">
      <style>{`
        .cr-opt-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .cr-opt {
          padding: 8px 16px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          font-family: var(--sans);
          font-size: 14px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
          color: var(--text);
        }
        .cr-opt.active { border-color: var(--accent); background: var(--accent-light); color: var(--accent); font-weight: 500; }
        .cr-opt:hover:not(.active) { border-color: var(--muted); }
        .code-display {
          font-family: var(--mono);
          font-size: 32px;
          font-weight: 500;
          letter-spacing: 8px;
          color: var(--accent);
          background: var(--accent-light);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px 28px;
          text-align: center;
          cursor: pointer;
          transition: background 0.15s;
          user-select: all;
        }
        .code-display:hover { background: #e2e8ff; }
        .code-hint { font-size: 12px; color: var(--muted); text-align: center; margin-top: 8px; }
        .field-gap { margin-bottom: 24px; }
      `}</style>

      <nav className="t-nav">
        <div className="t-logo">
          typi<em>o</em>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={onBack}>
          ← Back
        </button>
      </nav>

      <div className="t-main-sm">
        <div style={{ marginBottom: 32 }}>
          <div className="t-section-title">Create a Room!</div>
          <div className="t-section-sub">Set up your race and share the code.</div>
        </div>

        <div className="field-gap">
          <span className="t-label">Room code</span>
          <button type="button" className="code-display" onClick={copyCode}>
            {roomCode}
          </button>
          <div className="code-hint">{copied ? '✓ Copied!' : 'Click to copy - Share this with friends'}</div>
        </div>

        <hr className="t-divider" />

        <div className="field-gap">
          <span className="t-label">Difficulty</span>
          <div className="cr-opt-row">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                className={`cr-opt${difficulty === d ? ' active' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="field-gap">
          <span className="t-label">Max players</span>
          <div className="cr-opt-row">
            {MAX_PLAYERS.map((n) => (
              <button
                key={n}
                type="button"
                className={`cr-opt${maxPlayers === n ? ' active' : ''}`}
                onClick={() => setMaxPlayers(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <hr className="t-divider" />

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-outline btn-lg" onClick={() => setRoomCode(generateCode())}>
            ↻ New code
          </button>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => void handleCreate()}
            disabled={creating}
          >
            {creating ? 'Creating…' : 'Create Room →'}
          </button>
        </div>
      </div>
    </div>
  );
}
