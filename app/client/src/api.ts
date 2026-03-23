import type {TypioRoom} from '@/types';

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

export type CreateRoomPayload = {
  hostId: string
  username: string
  maxPlayers?: number
  passage?: string
}

export type RoomResponse =
  | {room: TypioRoom}
  | { error: string }

export async function createRoom(payload: {
  hostId: string | undefined;
  username: string;
  maxPlayers: number
}): Promise<RoomResponse> {
  const res = await fetch(`${API_BASE}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) return { error: data.error ?? 'Failed to create room' }
  return data.room ? { room: data.room } : { error: 'Invalid response' }
}