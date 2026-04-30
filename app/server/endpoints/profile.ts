import type { IncomingMessage, ServerResponse } from 'node:http'
import { getProfile } from '../db/raceResult'
import { updateUser, deleteUserAndData } from '../db/user'
import { parseJsonBody } from '../utils/parseJsonBody'

function jsonRes(res: ServerResponse, status: number, data: object) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

export async function profileHandler(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
) {
  const parts = pathname.split('/').filter(Boolean)
  const username = parts[1] ? decodeURIComponent(parts[1]) : null

  if (!username) {
    jsonRes(res, 404, { error: 'Not found' })
    return
  }

  // Fetches stats + history
  if (req.method === 'GET') {
    try {
      const profile = await getProfile(username)
      jsonRes(res, 200, { profile })
    } catch (err) {
      jsonRes(res, 500, { error: (err as Error).message })
    }
    return
  }

  // Updates username, email, and/or password
  if (req.method === 'PATCH') {
    try {
      const body = await parseJsonBody<{
        currentPassword?: string
        username?: string
        email?: string
        newPassword?: string
      }>(req)
      if (!body.currentPassword) {
        jsonRes(res, 400, { error: 'Current password is required' })
        return
      }
      const result = await updateUser(username, body.currentPassword, {
        username: body.username,
        email: body.email,
        newPassword: body.newPassword,
      })
      if ('error' in result) {
        jsonRes(res, 400, { error: result.error })
        return
      }
      jsonRes(res, 200, { user: result })
    } catch (err) {
      jsonRes(res, 500, { error: (err as Error).message })
    }
    return
  }

  // Deletes account and all race data
  if (req.method === 'DELETE') {
    try {
      const body = await parseJsonBody<{ currentPassword?: string }>(req)
      if (!body.currentPassword) {
        jsonRes(res, 400, { error: 'Password confirmation is required' })
        return
      }
      const result = await deleteUserAndData(username, body.currentPassword)
      if ('error' in result) {
        jsonRes(res, 400, { error: result.error })
        return
      }
      jsonRes(res, 200, { ok: true })
    } catch (err) {
      jsonRes(res, 500, { error: (err as Error).message })
    }
    return
  }

  jsonRes(res, 405, { error: 'Method not allowed' })
}
