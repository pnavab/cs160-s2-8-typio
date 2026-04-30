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
  difficulty?: string;
  maxPlayers?: number;
  players?: LobbyPlayer[];
};

export type RaceFinishResult = {
  wpm: number;
  accuracy: number;
  placement: number;
};

export type RaceResult = {
  username: string;
  wpm: number;
  accuracy: number;
  placement: number;
  finished: boolean;
};
