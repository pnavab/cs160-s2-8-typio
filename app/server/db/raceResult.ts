import { RaceResult } from '../models/RaceResult'
import { User } from '../models/User'

export async function saveResult(data: {
  username: string
  wpm: number
  accuracy: number
  placement: number
  roomCode: string
  difficulty: string
}) {
  return RaceResult.create(data)
}

export async function getLeaderboard(period: 'day' | 'week' | 'month') {
  const now = new Date()
  const startDate = new Date(now)
  if (period === 'day') startDate.setDate(now.getDate() - 1)
  else if (period === 'week') startDate.setDate(now.getDate() - 7)
  else startDate.setMonth(now.getMonth() - 1)

  const results = await RaceResult.aggregate<{ username: string; wpm: number }>([
    { $match: { createdAt: { $gte: startDate } } },
    { $group: { _id: '$username', wpm: { $max: '$wpm' } } },
    { $sort: { wpm: -1 } },
    { $limit: 5 },
    { $project: { _id: 0, username: '$_id', wpm: 1 } },
  ])
  return results
}

export async function getProfile(username: string) {
  const [results, userDoc] = await Promise.all([
    RaceResult.find({ username }).sort({ createdAt: -1 }).lean(),
    User.findOne({ username }).lean(),
  ])

  const joinedDate = userDoc?.createdAt
    ? new Date(userDoc.createdAt as Date).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null

  if (results.length === 0) {
    return { racesPlayed: 0, bestWpm: 0, avgWpm: 0, avgAccuracy: 0, history: [], joinedDate }
  }

  const racesPlayed = results.length
  const bestWpm = Math.max(...results.map((r) => r.wpm))
  const avgWpm = Math.round(results.reduce((s, r) => s + r.wpm, 0) / racesPlayed)
  const avgAccuracy =
    Math.round((results.reduce((s, r) => s + r.accuracy, 0) / racesPlayed) * 10) / 10

  const history = results.map((r) => ({
    date: new Date(r.createdAt as Date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    wpm: r.wpm,
    acc: r.accuracy,
    placement: r.placement,
    difficulty: r.difficulty as string,
  }))

  return { racesPlayed, bestWpm, avgWpm, avgAccuracy, history, joinedDate }
}
