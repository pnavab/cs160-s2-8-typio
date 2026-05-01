import { useState } from 'react';
import LandingPage from '@/components/LandingPage';
import AuthPage from '@/components/AuthPage';
import Dashboard from '@/components/Dashboard';
import CreateRoom from '@/components/CreateRoom';
import Lobby from '@/components/Lobby';
import RaceScreen from '@/components/RaceScreen';
import ResultsScreen from '@/components/ResultsScreen';
import ProfilePage from '@/components/ProfilePage';
import { guestJoin, resetRoom, leaveRoom } from '@/api';
import { getSocket } from '@/socket';
import type { TypioRoom, TypioUser, RaceFinishResult, LobbyPlayer } from '@/types';

type Page =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'createRoom'
  | 'lobby'
  | 'race'
  | 'results'
  | 'profile';

/**
 * Central page router for Typio.
 *
 * Pages:  landing → auth → dashboard → createRoom | joinRoom
 *         → lobby → race → results → lobby (play again) | dashboard
 */
export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [user, setUser] = useState<TypioUser | null>(null);
  const [room, setRoom] = useState<TypioRoom | null>(null);
  const [myResult, setMyResult] = useState<RaceFinishResult | null>(null);

  const handleAuthSuccess = (u: TypioUser) => {
    setUser(u);
    setPage('dashboard');
  };
  const handleLogout = () => {
    setUser(null);
    setRoom(null);
    setPage('landing');
  };

  const isGuest = user?.username.startsWith('Guest ') ?? false;
  const homePage = isGuest ? 'landing' : (user ? 'dashboard' : 'landing');

  const handleRoomCreated = (r: TypioRoom) => {
    setRoom(r);
    setPage('lobby');
  };
  const handleJoinRoom = (code: string) => {
    setRoom({ code });
    setPage('lobby');
  };

  const handleGuestJoin = async (code: string): Promise<{ error?: string }> => {
    const res = await guestJoin(code);
    if ('error' in res) return { error: res.error };
    setUser({ username: res.username });
    setRoom({ code });
    setPage('lobby');
    return {};
  };

  const handleRaceStart = ({
    room: r,
    players,
  }: {
    room: TypioRoom | null;
    players: LobbyPlayer[];
  }) => {
    setRoom((prev) => ({
      code: r?.code ?? prev?.code ?? '',
      difficulty: r?.difficulty ?? prev?.difficulty,
      maxPlayers: r?.maxPlayers ?? prev?.maxPlayers,
      phraseIndex: r?.phraseIndex ?? prev?.phraseIndex,
      players,
    }));
    setPage('race');
  };
  const handleRaceFinish = (result: RaceFinishResult) => {
    setMyResult(result);
    setPage('results');
  };
  const handleResultsLeave = async () => {
    if (room?.code && user?.username) {
      await leaveRoom(room.code, user.username);
    }
    setMyResult(null);
    setRoom(null);
    setPage(homePage);
  };
  const handlePlayAgain = async () => {
    if (room?.code) {
      // Reset room to 'waiting' with all ready flags cleared (idempotent — only
      // acts when room is still 'racing', so concurrent calls from multiple
      // players are safe).
      await resetRoom(room.code);
      // Notify everyone still on the results screen to return to the lobby.
      getSocket().emit('trigger-play-again', { roomCode: room.code });
    }
    setMyResult(null);
    setPage('lobby');
  };

  switch (page) {
    case 'landing':
      return (
        <LandingPage
          onCreateRoom={() => setPage(user ? 'createRoom' : 'auth')}
          onJoinRoom={(code) => {
            if (user) handleJoinRoom(code);
            else setPage('auth');
          }}
          onLogin={() => setPage('auth')}
          onGuestJoin={handleGuestJoin}
        />
      );

    case 'auth':
      return (
        <AuthPage onSuccess={handleAuthSuccess} onBack={() => setPage('landing')} />
      );

    case 'dashboard':
      return (
        <Dashboard
          user={user}
          onCreateRoom={() => setPage('createRoom')}
          onJoinRoom={handleJoinRoom}
          onProfile={() => setPage('profile')}
          onLogout={handleLogout}
        />
      );

    case 'createRoom':
      return (
        <CreateRoom
          user={user}
          onRoomCreated={handleRoomCreated}
          onBack={() => setPage(user ? 'dashboard' : 'landing')}
        />
      );

    case 'lobby':
      return (
        <Lobby
          room={room}
          user={user}
          onRaceStart={handleRaceStart}
          onLeave={() => setPage(homePage)}
        />
      );

    case 'race':
      return (
        <RaceScreen
          room={room}
          user={user}
          players={room?.players}
          onFinish={handleRaceFinish}
        />
      );

    case 'results':
      return (
        <ResultsScreen
          room={room}
          user={user}
          myResult={myResult}
          onPlayAgain={() => void handlePlayAgain()}
          onLeave={() => void handleResultsLeave()}
        />
      );

    case 'profile':
      return (
        <ProfilePage
          user={user}
          onBack={() => setPage('dashboard')}
          onLogout={handleLogout}
          onUpdate={(updated) => setUser(updated)}
        />
      );

    default:
      return (
        <div>
          404 — unknown page &quot;{String(page)}&quot;
        </div>
      );
  }
}
