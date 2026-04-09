import type { IncomingMessage, ServerResponse } from 'node:http'
import { parseJsonBody } from '../utils/parseJsonBody'
import * as roomActions from '../db/room'

function jsonRes(res: ServerResponse, status: number, data: object) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function formatRoom(room: {
  code: string
  host: string
  difficulty: string
  maxPlayers: number
  status: string
  players: { _id: { toString(): string }; username: string; ready: boolean }[]
}) {
  return {
    code: room.code,
    host: room.host,
    difficulty: room.difficulty,
    maxPlayers: room.maxPlayers,
    status: room.status,
    players: room.players.map((p) => ({
      id: p._id.toString(),
      username: p.username,
      ready: p.ready,
    })),
  }
}

export async function roomHandler(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
) {
  const parts = pathname.split('/').filter(Boolean)

  if (parts.length === 2 && parts[1] === 'create' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{
        username?: string
        difficulty?: string
        maxPlayers?: number
        code?: string
      }>(req)
      const { username, difficulty = 'Beginner', maxPlayers = 4, code } = body
      if (!username?.trim() || !code?.trim()) {
        jsonRes(res, 400, { error: 'username and code are required' })
        return
      }
      const existing = await roomActions.findRoom(code)
      if (existing) {
        jsonRes(res, 409, { error: 'Room code already exists' })
        return
      }
      const room = await roomActions.createRoom(code, username.trim(), difficulty, maxPlayers)
      jsonRes(res, 201, { room: formatRoom(room as Parameters<typeof formatRoom>[0]) })
    } catch (err) {
      jsonRes(res, 500, { error: (err as Error).message })
    }
    return
  }

  if (parts.length === 2 && parts[1] === 'join' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ username?: string; code?: string }>(req)
      const { username, code } = body
      if (!username?.trim() || !code?.trim()) {
        jsonRes(res, 400, { error: 'username and code are required' })
        return
      }
      const existing = await roomActions.findRoom(code)
      if (!existing) {
        jsonRes(res, 404, { error: 'Room not found' })
        return
      }
      if (existing.status === 'racing') {
        jsonRes(res, 400, { error: 'Race has already started' })
        return
      }
      if (existing.players.length >= existing.maxPlayers) {
        jsonRes(res, 400, { error: 'Room is full' })
        return
      }
      const alreadyIn = existing.players.some(
        (p: { username: string }) => p.username === username,
      )
      if (alreadyIn) {
        jsonRes(res, 200, { room: formatRoom(existing as Parameters<typeof formatRoom>[0]) })
        return
      }
      const room = await roomActions.addPlayer(code, username.trim())
      if (!room) {
        jsonRes(res, 400, { error: 'Could not join room' })
        return
      }
      jsonRes(res, 200, { room: formatRoom(room as Parameters<typeof formatRoom>[0]) })
    } catch (err) {
      jsonRes(res, 500, { error: (err as Error).message })
    }
    return
  }

  if (parts.length === 2 && req.method === 'GET') {
    const code = parts[1]
    try {
      const room = await roomActions.findRoom(code)
      if (!room) {
        jsonRes(res, 404, { error: 'Room not found' })
        return
      }
      jsonRes(res, 200, { room: formatRoom(room as Parameters<typeof formatRoom>[0]) })
    } catch (err) {
      jsonRes(res, 500, { error: (err as Error).message })
    }
    return
  }

  if (parts.length === 3 && parts[2] === 'ready' && req.method === 'POST') {
    const code = parts[1]
    try {
      const body = await parseJsonBody<{ username?: string; ready?: boolean }>(req)
      const { username, ready } = body
      if (!username?.trim() || ready === undefined) {
        jsonRes(res, 400, { error: 'username and ready are required' })
        return
      }
      const room = await roomActions.setPlayerReady(code, username.trim(), ready)
      if (!room) {
        jsonRes(res, 404, { error: 'Room or player not found' })
        return
      }
      jsonRes(res, 200, { room: formatRoom(room as Parameters<typeof formatRoom>[0]) })
    } catch (err) {
      jsonRes(res, 500, { error: (err as Error).message })
    }
    return
  }

  if (parts.length === 3 && parts[2] === 'leave' && req.method === 'POST') {
    const code = parts[1]
    try {
      const body = await parseJsonBody<{ username?: string }>(req)
      const { username } = body
      if (!username?.trim()) {
        jsonRes(res, 400, { error: 'username is required' })
        return
      }
      await roomActions.removePlayer(code, username.trim())
      jsonRes(res, 200, { ok: true })
    } catch (err) {
      jsonRes(res, 500, { error: (err as Error).message })
    }
    return
  }

  if (parts.length === 3 && parts[2] === 'start' && req.method === 'POST') {
    const code = parts[1]
    try {
      const body = await parseJsonBody<{ username?: string }>(req)
      const { username } = body
      if (!username?.trim()) {
        jsonRes(res, 400, { error: 'username is required' })
        return
      }
      const room = await roomActions.findRoom(code)
      if (!room) {
        jsonRes(res, 404, { error: 'Room not found' })
        return
      }
      if (room.host !== username) {
        jsonRes(res, 403, { error: 'Only the host can start the race' })
        return
      }
      const updated = await roomActions.startRace(code)
      if (!updated) {
        jsonRes(res, 404, { error: 'Room not found' })
        return
      }
      jsonRes(res, 200, { room: formatRoom(updated as Parameters<typeof formatRoom>[0]) })
    } catch (err) {
      jsonRes(res, 500, { error: (err as Error).message })
    }
    return
  }

  jsonRes(res, 404, { error: 'Not found' })
}
