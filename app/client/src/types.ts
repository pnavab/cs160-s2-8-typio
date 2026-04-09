export type TypioUser = {
  username: string;
  email?: string;
};

export type LobbyPlayer = {
  id: string;
  username: string;
  ready: boolean;
};

export type TypioRoom = {
  code: string;
  host?: string;
  difficulty?: string;
  maxPlayers?: number;
  status?: string;
  players?: LobbyPlayer[];
};

export type RaceFinishResult = {
  wpm: number;
  accuracy: number;
  placement: number;
};
