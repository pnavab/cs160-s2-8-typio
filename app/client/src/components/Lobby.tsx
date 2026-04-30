import { useState, useEffect, useRef } from 'react';
import { injectBaseStyles, PLAYER_COLORS } from '@/Shared';
import { socket } from '@/socket';
import type { TypioRoom, TypioUser, LobbyPlayer } from '@/types';

type LobbyProps = {
  room: TypioRoom | null;
  user: TypioUser | null;
  mode: 'create' | 'join' | 'rejoin';
  onRaceStart: (payload: { room: TypioRoom | null; players: LobbyPlayer[] }) => void;
  onLeave: () => void;
};

export default function Lobby({ room, user, mode, onRaceStart, onLeave }: LobbyProps) {
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [hostSocketId, setHostSocketId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState(room?.difficulty ?? 'Beginner');
  const [maxPlayers, setMaxPlayers] = useState(room?.maxPlayers ?? 4);
  const [messages, setMessages] = useState<
    { id: number; from: string; text: string; system: boolean }[]
  >([
    {
      id: 0,
      from: 'typio',
      text: `Room ${room?.code ?? ''} — share the code to invite players!`,
      system: true,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectBaseStyles();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset ready state when returning from results
  useEffect(() => {
    if (mode === 'rejoin') setIsReady(false);
  }, [mode]);

  // Join the room on mount (skip re-emitting join_room on play-again rejoin)
  useEffect(() => {
    if (!room?.code || !user?.username) return;

    if (mode !== 'rejoin') {
      socket.emit('join_room', {
        roomCode: room.code,
        username: user.username,
        isHost: mode === 'create',
        difficulty: room.difficulty,
        maxPlayers: room.maxPlayers,
      });
    }

    const onRoomState = (state: {
      hostSocketId: string;
      players: { id: string; username: string; ready: boolean }[];
      difficulty: string;
      maxPlayers: number;
    }) => {
      setHostSocketId(state.hostSocketId);
      setPlayers(state.players);
      setDifficulty(state.difficulty);
      setMaxPlayers(state.maxPlayers);
    };

    const onChatMessage = ({ from, text }: { from: string; text: string }) => {
      setMessages((m) => [...m, { id: Date.now(), from, text, system: false }]);
    };

    const onError = ({ message }: { message: string }) => {
      setMessages((m) => [
        ...m,
        { id: Date.now(), from: 'typio', text: `Error: ${message}`, system: true },
      ]);
    };

    socket.on('room_state', onRoomState);
    socket.on('chat_message', onChatMessage);
    socket.on('error', onError);

    return () => {
      socket.off('room_state', onRoomState);
      socket.off('chat_message', onChatMessage);
      socket.off('error', onError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code, user?.username, mode]);

  // Keep a ref to players so the race_starting handler always sees the latest list
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);

  useEffect(() => {
    const onRaceStarting = () => {
      onRaceStart({ room, players: playersRef.current });
    };
    socket.on('race_starting', onRaceStarting);
    return () => { socket.off('race_starting', onRaceStarting); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const allReady = players.length >= 2 && players.every((p) => p.ready);
  const isHost = socket.id === hostSocketId;

  const toggleReady = () => {
    const next = !isReady;
    setIsReady(next);
    socket.emit('player_ready', { roomCode: room?.code, ready: next });
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    socket.emit('chat_message', { roomCode: room?.code, text: chatInput.trim() });
    setChatInput('');
  };

  const copyCode = () => {
    void navigator.clipboard.writeText(room?.code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    socket.emit('start_race', { roomCode: room?.code });
  };

  // difficulty and maxPlayers come from socket room_state (fixes non-host mismatch)

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
          <button type="button" className="btn btn-outline btn-sm" onClick={onLeave}>
            Leave
          </button>
        </div>
      </nav>

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
                {p.id === hostSocketId && <span className="player-host-tag">host</span>}
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
            {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map(
              (_, i) => (
                <div className="player-entry" key={`empty-${i}`} style={{ opacity: 0.35 }}>
                  <div className="player-dot" style={{ background: 'var(--border)' }} />
                  <span className="player-entry-name" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                    waiting…
                  </span>
                </div>
              ),
            )}
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
              {!isHost && (
                <button
                  type="button"
                  className={`btn btn-lg ${isReady ? 'btn-outline' : 'btn-success'}`}
                  style={{ justifyContent: 'center' }}
                  onClick={toggleReady}
                >
                  {isReady ? '✅ Ready — click to unready' : 'Mark as Ready'}
                </button>
              )}

              {isHost && (
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  style={{ justifyContent: 'center' }}
                  onClick={handleStart}
                  disabled={!allReady}
                >
                  {allReady
                    ? 'Start Race →'
                    : `Waiting for players… (${players.filter((p) => p.ready).length}/${players.length} ready)`}
                </button>
              )}
            </div>

            {!isHost && !allReady && (
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
