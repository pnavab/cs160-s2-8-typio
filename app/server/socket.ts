import { Server as SocketServer } from 'socket.io'
import type { Server as HttpServer } from 'node:http'

let io: SocketServer | null = null

export function setupSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`)

    socket.on('disconnect', (reason) => {
      console.log(`Player disconnected: ${socket.id} (${reason})`)
    })
  })

  console.log('WebSocket server ready')
  return io
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized — call setupSocket first')
  return io
}
