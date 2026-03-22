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
