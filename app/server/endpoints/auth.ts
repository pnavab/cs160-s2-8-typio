import type { IncomingMessage, ServerResponse } from 'node:http'
import { parseJsonBody } from '../utils/parseJsonBody'
import * as userActions from '../db/user'

type AuthBody = { username?: string; email?: string; password?: string }

function jsonRes(res: ServerResponse, status: number, data: object) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

export async function signup(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    jsonRes(res, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const body = (await parseJsonBody<AuthBody>(req)) as AuthBody
    const { username, email, password } = body
    if (!username?.trim() || !email?.trim() || !password) {
      jsonRes(res, 400, { error: 'Username, email, and password are required' })
      return
    }
    if (password.length < 6) {
      jsonRes(res, 400, { error: 'Password must be at least 6 characters' })
      return
    }
    const existingEmail = await userActions.findUserByEmail(email)
    if (existingEmail) {
      jsonRes(res, 409, { error: 'An account with this email already exists' })
      return
    }
    const existingUsername = await userActions.findUserByUsername(username)
    if (existingUsername) {
      jsonRes(res, 409, { error: 'Username is already taken' })
      return
    }
    const user = await userActions.createUser(username.trim(), email.trim().toLowerCase(), password)
    jsonRes(res, 201, { user: { username: user.username, email: user.email } })
  } catch (err) {
    jsonRes(res, 500, { error: (err as Error).message })
  }
}

export async function login(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    jsonRes(res, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const body = (await parseJsonBody<AuthBody>(req)) as AuthBody
    const { email, password } = body
    if (!email?.trim() || !password) {
      jsonRes(res, 400, { error: 'Email and password are required' })
      return
    }
    const user = await userActions.findUserByEmail(email)
    if (!user) {
      jsonRes(res, 401, { error: 'Invalid email or password' })
      return
    }
    const ok = await userActions.verifyPassword(password, user.password)
    if (!ok) {
      jsonRes(res, 401, { error: 'Invalid email or password' })
      return
    }
    jsonRes(res, 200, { user: { username: user.username, email: user.email } })
  } catch (err) {
    jsonRes(res, 500, { error: (err as Error).message })
  }
}
