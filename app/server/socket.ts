import { Server } from 'socket.io'
import type { Server as HttpServer } from 'node:http'
import { saveResult } from './db/raceResult'

type PlayerResult = {
  username: string
  wpm: number
  accuracy: number
  placement: number
}

// In-memory race results per room, cleared when a new race starts
const roomResults = new Map<string, PlayerResult[]>()

export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.on('connection', (socket) => {
    socket.on('join-room', ({ roomCode, username }: { roomCode: string; username: string }) => {
      if (!roomCode || !username) return
      void socket.join(roomCode)
      // Send any already-finished results to the newly connected socket
      const results = roomResults.get(roomCode)
      if (results && results.length > 0) {
        socket.emit('race-results', { results })
      }
    })

    // Host emits this when starting a race to reset results from any prior race
    socket.on('race-started', ({ roomCode }: { roomCode: string }) => {
      if (!roomCode) return
      roomResults.set(roomCode, [])
    })

    socket.on(
      'chat-message',
      ({ roomCode, from, text }: { roomCode: string; from: string; text: string }) => {
        if (!roomCode || !from || !text?.trim()) return
        const msg = { id: Date.now() + Math.random(), from, text: text.trim() }
        io.to(roomCode).emit('chat-message', msg)
      },
    )

    socket.on(
      'progress-update',
      ({
        roomCode,
        username,
        pct,
        wpm,
      }: {
        roomCode: string
        username: string
        pct: number
        wpm: number
      }) => {
        if (!roomCode || !username) return
        // Broadcast to everyone else in the room (not the sender)
        socket.to(roomCode).emit('player-progress', { username, pct, wpm })
      },
    )

    socket.on(
      'player-finished',
      ({
        roomCode,
        username,
        wpm,
        accuracy,
        difficulty = 'Beginner',
      }: {
        roomCode: string
        username: string
        wpm: number
        accuracy: number
        difficulty?: string
      }) => {
        if (!roomCode || !username) return
        if (!roomResults.has(roomCode)) roomResults.set(roomCode, [])
        const results = roomResults.get(roomCode)!
        // Avoid duplicates if the client emits more than once
        if (results.find((r) => r.username === username)) return
        const placement = results.length + 1
        const result: PlayerResult = { username, wpm, accuracy, placement }
        results.push(result)
        // Persist to MongoDB only for registered players, not guests
        if (!username.startsWith('Guest ')) {
          void saveResult({ username, wpm, accuracy, placement, roomCode, difficulty })
        }
        // Broadcast to everyone in the room (including the finisher)
        io.to(roomCode).emit('player-finished', result)
      },
    )

    // Client requests current results snapshot (e.g. on ResultsScreen mount)
    socket.on('request-results', ({ roomCode }: { roomCode: string }) => {
      if (!roomCode) return
      const results = roomResults.get(roomCode) ?? []
      socket.emit('race-results', { results })
    })

    // One player clicked "Play Again", broadcast to everyone in the room so
    // all ResultsScreens navigate back to the lobby simultaneously.
    socket.on('trigger-play-again', ({ roomCode }: { roomCode: string }) => {
      if (!roomCode) return
      io.to(roomCode).emit('go-to-lobby')
    })
  })

  return io
}
