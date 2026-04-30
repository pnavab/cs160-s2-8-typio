import { useEffect } from 'react';
import { injectBaseStyles, PLAYER_COLORS } from '@/Shared';
import type { TypioRoom, TypioUser, RaceFinishResult, RaceResult } from '@/types';

const MEDALS = ['🥇', '🥈', '🥉'];

type ResultsScreenProps = {
  room: TypioRoom | null;
  user: TypioUser | null;
  myResult: RaceFinishResult | null;
  allResults: RaceResult[];
  onPlayAgain: () => void;
  onLeave: () => void;
};

export default function ResultsScreen({
  room,
  user,
  myResult,
  allResults,
  onPlayAgain,
  onLeave,
}: ResultsScreenProps) {
  useEffect(() => {
    injectBaseStyles();
  }, []);

  const meName = user?.username || 'you';

  // Use real results if available, otherwise fall back to just myResult as single-player
  const results: RaceResult[] = allResults.length > 0
    ? allResults
    : myResult
      ? [{ username: meName, wpm: myResult.wpm, accuracy: myResult.accuracy, placement: 1, finished: true }]
      : [];

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

        {myResult && (
          <div className="my-summary">
            <div className="summary-stat">
              <div className="summary-val">{myResult.wpm}</div>
              <div className="summary-label">WPM</div>
            </div>
            <div className="summary-stat">
              <div className="summary-val">{myResult.accuracy}%</div>
              <div className="summary-label">Accuracy</div>
            </div>
            <div className="summary-stat">
              <div className="summary-val">#{myResult.placement}</div>
              <div className="summary-label">Placement</div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="podium-row">
              {results.slice(0, 3).map((r, i) => (
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
                  {!r.finished && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>DNF</div>
                  )}
                </div>
              ))}
            </div>

            <div className="leaderboard">
              <div className="lb-row">
                <div className="lb-rank lb-header">#</div>
                <div className="lb-header">Player</div>
                <div className="lb-header" style={{ textAlign: 'right' }}>WPM</div>
                <div className="lb-header" style={{ textAlign: 'right' }}>Accuracy</div>
              </div>
              {results.map((r, i) => (
                <div
                  key={r.username}
                  className={`lb-row${r.username === meName ? ' me-row' : ''}`}
                >
                  <div className="lb-rank">
                    <span style={{ color: PLAYER_COLORS[i % PLAYER_COLORS.length] }}>
                      {r.placement}
                    </span>
                  </div>
                  <div className="lb-name">
                    {r.username}
                    {r.username === meName && (
                      <span className="badge badge-blue" style={{ marginLeft: 8 }}>
                        you
                      </span>
                    )}
                    {!r.finished && (
                      <span className="badge" style={{ marginLeft: 8, fontSize: 10, color: 'var(--muted)' }}>
                        DNF
                      </span>
                    )}
                  </div>
                  <div className="lb-wpm">{r.wpm > 0 ? r.wpm : '—'}</div>
                  <div className="lb-acc">{r.finished ? `${r.accuracy}%` : '—'}</div>
                </div>
              ))}
            </div>
          </>
        )}

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
