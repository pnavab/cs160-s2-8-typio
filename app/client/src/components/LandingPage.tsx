import { useState, useEffect, useRef, type ChangeEvent } from 'react';

const DEMO_TEXT = 'the quick brown fox jumps over the lazy dog';

type LandingPageProps = {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLogin: () => void;
  onGuestJoin: (code: string) => Promise<{ error?: string }>;
};

export default function LandingPage({ onCreateRoom, onJoinRoom, onLogin, onGuestJoin }: LandingPageProps) {
  const [typed, setTyped] = useState('');
  const [wpm, setWpm] = useState(0);
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [guestJoining, setGuestJoining] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const joinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!startTimeRef.current || typed.length === 0) return;
    const elapsed = (Date.now() - startTimeRef.current) / 60000;
    const words = typed.trim().split(/\s+/).length;
    setWpm(elapsed > 0 ? Math.round(words / elapsed) : 0);
  }, [typed]);

  const handleDemoInput = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!startTimeRef.current && val.length > 0) startTimeRef.current = Date.now();
    if (val.length <= DEMO_TEXT.length) setTyped(val);
    if (val === DEMO_TEXT) {
      setTimeout(() => {
        setTyped('');
        startTimeRef.current = null;
        setWpm(0);
      }, 1200);
    }
  };

  const handleJoinSubmit = () => {
    if (joinCode.trim().length >= 4) onJoinRoom(joinCode.trim().toUpperCase());
  };

  const handleGuestJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    setJoinError('');
    setGuestJoining(true);
    const result = await onGuestJoin(code);
    setGuestJoining(false);
    if (result.error) setJoinError(result.error);
  };

  const renderDemoText = () =>
    DEMO_TEXT.split('').map((char, i) => {
      let cls = 'dc';
      if (i < typed.length) cls += typed[i] === char ? ' ok' : ' err';
      else if (i === typed.length) cls += ' cur';
      return (
        <span key={i} className={cls}>
          {char}
        </span>
      );
    });

  return (
    <div className="page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #f7f7f5;
          --surface: #ffffff;
          --border: #e4e4e0;
          --accent: #3b5bdb;
          --accent-light: #eef1ff;
          --red: #e03131;
          --text: #1a1a1a;
          --muted: #868686;
          --sans: 'DM Sans', sans-serif;
          --mono: 'DM Mono', monospace;
        }

        .page {
          min-height: 100vh;
          background: var(--bg);
          font-family: var(--sans);
          color: var(--text);
        }

        .nav {
          padding: 18px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }
        .logo {
          font-family: var(--mono);
          font-size: 18px;
          font-weight: 500;
        }
        .logo em { color: var(--accent); font-style: normal; }

        .nav-links { display: flex; gap: 8px; }

        .btn {
          font-family: var(--sans);
          font-size: 14px;
          font-weight: 500;
          padding: 8px 18px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.15s, border-color 0.15s;
        }
        .btn-outline {
          background: transparent;
          border-color: var(--border);
          color: var(--text);
        }
        .btn-outline:hover { background: var(--bg); }
        .btn-primary { background: var(--accent); color: #fff; }
        .btn-primary:hover { background: #3451c7; }
        .btn-primary:disabled { opacity: 0.4; cursor: default; }

        .main {
          max-width: 860px;
          margin: 0 auto;
          padding: 64px 40px 80px;
        }

        .hero-text {
          text-align: center;
          margin-bottom: 32px;
        }
        .hero-text h1 {
          font-size: 40px;
          font-weight: 600;
          letter-spacing: -1.5px;
          line-height: 1.15;
          margin-bottom: 12px;
        }
        .hero-text p {
          font-size: 16px;
          color: var(--muted);
        }

        .cta-row {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-bottom: 48px;
        }
        .btn-lg { font-size: 15px; padding: 11px 28px; border-radius: 10px; }

        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 28px;
          margin-bottom: 40px;
        }
        .card-label {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--muted);
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .demo-display {
          font-family: var(--mono);
          font-size: 17px;
          line-height: 1.9;
          margin-bottom: 16px;
          cursor: text;
        }
        .dc { color: #c8c8c8; }
        .dc.ok { color: var(--text); }
        .dc.err { color: var(--red); background: #fff0f0; border-radius: 2px; }
        .dc.cur { border-left: 2px solid var(--accent); animation: blink 1s step-end infinite; }
        @keyframes blink { 50% { border-color: transparent; } }

        .demo-input-row { display: flex; gap: 12px; align-items: center; }
        .demo-input {
          flex: 1;
          font-family: var(--mono);
          font-size: 14px;
          padding: 10px 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg);
          color: var(--text);
          outline: none;
          transition: border-color 0.15s;
          caret-color: var(--accent);
        }
        .demo-input:focus { border-color: var(--accent); }
        .demo-input::placeholder { color: #c0c0c0; }

        .wpm-badge {
          font-family: var(--mono);
          font-size: 13px;
          font-weight: 500;
          color: var(--accent);
          background: var(--accent-light);
          padding: 8px 14px;
          border-radius: 8px;
          white-space: nowrap;
          min-width: 80px;
          text-align: center;
        }

        .players { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
        .player { display: flex; align-items: center; gap: 12px; }
        .p-name {
          font-family: var(--mono);
          font-size: 12px;
          color: var(--muted);
          width: 48px;
          flex-shrink: 0;
        }
        .p-track {
          flex: 1;
          height: 6px;
          background: var(--bg);
          border-radius: 3px;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .p-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
        .p-wpm {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--muted);
          width: 36px;
          text-align: right;
        }

        .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .feat {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
        }
        .feat-icon { font-size: 20px; margin-bottom: 10px; }
        .feat-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
        .feat-desc { font-size: 13px; color: var(--muted); line-height: 1.5; }

        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: var(--muted);
          border-top: 1px solid var(--border);
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .modal {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 32px;
          width: 340px;
          position: relative;
        }
        .modal h2 { font-size: 20px; font-weight: 600; margin-bottom: 6px; }
        .modal p { font-size: 13px; color: var(--muted); margin-bottom: 20px; }

        .code-input {
          width: 100%;
          font-family: var(--mono);
          font-size: 24px;
          font-weight: 500;
          letter-spacing: 8px;
          text-align: center;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg);
          color: var(--accent);
          outline: none;
          text-transform: uppercase;
          caret-color: var(--accent);
          margin-bottom: 16px;
          transition: border-color 0.15s;
        }
        .code-input:focus { border-color: var(--accent); }
        .code-input::placeholder { color: var(--border); }

        .modal-actions { display: flex; gap: 8px; justify-content: center; }
        .modal-actions .btn { flex: 1; justify-content: center; text-align: center; }

        .close {
          position: absolute; top: 14px; right: 16px;
          background: none; border: none; cursor: pointer;
          font-size: 18px; color: var(--muted); line-height: 1;
        }
        .close:hover { color: var(--text); }

        @media (max-width: 640px) {
          .main { padding: 40px 20px 60px; }
          .hero-text h1 { font-size: 28px; }
          .features { grid-template-columns: 1fr; }
          .nav { padding: 14px 20px; }
        }
      `}</style>

      <nav className="nav">
        <div className="logo">
          typi<em>o</em>
        </div>
        <div className="nav-links">
          <button type="button" className="btn btn-outline" onClick={onLogin}>
            Log in
          </button>
          <button type="button" className="btn btn-primary" onClick={onLogin}>
            Sign up
          </button>
        </div>
      </nav>

      <div className="main">
        <div className="hero-text">
          <h1>Typing races, with friends.</h1>
          <p>Compete in real-time, track your WPM, and improve every race.</p>
        </div>

        <div className="cta-row">
          <button type="button" className="btn btn-primary btn-lg" onClick={onCreateRoom}>
            Create Room
          </button>
          <button
            type="button"
            className="btn btn-outline btn-lg"
            onClick={() => {
              setShowJoin(true);
              setTimeout(() => joinRef.current?.focus(), 80);
            }}
          >
            Join Room
          </button>
        </div>

        <div className="card">
          <div className="card-label">Try it out</div>
          <div className="demo-display" onClick={() => inputRef.current?.focus()} role="presentation">
            {renderDemoText()}
          </div>
          <div className="demo-input-row">
            <input
              ref={inputRef}
              className="demo-input"
              value={typed}
              onChange={handleDemoInput}
              placeholder="Start typing here..."
              spellCheck={false}
              autoComplete="off"
            />
            <div className="wpm-badge">{wpm > 0 ? `${wpm} WPM` : '— WPM'}</div>
          </div>

          <div className="players">
            {[
              { name: 'alex', pct: 78, wpm: 94, color: '#3b5bdb' },
              { name: 'sam', pct: 55, wpm: 67, color: '#2f9e44' },
              { name: 'you', pct: (typed.length / DEMO_TEXT.length) * 100, wpm, color: '#e03131' },
            ].map((p) => (
              <div className="player" key={p.name}>
                <span className="p-name">{p.name}</span>
                <div className="p-track">
                  <div
                    className="p-fill"
                    style={{ width: `${Math.min(100, p.pct)}%`, background: p.color }}
                  />
                </div>
                <span className="p-wpm">{p.wpm > 0 ? `${p.wpm}w` : '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="features">
          {[
            { icon: '⚡', title: 'Live races', desc: 'Real-time progress bars update as everyone types.' },
            { icon: '🔗', title: 'Room codes', desc: 'Share a code to invite friends — no account needed.' },
            { icon: '📊', title: 'WPM & accuracy', desc: 'Stats calculated live and saved to your profile.' },
          ].map((f) => (
            <div className="feat" key={f.title}>
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <p className="feat-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="footer">
        Typio — CS160 Team #8 · Eric Tran · Pablo Nava · Ace Lavilla · Hitarth Sharma
      </footer>

      {showJoin && (
        <div
          className="overlay"
          onClick={(e) => e.target === e.currentTarget && setShowJoin(false)}
          role="presentation"
        >
          <div className="modal">
            <button type="button" className="close" onClick={() => setShowJoin(false)}>✕</button>
            <h2>Join a Room</h2>
            <p>Enter the room code, then choose how to join.</p>
            <input
              ref={joinRef}
              className="code-input"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.slice(0, 6)); setJoinError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && void handleGuestJoin()}
              placeholder="XXXXXX"
              maxLength={6}
              spellCheck={false}
            />
            {joinError && (
              <div style={{ fontSize: 13, color: '#e03131', background: '#fff5f5', border: '1px solid #ffc9c9', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                {joinError}
              </div>
            )}
            <div className="modal-actions" style={{ flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', textAlign: 'center' }}
                onClick={() => void handleGuestJoin()}
                disabled={joinCode.length < 4 || guestJoining}
              >
                {guestJoining ? 'Joining…' : 'Join as Guest'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%', justifyContent: 'center', textAlign: 'center' }}
                onClick={handleJoinSubmit}
                disabled={joinCode.length < 4}
              >
                Log in & Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
