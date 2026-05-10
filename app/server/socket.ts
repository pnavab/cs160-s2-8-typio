import { Server } from 'socket.io'
import type { Server as HttpServer } from 'node:http'
import { saveResult } from './db/raceResult'

type PlayerResult = {
  username: string
  wpm: number
  accuracy: number
  placement: number
}

type FinisherData = {
  username: string
  wpm: number
  accuracy: number
  difficulty: string
}

type RoomState = {
  finishers: FinisherData[]
  // Broadcast-ready results
  results: PlayerResult[]
  totalPlayers: number
  saved: boolean
  saveTimer: ReturnType<typeof setTimeout> | null
}

const roomStates = new Map<string, RoomState>()

function persistRoomResults(roomCode: string) {
  const state = roomStates.get(roomCode)
  if (!state || state.saved || state.finishers.length === 0) return
  state.saved = true
  if (state.saveTimer) {
    clearTimeout(state.saveTimer)
    state.saveTimer = null
  }
  const sorted = [...state.finishers].sort((a, b) => b.wpm - a.wpm)
  sorted.forEach((f, i) => {
    if (!f.username.startsWith('Guest ')) {
      void saveResult({ username: f.username, wpm: f.wpm, accuracy: f.accuracy, placement: i + 1, roomCode, difficulty: f.difficulty })
    }
  })
}

export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.on('connection', (socket) => {
    socket.on('join-room', ({ roomCode, username }: { roomCode: string; username: string }) => {
      if (!roomCode || !username) return
      void socket.join(roomCode)
      // Send any already-finished results to the newly connected socket
      const state = roomStates.get(roomCode)
      if (state && state.results.length > 0) {
        socket.emit('race-results', { results: state.results })
      }
    })

    // Host emits this when starting a race to reset results from any prior race
    socket.on('race-started', ({ roomCode, totalPlayers }: { roomCode: string; totalPlayers?: number }) => {
      if (!roomCode) return
      const existing = roomStates.get(roomCode)
      if (existing?.saveTimer) clearTimeout(existing.saveTimer)
      roomStates.set(roomCode, {
        finishers: [],
        results: [],
        totalPlayers: totalPlayers ?? 0,
        saved: false,
        saveTimer: null,
      })
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
        if (!roomStates.has(roomCode)) {
          roomStates.set(roomCode, { finishers: [], results: [], totalPlayers: 0, saved: false, saveTimer: null })
        }
        const state = roomStates.get(roomCode)!
        // Avoid duplicates if the client emits more than once
        if (state.finishers.find((f) => f.username === username)) return

        state.finishers.push({ username, wpm, accuracy, difficulty })

        // Rank among finishers so far by WPM (highest = 1st)
        const sortedByWpm = [...state.finishers].sort((a, b) => b.wpm - a.wpm)
        const placement = sortedByWpm.findIndex((f) => f.username === username) + 1
        const result: PlayerResult = { username, wpm, accuracy, placement }
        state.results.push(result)

        // Broadcast to everyone in the room (including the finisher)
        io.to(roomCode).emit('player-finished', result)

        const allFinished = state.totalPlayers > 0 && state.finishers.length >= state.totalPlayers
        if (allFinished) {
          persistRoomResults(roomCode)
        } else if (!state.saveTimer) {
          // Save after 60s in case remaining players disconnect
          state.saveTimer = setTimeout(() => persistRoomResults(roomCode), 60_000)
        }
      },
    )

    // Client requests current results snapshot
    socket.on('request-results', ({ roomCode }: { roomCode: string }) => {
      if (!roomCode) return
      const results = roomStates.get(roomCode)?.results ?? []
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