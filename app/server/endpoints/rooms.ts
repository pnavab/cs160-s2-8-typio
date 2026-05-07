import type { IncomingMessage, ServerResponse } from 'node:http'
import { parseJsonBody } from '../utils/parseJsonBody'
import * as roomActions from '../db/room'

type CreateBody = { difficulty?: string; maxPlayers?: number }
type ValidateQuery = { code?: string }

function jsonRes(res: ServerResponse, status: number, data: object) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

/** POST /rooms/create — creates a room and returns the unique code */
export async function createRoom(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    jsonRes(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const body = (await parseJsonBody<CreateBody>(req)) as CreateBody
    const difficulty = body.difficulty ?? 'beginner'
    const maxPlayers = body.maxPlayers ?? 6

    if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
      jsonRes(res, 400, { error: 'Invalid difficulty. Use: beginner, intermediate, advanced' })
      return
    }
    if (maxPlayers < 2 || maxPlayers > 10) {
      jsonRes(res, 400, { error: 'maxPlayers must be between 2 and 10' })
      return
    }

    const room = await roomActions.createRoom(difficulty, maxPlayers)
    jsonRes(res, 201, { roomCode: room.roomCode, roomId: room._id })
  } catch (err) {
    jsonRes(res, 500, { error: (err as Error).message })
  }
}

/** GET /rooms/validate?code=AB67CD — checks if a room is joinable */
export async function validateRoom(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    jsonRes(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const code = url.searchParams.get('code')

    if (!code) {
      jsonRes(res, 400, { valid: false, reason: 'No code provided' })
      return
    }

    const room = await roomActions.findRoomByCode(code)

    if (!room) {
      jsonRes(res, 404, { valid: false, reason: 'Room not found' })
      return
    }
    if (room.state !== 'LOBBY') {
      jsonRes(res, 400, { valid: false, reason: 'Race already started' })
      return
    }
    if (room.players.length >= room.maxPlayers) {
      jsonRes(res, 400, { valid: false, reason: 'Room is full' })
      return
    }

    jsonRes(res, 200, {
      valid: true,
      playerCount: room.players.length,
      difficulty: room.difficulty,
    })
  } catch (err) {
    jsonRes(res, 500, { valid: false, reason: (err as Error).message })
  }
}
