import { Server } from 'socket.io'
import type { Server as HttpServer } from 'node:http'

const PASSAGES: Record<string, string> = {
  Beginner: 'the cat sat on the mat and looked at the dog by the door',
  Intermediate: 'a quick brown fox jumps over the lazy dog near the old oak tree by the river',
  Advanced:
    'the complexity of modern software systems demands rigorous testing methodologies and careful attention to edge cases throughout the development lifecycle',
}

type ServerPlayer = {
  socketId: string
  username: string
  ready: boolean
  pct: number
  wpm: number
  accuracy: number
  finished: boolean
  finishTime: number | null
  placement: number
}

type ServerRoom = {
  code: string
  difficulty: string
  maxPlayers: number
  hostSocketId: string
  status: 'lobby' | 'countdown' | 'racing' | 'finished'
  players: Map<string, ServerPlayer>
  passage: string
  startTime: number | null
  finishedCount: number
  countdownTimer: ReturnType<typeof setInterval> | null
  resultsTimer: ReturnType<typeof setTimeout> | null
}

const rooms = new Map<string, ServerRoom>()

function roomStatePayload(room: ServerRoom) {
  return {
    code: room.code,
    difficulty: room.difficulty,
    maxPlayers: room.maxPlayers,
    hostSocketId: room.hostSocketId,
    status: room.status,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.socketId,
      username: p.username,
      ready: p.ready,
    })),
  }
}

function broadcastRoomState(io: Server, room: ServerRoom) {
  io.to(room.code).emit('room_state', roomStatePayload(room))
}

function broadcastRaceProgress(io: Server, room: ServerRoom) {
  io.to(room.code).emit('race_progress', {
    players: Array.from(room.players.values()).map((p) => ({
      username: p.username,
      pct: p.pct,
      wpm: p.wpm,
      accuracy: p.accuracy,
      finished: p.finished,
    })),
  })
}

function emitRaceResults(io: Server, room: ServerRoom) {
  if (room.countdownTimer) { clearInterval(room.countdownTimer); room.countdownTimer = null }
  if (room.resultsTimer) { clearTimeout(room.resultsTimer); room.resultsTimer = null }
  room.status = 'finished'

  const results = Array.from(room.players.values())
    .sort((a, b) => {
      if (a.finished && b.finished) return (a.finishTime ?? 0) - (b.finishTime ?? 0)
      if (a.finished) return -1
      if (b.finished) return 1
      return b.wpm - a.wpm
    })
    .map((p, i) => ({
      username: p.username,
      wpm: p.wpm,
      accuracy: p.accuracy,
      placement: i + 1,
      finished: p.finished,
    }))

  io.to(room.code).emit('race_results', { results })
}

