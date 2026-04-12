import { useState, useEffect } from 'react';
import { injectBaseStyles, PLAYER_COLORS } from '@/Shared';
import { connectSocket } from '@/socket';
import type { TypioRoom, TypioUser, RaceFinishResult, PlayerResult } from '@/types';

const MEDALS = ['🥇', '🥈', '🥉'];

type ResultsScreenProps = {
  room: TypioRoom | null;
  user: TypioUser | null;
  myResult: RaceFinishResult | null;
  onPlayAgain: () => void;
  onLeave: () => void;
};

export default function ResultsScreen({
  room,
  user,
  myResult,
  onPlayAgain,
  onLeave,
}: ResultsScreenProps) {
  const meName = user?.username || 'you';

  const [results, setResults] = useState<PlayerResult[]>(() => {
    if (myResult && meName) {
      return [{ username: meName, wpm: myResult.wpm, accuracy: myResult.accuracy, placement: 1 }];
    }
    return [];
  });

  useEffect(() => {
    injectBaseStyles();
  }, []);

  useEffect(() => {
    if (!room?.code) return;
    const socket = connectSocket();
    socket.emit('join-room', { roomCode: room.code, username: meName });
    socket.emit('request-results', { roomCode: room.code });

    const handleFinished = (result: PlayerResult) => {
      setResults((prev) => {
        if (prev.find((r) => r.username === result.username)) return prev;
        return [...prev, result];
      });
    };

    const handleAllResults = ({ results: allResults }: { results: PlayerResult[] }) => {
      setResults((prev) => {
        const merged = [...allResults];
        for (const local of prev) {
          if (!merged.find((r) => r.username === local.username)) {
            merged.push(local);
          }
        }
        return merged;
      });
    };

    socket.on('player-finished', handleFinished);
    socket.on('race-results', handleAllResults);

    return () => {
      socket.off('player-finished', handleFinished);
      socket.off('race-results', handleAllResults);
    };
  }, [room?.code, meName]);

  const sorted = [...results]
    .sort((a, b) => b.wpm - a.wpm)
    .map((r, i) => ({ ...r, placement: i + 1 }));

  const totalPlayers = room?.players?.length ?? sorted.length;
  const waitingCount = totalPlayers - sorted.length;

  return (
    <div className="t-page">
      <style>{`
        .results-header { text-align: center; margin-bottom: 40px; }
        .results-title  { font-size: 28px; font-weight: 600; letter-spacing: -1px; margin-bottom: 6px; }
        .results-sub    { font-size: 14px; color: var(--muted); }

        .podium-row { display: flex; gap: 12px; margin-bottom: 32px; }
        .podium-card {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 24px 20px;
          text-align: center;
          transition: border-color 0.2s;
        }
        .podium-card.me { border-color: var(--accent); background: var(--accent-light); }
        .podium-medal { font-size: 28px; margin-bottom: 8px; }
        .podium-name  { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
        .podium-wpm   { font-family: var(--mono); font-size: 28px; font-weight: 500; color: var(--accent); line-height: 1; }
        .podium-wpm-label { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
        .podium-acc   { font-size: 13px; color: var(--muted); margin-top: 8px; }

        .leaderboard { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; margin-bottom: 28px; }
        .lb-row { display: grid; grid-template-columns: 36px 1fr 80px 80px; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border); }
        .lb-row:last-child { border-bottom: none; }
        .lb-row.me-row { background: var(--accent-light); }
        .lb-rank  { font-family: var(--mono); font-size: 13px; color: var(--muted); text-align: center; }
        .lb-name  { font-size: 14px; font-weight: 500; }
        .lb-wpm   { font-family: var(--mono); font-size: 14px; font-weight: 500; color: var(--accent); text-align: right; }
        .lb-acc   { font-family: var(--mono); font-size: 13px; color: var(--muted); text-align: right; }
        .lb-header { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }

        .waiting-banner {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 20px;
          text-align: center;
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 16px;
        }

        .my-summary { display: flex; gap: 12px; margin-bottom: 28px; }
        .summary-stat { flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-align: center; }
        .summary-val  { font-family: var(--mono); font-size: 24px; font-weight: 500; color: var(--accent); }
        .summary-label { font-size: 12px; color: var(--muted); margin-top: 4px; }

        .action-row { display: flex; gap: 10px; justify-content: center; }

        @media (max-width: 600px) {
          .podium-row { flex-direction: column; }
          .my-summary { flex-direction: column; }
        }
      `}</style>

      <nav className="t-nav">
        <div className="t-logo">
          typi<em>o</em>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={onLeave}>
          Leave Room
        </button>
      </nav>

      <div className="t-main">
        <div className="results-header">
          <div className="results-title">Race Complete 🏁</div>
          <div className="results-sub">
            Room {room?.code} · {room?.difficulty || 'Beginner'}
          </div>
        </div>

        {waitingCount > 0 && (
          <div className="waiting-banner">
            ⏳ Waiting for {waitingCount} more player{waitingCount > 1 ? 's' : ''} to finish…
          </div>
        )}

        {sorted.length > 0 && (
          <div className="podium-row">
            {sorted.slice(0, 3).map((r, i) => (
              <div
                key={r.username}
                className={`podium-card${r.username === meName ? ' me' : ''}`}
              >
                <div className="podium-medal">{MEDALS[i] ?? `#${i + 1}`}</div>
                <div className="podium-name">
                  {r.username}
                  {r.username === meName ? ' (you)' : ''}
                </div>
                <div className="podium-wpm">{r.wpm}</div>
                <div className="podium-wpm-label">WPM</div>
                <div className="podium-acc">{r.accuracy}% accuracy</div>
              </div>
            ))}
          </div>
        )}

        <div className="leaderboard">
          <div className="lb-row">
            <div className="lb-rank lb-header">#</div>
            <div className="lb-header">Player</div>
            <div className="lb-header" style={{ textAlign: 'right' }}>WPM</div>
            <div className="lb-header" style={{ textAlign: 'right' }}>Accuracy</div>
          </div>
          {sorted.map((r, i) => (
            <div
              key={r.username}
              className={`lb-row${r.username === meName ? ' me-row' : ''}`}
            >
              <div className="lb-rank">
                <span style={{ color: PLAYER_COLORS[i % PLAYER_COLORS.length] }}>{r.placement}</span>
              </div>
              <div className="lb-name">
                {r.username}
                {r.username === meName && (
                  <span className="badge badge-blue" style={{ marginLeft: 8 }}>
                    you
                  </span>
                )}
              </div>
              <div className="lb-wpm">{r.wpm}</div>
              <div className="lb-acc">{r.accuracy}%</div>
            </div>
          ))}
          {sorted.length === 0 && (
            <div className="lb-row">
              <div style={{ gridColumn: '1/-1', color: 'var(--muted)', fontSize: 13 }}>
                No results yet…
              </div>
            </div>
          )}
        </div>

        <div className="action-row">
          <button type="button" className="btn btn-outline btn-lg" onClick={onLeave}>
            Leave
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={onPlayAgain}>
            Play Again →
          </button>
        </div>
      </div>
    </div>
  );
}
