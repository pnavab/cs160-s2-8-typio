import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer } from 'node:http'
import { health } from './endpoints/health'

const fromEnv = process.env.PORT
let port = fromEnv !== undefined ? Number(fromEnv) : 4000
if (Number.isNaN(port)) port = 4000

type RouteHandler = (req: IncomingMessage, res: ServerResponse) => void

const routes: Record<string, RouteHandler> = {
  '/health': (_req, res) => health(res),
}

const server = createServer((req, res) => {
  const pathname = (new URL(req.url ?? '/', 'http://localhost').pathname).replace(/\/$/, '') || '/'
  const handler = routes[pathname]
  if (handler) {
    handler(req, res)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found')
})

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
  server.listen(port)
})

server.listen(port, () => {
  console.log(`Server http://localhost:${port}`)
})
