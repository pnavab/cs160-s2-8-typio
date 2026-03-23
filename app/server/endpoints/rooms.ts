import type { IncomingMessage, ServerResponse } from 'node:http'
import { parseJsonBody } from '../utils/parseJsonBody'
import * as roomActions from '../db/room'

type RoomBody = { hostId?: string; username?: string; maxPlayers?: number }

function jsonRes(res: ServerResponse, status: number, data: object) {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
}

export async function createRoom(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== 'POST') {
        jsonRes(res, 405, { error: 'Method not allowed' })
        return
    }
    try {
        const body = (await parseJsonBody<RoomBody>(req)) as RoomBody
        const { hostId, username, maxPlayers = 4 } = body
        if (!hostId?.trim() || !username?.trim()) {
            jsonRes(res, 400, { error: 'hostId and username are required' })
            return
        }
        const room = await roomActions.createRoom(hostId.trim(), username.trim(), maxPlayers)
        jsonRes(res, 201, { room })
    } catch (err) {
        jsonRes(res, 500, { error: (err as Error).message })
    }
}

export async function getRoom(req: IncomingMessage, res: ServerResponse, code: string) {
    if (req.method !== 'GET') {
        jsonRes(res, 405, { error: 'Method not allowed' })
        return
    }
    try {
        const room = await roomActions.findRoomByCode(code)
        if (!room) {
            jsonRes(res, 404, { error: 'Room not found' })
            return
        }
        jsonRes(res, 200, { room })
    } catch (err) {
        jsonRes(res, 500, { error: (err as Error).message })
    }
}

export async function listRooms(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== 'GET') {
        jsonRes(res, 405, { error: 'Method not allowed' })
        return
    }
    try {
        const rooms = await roomActions.findWaitingRooms()
        jsonRes(res, 200, { rooms })
    } catch (err) {
        jsonRes(res, 500, { error: (err as Error).message })
    }
}