export function attachSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.on('connection', (socket) => {
    let currentRoomCode: string | null = null

    socket.on(
      'join_room',
      ({
        roomCode,
        username,
        isHost,
        difficulty,
        maxPlayers,
      }: {
        roomCode: string
        username: string
        isHost: boolean
        difficulty?: string
        maxPlayers?: number
      }) => {
        const code = roomCode.toUpperCase()

        if (isHost) {
          const diff = difficulty ?? 'Beginner'
          rooms.set(code, {
            code,
            difficulty: diff,
            maxPlayers: maxPlayers ?? 4,
            hostSocketId: socket.id,
            status: 'lobby',
            players: new Map(),
            passage: PASSAGES[diff] ?? PASSAGES['Beginner']!,
            startTime: null,
            finishedCount: 0,
            countdownTimer: null,
            resultsTimer: null,
          })
        }

        const room = rooms.get(code)
        if (!room) { socket.emit('error', { message: 'Room not found' }); return }
        if (room.status !== 'lobby') { socket.emit('error', { message: 'Race already in progress' }); return }
        if (room.players.size >= room.maxPlayers) { socket.emit('error', { message: 'Room is full' }); return }

        room.players.set(socket.id, {
          socketId: socket.id,
          username,
          ready: isHost,
          pct: 0,
          wpm: 0,
          accuracy: 100,
          finished: false,
          finishTime: null,
          placement: 0,
        })
        currentRoomCode = code
        void socket.join(code)
        broadcastRoomState(io, room)
      },
    )

    socket.on('player_ready', ({ roomCode, ready }: { roomCode: string; ready: boolean }) => {
      const room = rooms.get(roomCode)
      if (!room) return
      const player = room.players.get(socket.id)
      if (!player) return
      player.ready = ready
      broadcastRoomState(io, room)
    })

    socket.on('start_race', ({ roomCode }: { roomCode: string }) => {
      const room = rooms.get(roomCode)
      if (!room || room.hostSocketId !== socket.id || room.status !== 'lobby') return

      room.status = 'countdown'
      io.to(roomCode).emit('race_starting')

      // 500ms delay so clients can navigate to RaceScreen before first tick
      let count = 3
      const tick = () => {
        io.to(roomCode).emit('countdown_tick', { value: count })
        count--
        if (count < 0) {
          clearInterval(room.countdownTimer!)
          room.countdownTimer = null
          const startTime = Date.now()
          room.startTime = startTime
          room.status = 'racing'
          io.to(roomCode).emit('race_start', { passage: room.passage, startTime })
        }
      }

      setTimeout(() => {
        tick()
        room.countdownTimer = setInterval(tick, 1000)
      }, 500)
    })

    socket.on(
      'progress_update',
      ({
        roomCode,
        pct,
        wpm,
        accuracy,
      }: {
        roomCode: string
        pct: number
        wpm: number
        accuracy: number
      }) => {
        const room = rooms.get(roomCode)
        if (!room) return
        const player = room.players.get(socket.id)
        if (!player || player.finished) return
        player.pct = pct
        player.wpm = wpm
        player.accuracy = accuracy
        broadcastRaceProgress(io, room)
      },
    )

    socket.on(
      'player_finish',
      ({ roomCode, wpm, accuracy }: { roomCode: string; wpm: number; accuracy: number }) => {
        const room = rooms.get(roomCode)
        if (!room) return
        const player = room.players.get(socket.id)
        if (!player || player.finished) return

        room.finishedCount++
        player.finished = true
        player.finishTime = Date.now()
        player.wpm = wpm
        player.accuracy = accuracy
        player.pct = 100
        player.placement = room.finishedCount

        io.to(roomCode).emit('player_finished', {
          username: player.username,
          placement: room.finishedCount,
        })
        broadcastRaceProgress(io, room)

        if (room.finishedCount >= room.players.size) {
          emitRaceResults(io, room)
        } else if (room.finishedCount === 1) {
          // Give remaining players 30 seconds after first finisher
          room.resultsTimer = setTimeout(() => emitRaceResults(io, room), 30_000)
        }
      },
    )

    socket.on('chat_message', ({ roomCode, text }: { roomCode: string; text: string }) => {
      const room = rooms.get(roomCode)
      if (!room) return
      const player = room.players.get(socket.id)
      if (!player) return
      io.to(roomCode).emit('chat_message', { from: player.username, text })
    })

    socket.on('disconnect', () => {
      if (!currentRoomCode) return
      const room = rooms.get(currentRoomCode)
      if (!room) return
      room.players.delete(socket.id)

      if (room.players.size === 0) {
        if (room.countdownTimer) clearInterval(room.countdownTimer)
        if (room.resultsTimer) clearTimeout(room.resultsTimer)
        rooms.delete(currentRoomCode)
        return
      }

      if (room.hostSocketId === socket.id) {
        const next = room.players.values().next().value
        if (next) {
          room.hostSocketId = next.socketId
          next.ready = true
        }
      }

      if (room.status === 'lobby') broadcastRoomState(io, room)
    })
  })
}
