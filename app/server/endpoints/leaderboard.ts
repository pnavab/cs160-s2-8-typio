import type { IncomingMessage, ServerResponse } from 'node:http'
import { getLeaderboard } from '../db/raceResult'

function jsonRes(res: ServerResponse, status: number, data: object) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

export async function leaderboardHandler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    jsonRes(res, 405, { error: 'Method not allowed' })
    return
  }
  const url = new URL(req.url ?? '/', 'http://localhost')
  const period = url.searchParams.get('period')
  if (period !== 'day' && period !== 'week' && period !== 'month') {
    jsonRes(res, 400, { error: 'period must be day, week, or month' })
    return
  }
  try {
    const players = await getLeaderboard(period)
    jsonRes(res, 200, { players })
  } catch (err) {
    jsonRes(res, 500, { error: (err as Error).message })
  }
}
