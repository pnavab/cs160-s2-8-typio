import { Room } from '../models/Room'

export async function createRoom(
  code: string,
  host: string,
  difficulty: string,
  maxPlayers: number,
) {
  return Room.create({
    code,
    host,
    difficulty,
    maxPlayers,
    players: [{ username: host, ready: false }],
  })
}

export async function findRoom(code: string) {
  return Room.findOne({ code })
}

export async function addPlayer(code: string, username: string) {
  return Room.findOneAndUpdate(
    { code, status: 'waiting' },
    { $push: { players: { username, ready: false } } },
    { new: true },
  )
}

export async function setPlayerReady(code: string, username: string, ready: boolean) {
  return Room.findOneAndUpdate(
    { code, 'players.username': username },
    { $set: { 'players.$.ready': ready } },
    { new: true },
  )
}

export async function removePlayer(code: string, username: string) {
  const room = await Room.findOne({ code })
  if (!room) return null

  room.players = room.players.filter((p: { username: string }) => p.username !== username)

  if (room.players.length === 0) {
    await Room.deleteOne({ code })
    return null
  }

  if (room.host === username) {
    room.host = (room.players[0] as { username: string }).username
  }

  return room.save()
}

export async function startRace(code: string) {
  return Room.findOneAndUpdate(
    { code },
    { $set: { status: 'racing', phraseIndex: Math.floor(Math.random() * 10) } },
    { new: true },
  )
}

// Resets a room back to the waiting state with all ready flags cleared.
// Only acts when the room is currently 'racing' so concurrent calls are safe.
export async function resetRoom(code: string) {
  return Room.findOneAndUpdate(
    { code, status: 'racing' },
    { $set: { status: 'waiting', 'players.$[].ready': false } },
    { new: true },
  )
}
