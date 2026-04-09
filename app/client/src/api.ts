const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export type AuthUser = { username: string; email: string }

export type AuthResponse =
  | { user: AuthUser }
  | { error: string }

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = (await res.json()) as AuthResponse & { user?: AuthUser; error?: string }
  if (!res.ok) return { error: data.error ?? 'Login failed' }
  return data.user ? { user: data.user } : { error: 'Invalid response' }
}

export async function signup(
  username: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  })
  const data = (await res.json()) as AuthResponse & { user?: AuthUser; error?: string }
  if (!res.ok) return { error: data.error ?? 'Signup failed' }
  return data.user ? { user: data.user } : { error: 'Invalid response' }
}

export type RoomPlayer = { id: string; username: string; ready: boolean }
export type RoomData = {
  code: string
  host: string
  difficulty: string
  maxPlayers: number
  status: string
  players: RoomPlayer[]
}
export type RoomResponse = { room: RoomData } | { error: string }

export async function createRoom(
  username: string,
  code: string,
  difficulty: string,
  maxPlayers: number,
): Promise<RoomResponse> {
  const res = await fetch(`${API_BASE}/room/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, code, difficulty, maxPlayers }),
  })
  return res.json() as Promise<RoomResponse>
}

export async function joinRoom(username: string, code: string): Promise<RoomResponse> {
  const res = await fetch(`${API_BASE}/room/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, code }),
  })
  return res.json() as Promise<RoomResponse>
}

export async function getRoom(code: string): Promise<RoomResponse> {
  const res = await fetch(`${API_BASE}/room/${code}`)
  return res.json() as Promise<RoomResponse>
}

export async function setReady(
  code: string,
  username: string,
  ready: boolean,
): Promise<RoomResponse> {
  const res = await fetch(`${API_BASE}/room/${code}/ready`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, ready }),
  })
  return res.json() as Promise<RoomResponse>
}

export async function leaveRoom(code: string, username: string): Promise<void> {
  await fetch(`${API_BASE}/room/${code}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
}

export async function startRace(code: string, username: string): Promise<RoomResponse> {
  const res = await fetch(`${API_BASE}/room/${code}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
  return res.json() as Promise<RoomResponse>
}
