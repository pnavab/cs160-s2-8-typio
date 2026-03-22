import type { ServerResponse } from 'node:http'
import { mongoose } from '../db'

export function health(res: ServerResponse) {
  const dbOk = mongoose.connection.readyState === 1
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: true, db: dbOk ? 'connected' : 'disconnected' }))
}
