import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import { injectBaseStyles, PLAYER_COLORS } from '@/Shared';
import { connectSocket, getSocket } from '@/socket';
import type { TypioRoom, TypioUser, LobbyPlayer, RaceFinishResult } from '@/types';

const PASSAGES: Record<string, string> = {
  Beginner:
    'the cat sat on the mat and looked at the dog by the door',
  Intermediate:
    'a quick brown fox jumps over the lazy dog near the old oak tree by the river',
  Advanced:
    'the complexity of modern software systems demands rigorous testing methodologies and careful attention to edge cases throughout the development lifecycle',
};

type RaceOpponent = {
  username: string;
  pct: number;
  wpm: number;
  color: string;
  isMe?: boolean;
};

type RaceScreenProps = {
  room: TypioRoom | null;
  user: TypioUser | null;
  players?: LobbyPlayer[];
  onFinish: (result: RaceFinishResult) => void;
};

export default function RaceScreen({ room, user, players: initialPlayers, onFinish }: RaceScreenProps) {
  const passage = PASSAGES[room?.difficulty ?? ''] ?? PASSAGES.Beginner;
  const words = passage.split(' ');

  const [typed, setTyped] = useState('');
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [countdown, setCountdown] = useState(3);
  const [racing, setRacing] = useState(false);
  const [finished, setFinished] = useState(false);

  const [opponents, setOpponents] = useState<RaceOpponent[]>(() =>
    (initialPlayers || [])
      .filter((p) => p.username !== user?.username)
      .map((p, i) => ({
        username: p.username,
        pct: 0,
        wpm: 0,
        color: PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length]!,
      })),
  );

  const startTimeRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastEmitRef = useRef(0);
  const finishedEmittedRef = useRef(false);

  useEffect(() => {
    if (!room?.code || !user?.username) return;
    const socket = connectSocket();
    socket.emit('join-room', { roomCode: room.code, username: user.username });

    const handleProgress = ({ username, pct, wpm: opWpm }: { username: string; pct: number; wpm: number }) => {
      setOpponents((ops) =>
        ops.map((op) => (op.username === username ? { ...op, pct, wpm: opWpm } : op)),
      );
    };

    const handleFinished = ({ username }: { username: string; wpm: number; accuracy: number; placement: number }) => {
      setOpponents((ops) =>
        ops.map((op) => (op.username === username ? { ...op, pct: 100 } : op)),
      );
    };

    socket.on('player-progress', handleProgress);
    socket.on('player-finished', handleFinished);

    return () => {
      socket.off('player-progress', handleProgress);
      socket.off('player-finished', handleFinished);
    };
  }, [room?.code, user?.username]);

  useEffect(() => {
    if (countdown <= 0) {
      setRacing(true);
      inputRef.current?.focus();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (!startTimeRef.current || typed.length === 0) return;
    const elapsed = (Date.now() - startTimeRef.current) / 60000;
    const wordsDone = typed.trim().split(/\s+/).filter(Boolean).length;
    setWpm(elapsed > 0 ? Math.round(wordsDone / elapsed) : 0);
  }, [typed]);

  const myPct = (typed.length / passage.length) * 100;

  const handleInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!racing || finished) return;
      const val = e.target.value;
      if (val.length > passage.length) return;

      if (!startTimeRef.current && val.length > 0) startTimeRef.current = Date.now();
      setTyped(val);

      let errs = 0;
      for (let i = 0; i < val.length; i++) {
        if (val[i] !== passage[i]) errs++;
      }
      const currentAcc = val.length > 0 ? Math.round(((val.length - errs) / val.length) * 100) : 100;
      setAccuracy(currentAcc);

      const now = Date.now();
      if (room?.code && user?.username && now - lastEmitRef.current > 200) {
        lastEmitRef.current = now;
        const elapsed = startTimeRef.current ? (now - startTimeRef.current) / 60000 : 0;
        const wordsDone = val.trim().split(/\s+/).filter(Boolean).length;
        const currentWpm = elapsed > 0 ? Math.round(wordsDone / elapsed) : 0;
        getSocket().emit('progress-update', {
          roomCode: room.code,
          username: user.username,
          pct: (val.length / passage.length) * 100,
          wpm: currentWpm,
        });
      }

      if (val === passage) {
        setFinished(true);
        setRacing(false);
        const elapsed = (Date.now() - (startTimeRef.current ?? Date.now())) / 60000;
        const finalWpm = elapsed > 0 ? Math.round(words.length / elapsed) : 0;
        const finalAcc = val.length > 0 ? Math.round(((val.length - errs) / val.length) * 100) : 100;

        if (!finishedEmittedRef.current && room?.code && user?.username) {
          finishedEmittedRef.current = true;
          getSocket().emit('player-finished', {
            roomCode: room.code,
            username: user.username,
            wpm: finalWpm,
            accuracy: finalAcc,
          });
        }

        setTimeout(() => onFinish({ wpm: finalWpm, accuracy: finalAcc, placement: 1 }), 800);
      }
    },
    [racing, finished, passage, words.length, onFinish, room?.code, user?.username],
  );

  useEffect(() => {
    injectBaseStyles();
  }, []);

  const renderPassage = () =>
    passage.split('').map((char, i) => {
      let cls = 'rc';
      if (i < typed.length) cls += typed[i] === char ? ' ok' : ' err';
      else if (i === typed.length) cls += ' cur';
      return (
        <span key={i} className={cls}>
          {char}
        </span>
      );
    });

  const allPlayers = [
    { username: user?.username || 'you', pct: myPct, wpm, color: PLAYER_COLORS[0]!, isMe: true },
    ...opponents,
  ];

  return (
    <div className="t-page">
      <style>{`
        .race-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .race-stats { display: flex; gap: 16px; }
        .race-stat { text-align: center; }
        .race-stat-val { font-family: var(--mono); font-size: 22px; font-weight: 500; color: var(--accent); line-height: 1; }
        .race-stat-label { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }

        .passage-box {
          font-family: var(--mono);
          font-size: 18px;
          line-height: 2;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 24px 28px;
          margin-bottom: 16px;
          cursor: text;
          min-height: 100px;
        }
        .rc      { color: #c8c8c8; }
        .rc.ok   { color: var(--text); }
        .rc.err  { color: var(--red); background: #fff0f0; border-radius: 2px; }
        .rc.cur  { border-left: 2px solid var(--accent); animation: blink 1s step-end infinite; }
        @keyframes blink { 50% { border-color: transparent; } }

        .race-input {
          width: 100%;
          font-family: var(--mono);
          font-size: 15px;
          padding: 12px 16px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg);
          color: var(--text);
          outline: none;
          transition: border-color 0.15s;
          caret-color: var(--accent);
          margin-bottom: 24px;
        }
        .race-input:focus { border-color: var(--accent); }
        .race-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .progress-section { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
        .progress-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
        .progress-row:not(:last-child) { border-bottom: 1px solid var(--border); }
        .prog-name { font-family: var(--mono); font-size: 12px; width: 72px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .prog-track { flex: 1; height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
        .prog-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
        .prog-wpm { font-family: var(--mono); font-size: 11px; color: var(--muted); width: 48px; text-align: right; }

        .finished-banner {
          background: var(--green-light);
          border: 1px solid var(--green);
          border-radius: 10px;
          padding: 14px 20px;
          text-align: center;
          font-size: 14px;
          color: var(--green);
          font-weight: 500;
          margin-bottom: 16px;
        }
      `}</style>

      {countdown > 0 && (
        <div className="countdown-overlay">
          <div className="countdown-number" key={countdown}>
            {countdown}
          </div>
          <div className="countdown-label">Get ready…</div>
        </div>
      )}

      <nav className="t-nav">
        <div className="t-logo">
          typi<em>o</em>
        </div>
        <div className="race-stats">
          <div className="race-stat">
            <div className="race-stat-val">{wpm}</div>
            <div className="race-stat-label">WPM</div>
          </div>
          <div className="race-stat">
            <div
              className="race-stat-val"
              style={{ color: accuracy < 90 ? 'var(--red)' : 'var(--accent)' }}
            >
              {accuracy}%
            </div>
            <div className="race-stat-label">Accuracy</div>
          </div>
          <div className="race-stat">
            <div className="race-stat-val" style={{ color: 'var(--text)' }}>
              {Math.round(myPct)}%
            </div>
            <div className="race-stat-label">Progress</div>
          </div>
        </div>
      </nav>

      <div className="t-main">
        {finished && (
          <div className="finished-banner">🎉 You finished! Waiting for results…</div>
        )}

        <div className="passage-box" onClick={() => inputRef.current?.focus()} role="presentation">
          {renderPassage()}
        </div>

        <input
          ref={inputRef}
          className="race-input"
          value={typed}
          onChange={handleInput}
          disabled={!racing || finished}
          placeholder={
            racing ? 'Type the passage above…' : countdown > 0 ? 'Get ready…' : ''
          }
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />

        <div className="progress-section">
          <div className="t-label" style={{ marginBottom: 12 }}>
            Race progress
          </div>
          {allPlayers.map((p) => (
            <div className="progress-row" key={p.username}>
              <span
                className="prog-name"
                style={{
                  color: p.isMe ? 'var(--text)' : 'var(--muted)',
                  fontWeight: p.isMe ? 500 : 400,
                }}
              >
                {p.username}
              </span>
              <div className="prog-track">
                <div
                  className="prog-fill"
                  style={{ width: `${Math.min(100, p.pct)}%`, background: p.color }}
                />
              </div>
              <span className="prog-wpm">{p.wpm > 0 ? `${p.wpm} wpm` : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
