import { useState, useEffect, useRef } from 'react';
import { injectBaseStyles, PLAYER_COLORS } from '@/Shared';
import { getRoom, setReady, leaveRoom, startRace } from '@/api';
import { connectSocket, getSocket } from '@/socket';
import type { TypioRoom, TypioUser, LobbyPlayer } from '@/types';

type LobbyProps = {
  room: TypioRoom | null;
  user: TypioUser | null;
  onRaceStart: (payload: { room: TypioRoom | null; players: LobbyPlayer[] }) => void;
  onLeave: () => void;
};

export default function Lobby({ room, user, onRaceStart, onLeave }: LobbyProps) {
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [host, setHost] = useState<string>('');
  const [maxPlayers, setMaxPlayers] = useState<number>(room?.maxPlayers ?? 4);
  const [difficulty, setDifficulty] = useState<string>(room?.difficulty ?? 'Beginner');
  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState<
    { id: number; from: string; text: string; system: boolean }[]
  >([
    {
      id: 0,
      from: 'typio',
      text: `Room ${room?.code ?? ''} — waiting for players to join.`,
      system: true,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [pollError, setPollError] = useState('');
  const raceStartedRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectBaseStyles();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!room?.code || !user?.username) return;
    const socket = connectSocket();
    socket.emit('join-room', { roomCode: room.code, username: user.username });

    const handleChatMessage = (msg: { id: number; from: string; text: string }) => {
      setMessages((prev) => [...prev, { ...msg, system: false }]);
    };
    socket.on('chat-message', handleChatMessage);

    return () => {
      socket.off('chat-message', handleChatMessage);
    };
  }, [room?.code, user?.username]);

  useEffect(() => {
    if (!room?.code) return;
    let cancelled = false;

    const fetchRoom = async () => {
      try {
        const data = await getRoom(room.code);
        if (cancelled) return;
        if ('error' in data) {
          onLeave();
          return;
        }
        setPlayers(data.room.players);
        setHost(data.room.host);
        setMaxPlayers(data.room.maxPlayers);
        setDifficulty(data.room.difficulty);

        const me = data.room.players.find((p) => p.username === user?.username);
        if (me) setIsReady(me.ready);

        if (data.room.status === 'racing' && !raceStartedRef.current) {
          raceStartedRef.current = true;
          onRaceStart({
            room: {
              code: data.room.code,
              host: data.room.host,
              difficulty: data.room.difficulty,
              maxPlayers: data.room.maxPlayers,
              status: data.room.status,
              phraseIndex: data.room.phraseIndex,
            },
            players: data.room.players,
          });
        }
      } catch {
        if (!cancelled) setPollError('Connection issue — retrying…');
      }
    };

    void fetchRoom();
    const interval = setInterval(() => void fetchRoom(), 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [room?.code]);

  const allReady = players.length >= 2 && players.every((p) => p.ready);
  const isHost = user?.username === host;

  const toggleReady = async () => {
    const newReady = !isReady;
    setIsReady(newReady);
    setPlayers((ps) =>
      ps.map((p) => (p.username === user?.username ? { ...p, ready: newReady } : p)),
    );
    if (room?.code && user?.username) {
      await setReady(room.code, user.username, newReady);
    }
  };

  const handleStart = async () => {
    if (!room?.code || !user?.username || raceStartedRef.current) return;
    raceStartedRef.current = true;
    const result = await startRace(room.code, user.username);
    getSocket().emit('race-started', { roomCode: room.code, totalPlayers: players.length });
    const updatedRoom = !('error' in result) ? result.room : null;
    onRaceStart({
      room: {
        code: room.code,
        host: updatedRoom?.host ?? room.host,
        difficulty: updatedRoom?.difficulty ?? difficulty,
        maxPlayers: updatedRoom?.maxPlayers ?? maxPlayers,
        status: updatedRoom?.status ?? 'racing',
        phraseIndex: updatedRoom?.phraseIndex ?? 0,
      },
      players,
    });
  };

  const handleLeave = async () => {
    if (room?.code && user?.username) {
      await leaveRoom(room.code, user.username);
    }
    onLeave();
  };

  const sendChat = () => {
    if (!chatInput.trim() || !room?.code || !user?.username) return;
    getSocket().emit('chat-message', {
      roomCode: room.code,
      from: user.username,
      text: chatInput.trim(),
    });
    setChatInput('');
  };

  const copyCode = () => {
    void navigator.clipboard.writeText(room?.code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="t-page">
      <style>{`
        .lobby-layout { display: grid; grid-template-columns: 220px 1fr 240px; gap: 16px; }
        .lobby-panel  { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }

        .player-entry { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .player-entry:last-child { border-bottom: none; }
        .player-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .player-entry-name { font-size: 14px; flex: 1; }
        .player-host-tag { font-family: var(--mono); font-size: 10px; color: var(--muted); }

        .chat-messages { height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
        .chat-msg { font-size: 13px; line-height: 1.4; }
        .chat-msg .from { font-weight: 600; margin-right: 4px; }
        .chat-msg.system { color: var(--muted); font-style: italic; font-size: 12px; }
        .chat-input-row { display: flex; gap: 8px; }
        .chat-input-row input { flex: 1; font-size: 13px; }

        .code-pill {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: var(--mono); font-size: 15px; font-weight: 500;
          color: var(--accent); background: var(--accent-light);
          padding: 6px 14px; border-radius: 8px; cursor: pointer;
          border: 1px solid transparent; transition: background 0.15s;
        }
        .code-pill:hover { background: #e2e8ff; }

        .center-panel-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .settings-row { display: flex; gap: 8px; flex-wrap: wrap; }

        @media (max-width: 700px) {
          .lobby-layout { grid-template-columns: 1fr; }
        }
      `}</style>

      <nav className="t-nav">
        <div className="t-logo">
          typi<em>o</em>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="code-pill" onClick={copyCode}>
            {room?.code || 'XXXXXX'} {copied ? '✓' : '⎘'}
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void handleLeave()}>
            Leave
          </button>
        </div>
      </nav>

      {pollError && (
        <div
          style={{
            background: '#fff5f5',
            color: 'var(--red)',
            textAlign: 'center',
            padding: '8px',
            fontSize: 13,
          }}
        >
          {pollError}
        </div>
      )}

      <div className="t-main-lg">
        <div style={{ marginBottom: 20 }}>
          <div className="t-section-title">Lobby</div>
          <div className="t-section-sub">
            {difficulty} · Up to {maxPlayers} players
          </div>
        </div>

        <div className="lobby-layout">
          <div className="lobby-panel">
            <div className="t-label" style={{ marginBottom: 12 }}>
              Players ({players.length})
            </div>
            {players.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                Loading…
              </div>
            )}
            {players.map((p, i) => (
              <div className="player-entry" key={p.id}>
                <div
                  className="player-dot"
                  style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
                />
                <span className="player-entry-name">
                  {p.username}
                  {p.username === user?.username ? ' (you)' : ''}
                </span>
                {p.username === host && <span className="player-host-tag">host</span>}
                <div
                  className="badge"
                  style={{
                    background: p.ready ? 'var(--green-light)' : 'var(--bg)',
                    color: p.ready ? 'var(--green)' : 'var(--muted)',
                    border: `1px solid ${p.ready ? 'var(--green)' : 'var(--border)'}`,
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    padding: '2px 7px',
                    borderRadius: 5,
                  }}
                >
                  {p.ready ? 'ready' : 'waiting'}
                </div>
              </div>
            ))}
            {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
              <div className="player-entry" key={`empty-${i}`} style={{ opacity: 0.35 }}>
                <div className="player-dot" style={{ background: 'var(--border)' }} />
                <span className="player-entry-name" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                  waiting…
                </span>
              </div>
            ))}
          </div>

          <div className="lobby-panel">
            <div className="center-panel-top">
              <div className="t-label" style={{ margin: 0 }}>
                Race settings
              </div>
            </div>
            <div className="settings-row" style={{ marginBottom: 24 }}>
              <span className="badge badge-blue">{difficulty}</span>
              <span className="badge badge-gray">{maxPlayers} max players</span>
            </div>

            <hr className="t-divider" style={{ marginTop: 0 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                className={`btn btn-lg ${isReady ? 'btn-outline' : 'btn-success'}`}
                style={{ justifyContent: 'center' }}
                onClick={() => void toggleReady()}
              >
                {isReady ? '✅ Ready — click to unready' : 'Mark as Ready'}
              </button>

              {isHost && (
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  style={{ justifyContent: 'center' }}
                  onClick={() => void handleStart()}
                  disabled={!allReady}
                >
                  {allReady
                    ? 'Start Race →'
                    : `Waiting for players… (${players.filter((p) => p.ready).length}/${players.length} ready)`}
                </button>
              )}
            </div>

            {!isHost && !allReady && players.length > 0 && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>
                Waiting for the host to start the race once everyone is ready.
              </p>
            )}
          </div>

          <div className="lobby-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="t-label" style={{ marginBottom: 12 }}>
              Chat
            </div>
            <div className="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`chat-msg${m.system ? ' system' : ''}`}>
                  {!m.system && (
                    <span className="from" style={{ color: 'var(--accent)' }}>
                      {m.from}
                    </span>
                  )}
                  {m.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-row">
              <input
                className="t-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Say something…"
                maxLength={120}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={sendChat}>
                ↑
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
