import { Room } from '../models/Room'
import { generateUniqueRoomCode } from '../utils/roomCode'

export async function createRoom(difficulty: string, maxPlayers: number) {
  const roomCode = await generateUniqueRoomCode(async (code) => {
    const existing = await Room.findOne({ roomCode: code })
    return !!existing
  })

  return Room.create({ roomCode, difficulty, maxPlayers })
}

export async function findRoomByCode(code: string) {
  return Room.findOne({ roomCode: code.toUpperCase() })
}

export async function deleteRoom(roomCode: string) {
  return Room.deleteOne({ roomCode })
}
