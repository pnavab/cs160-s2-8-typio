import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import { injectBaseStyles, PLAYER_COLORS } from '@/Shared';
import { socket } from '@/socket';
import type { TypioRoom, TypioUser, LobbyPlayer, RaceFinishResult, RaceResult } from '@/types';

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
  onFinish: (result: { myResult: RaceFinishResult; allResults: RaceResult[] }) => void;
};

export default function RaceScreen({ room, user, players: initialPlayers, onFinish }: RaceScreenProps) {
  const [passage, setPassage] = useState('');
  const [typed, setTyped] = useState('');
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [racing, setRacing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [waitingForResults, setWaitingForResults] = useState(false);

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

  // Server-provided race start timestamp — used for synchronized WPM across all clients
  const startTimeRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    injectBaseStyles();
  }, []);

  useEffect(() => {
    const onCountdownTick = ({ value }: { value: number }) => {
      setCountdown(value);
    };

    const onRaceStart = ({ passage: p, startTime }: { passage: string; startTime: number }) => {
      setPassage(p);
      startTimeRef.current = startTime;
      setCountdown(null);
      setRacing(true);
      inputRef.current?.focus();
    };

    const onRaceProgress = ({
      players,
    }: {
      players: { username: string; pct: number; wpm: number; accuracy: number; finished: boolean }[];
    }) => {
      setOpponents((prev) =>
        prev.map((op) => {
          const update = players.find((p) => p.username === op.username);
          return update ? { ...op, pct: update.pct, wpm: update.wpm } : op;
        }),
      );
    };

    const onRaceResults = ({ results }: { results: RaceResult[] }) => {
      const me = results.find((r) => r.username === user?.username);
      const myResult: RaceFinishResult = {
        wpm: me?.wpm ?? 0,
        accuracy: me?.accuracy ?? 100,
        placement: me?.placement ?? results.length,
      };
      onFinish({ myResult, allResults: results });
    };

    socket.on('countdown_tick', onCountdownTick);
    socket.on('race_start', onRaceStart);
    socket.on('race_progress', onRaceProgress);
    socket.on('race_results', onRaceResults);

    return () => {
      socket.off('countdown_tick', onCountdownTick);
      socket.off('race_start', onRaceStart);
      socket.off('race_progress', onRaceProgress);
      socket.off('race_results', onRaceResults);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  const myPct = passage.length > 0 ? (typed.length / passage.length) * 100 : 0;

  const handleInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!racing || finished || !passage) return;
      const val = e.target.value;
      if (val.length > passage.length) return;

      setTyped(val);

      // Count errors and update accuracy
      let errs = 0;
      for (let i = 0; i < val.length; i++) {
        if (val[i] !== passage[i]) errs++;
      }
      const currentAccuracy = val.length > 0 ? Math.round(((val.length - errs) / val.length) * 100) : 100;
      setAccuracy(currentAccuracy);

      // WPM uses server startTime so all players' clocks are synchronized
      if (startTimeRef.current && val.length > 0) {
        const elapsedMin = (Date.now() - startTimeRef.current) / 60_000;
        const wordsDone = val.trim().split(/\s+/).filter(Boolean).length;
        setWpm(elapsedMin > 0 ? Math.round(wordsDone / elapsedMin) : 0);
      }

      // Emit live progress to server (broadcast to room)
      const pct = (val.length / passage.length) * 100;
      const currentWpm = startTimeRef.current && val.length > 0
        ? Math.round(val.trim().split(/\s+/).filter(Boolean).length / ((Date.now() - startTimeRef.current) / 60_000))
        : 0;
      socket.emit('progress_update', {
        roomCode: room?.code,
        pct,
        wpm: currentWpm,
        accuracy: currentAccuracy,
      });

      if (val === passage) {
        setFinished(true);
        setRacing(false);
        setWaitingForResults(true);

        // Final WPM: total passage words / total elapsed time from race start
        const elapsedMin = startTimeRef.current
          ? (Date.now() - startTimeRef.current) / 60_000
          : 0;
        const passageWords = passage.split(' ').length;
        const finalWpm = elapsedMin > 0 ? Math.round(passageWords / elapsedMin) : 0;
        const finalAcc = val.length > 0 ? Math.round(((val.length - errs) / val.length) * 100) : 100;

        socket.emit('player_finish', {
          roomCode: room?.code,
          wpm: finalWpm,
          accuracy: finalAcc,
        });
      }
    },
    [racing, finished, passage, room?.code],
  );

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

  const allPlayers: RaceOpponent[] = [
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

        .waiting-banner {
          background: var(--accent-light);
          border: 1px solid var(--accent);
          border-radius: 10px;
          padding: 14px 20px;
          text-align: center;
          font-size: 14px;
          color: var(--accent);
          font-weight: 500;
          margin-bottom: 16px;
        }
      `}</style>

      {countdown !== null && (
        <div className="countdown-overlay">
          <div className="countdown-number" key={countdown}>
            {countdown > 0 ? countdown : 'GO!'}
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
        {finished && !waitingForResults && (
          <div className="finished-banner">You finished!</div>
        )}
        {waitingForResults && (
          <div className="waiting-banner">You finished! Waiting for final results…</div>
        )}

        <div className="passage-box" onClick={() => inputRef.current?.focus()} role="presentation">
          {passage ? renderPassage() : (
            <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
              {countdown !== null ? 'Passage will appear when race starts…' : 'Connecting…'}
            </span>
          )}
        </div>

        <input
          ref={inputRef}
          className="race-input"
          value={typed}
          onChange={handleInput}
          disabled={!racing || finished}
          placeholder={
            racing ? 'Type the passage above…' : countdown !== null ? 'Get ready…' : 'Waiting for race to start…'
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
