import 'dotenv/config'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer } from 'node:http'
import { connectDb } from './db'
import { health } from './endpoints/health'
import { login, signup } from './endpoints/auth'
import { roomHandler } from './endpoints/room'
import { profileHandler } from './endpoints/profile'
import { setupSocketIO } from './socket'

const fromEnv = process.env.PORT
let port = fromEnv !== undefined ? Number(fromEnv) : 4000
if (Number.isNaN(port)) port = 4000

type RouteHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>

const routes: Record<string, RouteHandler> = {
  '/health': (_req, res) => health(res),
  '/auth/login': login,
  '/auth/signup': signup,
}

function cors(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const server = createServer((req, res) => {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const pathname = (new URL(req.url ?? '/', 'http://localhost').pathname).replace(/\/$/, '') || '/'

  if (pathname.startsWith('/room')) {
    void Promise.resolve(roomHandler(req, res, pathname))
    return
  }

  if (pathname.startsWith('/profile')) {
    void Promise.resolve(profileHandler(req, res, pathname))
    return
  }

  const handler = routes[pathname]
  if (handler) {
    void Promise.resolve(handler(req, res))
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found')
})

setupSocketIO(server)

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code !== 'EADDRINUSE') throw err
  if (fromEnv !== undefined) {
    console.error(`Port ${port} is already in use (PORT=${fromEnv}).`)
    process.exit(1)
  }
  const taken = port
  port++
  if (port >= 4020) {
    console.error('No free port in range 4000–4019')
    process.exit(1)
  }
  console.warn(`Port ${taken} in use, trying ${port}…`)
  server.listen(port, '0.0.0.0')
})

async function start() {
  try {
    await connectDb()
  } catch (err) {
    console.warn('MongoDB unavailable:', (err as Error).message)
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server http://localhost:${port}`)
  })
}

void start()
