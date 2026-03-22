import { createServer } from 'node:http'

const fromEnv = process.env.PORT
let port = fromEnv !== undefined ? Number(fromEnv) : 4000
if (Number.isNaN(port)) port = 4000

const server = createServer((req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
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
