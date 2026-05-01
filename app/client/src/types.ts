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
  phraseIndex?: number;
  players?: LobbyPlayer[];
};

export type RaceFinishResult = {
  wpm: number;
  accuracy: number;
  placement: number;
};

export type PlayerResult = {
  username: string;
  wpm: number;
  accuracy: number;
  placement: number;
};

export type HistoryEntry = {
  date: string;
  wpm: number;
  acc: number;
  placement: number;
  difficulty: string;
};

export type UserProfile = {
  racesPlayed: number;
  bestWpm: number;
  avgWpm: number;
  avgAccuracy: number;
  joinedDate: string | null;
  history: HistoryEntry[];
};
