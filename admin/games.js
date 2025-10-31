import { getRedis } from './_redis.js'

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const { games } = req.body
  if (!Array.isArray(games) || games.length === 0)
    return res.status(400).json({ error: 'No games provided' })

  const redis = await getRedis()

  for (const name of games) {
    const key = `game:${name}`
    const exists = await redis.exists(key)
    if (!exists) {
      await redis.hset(key, { name, played: 0, skipped: 0 })
      await redis.sadd('games', name)
    }
  }

  return res.status(200).json({ success: true, count: games.length })
}
