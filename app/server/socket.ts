import { Server } from 'socket.io'
import type { Server as HttpServer } from 'node:http'

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
      }: {
        roomCode: string
        username: string
        wpm: number
        accuracy: number
      }) => {
        if (!roomCode || !username) return
        if (!roomResults.has(roomCode)) roomResults.set(roomCode, [])
        const results = roomResults.get(roomCode)!
        // Avoid duplicates if the client emits more than once
        if (results.find((r) => r.username === username)) return
        const placement = results.length + 1
        const result: PlayerResult = { username, wpm, accuracy, placement }
        results.push(result)
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
  })

  return io
}
