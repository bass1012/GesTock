import { createClient } from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

const client = createClient({
  url: redisUrl,
})

client.on('error', (err) => console.error('Redis Client Error', err))

export const connectRedis = async () => {
  if (!client.isOpen) {
    await client.connect()
    console.log('Connected to Redis')
  }
}

export const redisClient = client
export default client
