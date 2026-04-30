import { useState, useEffect } from 'react';
import LandingPage from '@/components/LandingPage';
import AuthPage from '@/components/AuthPage';
import Dashboard from '@/components/Dashboard';
import CreateRoom from '@/components/CreateRoom';
import Lobby from '@/components/Lobby';
import RaceScreen from '@/components/RaceScreen';
import ResultsScreen from '@/components/ResultsScreen';
import ProfilePage from '@/components/ProfilePage';
import { socket } from '@/socket';
import type { TypioRoom, TypioUser, RaceFinishResult, LobbyPlayer, RaceResult } from '@/types';

type Page =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'createRoom'
  | 'lobby'
  | 'race'
  | 'results'
  | 'profile';

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [user, setUser] = useState<TypioUser | null>(null);
  const [room, setRoom] = useState<TypioRoom | null>(null);
  const [myResult, setMyResult] = useState<RaceFinishResult | null>(null);
  const [allResults, setAllResults] = useState<RaceResult[]>([]);
  const [lobbyMode, setLobbyMode] = useState<'create' | 'join' | 'rejoin'>('create');

  useEffect(() => {
    socket.connect();
    return () => { socket.disconnect(); };
  }, []);

  const handleAuthSuccess = (u: TypioUser) => {
    setUser(u);
    setPage('dashboard');
  };
  const handleLogout = () => {
    setUser(null);
    setRoom(null);
    setPage('landing');
  };

  const handleRoomCreated = (r: TypioRoom) => {
    setRoom(r);
    setLobbyMode('create');
    setPage('lobby');
  };
  const handleJoinRoom = (code: string) => {
    setRoom({ code });
    setLobbyMode('join');
    setPage('lobby');
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
      players,
    }));
    setPage('race');
  };

  const handleRaceFinish = ({
    myResult: my,
    allResults: all,
  }: {
    myResult: RaceFinishResult;
    allResults: RaceResult[];
  }) => {
    setMyResult(my);
    setAllResults(all);
    setPage('results');
  };

  const handlePlayAgain = () => {
    socket.emit('play_again', { roomCode: room?.code });
    setMyResult(null);
    setAllResults([]);
    setLobbyMode('rejoin');
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
          mode={lobbyMode}
          onRaceStart={handleRaceStart}
          onLeave={() => setPage(user ? 'dashboard' : 'landing')}
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
          allResults={allResults}
          onPlayAgain={handlePlayAgain}
          onLeave={() => setPage(user ? 'dashboard' : 'landing')}
        />
      );

    case 'profile':
      return (
        <ProfilePage
          user={user}
          onBack={() => setPage('dashboard')}
          onLogout={handleLogout}
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
