import { redisClient } from '../config/redis'

const DEFAULT_TTL = 600 // 10 minutes in seconds

interface CacheOptions {
  ttl?: number // in seconds
  tags?: string[] // for cache invalidation by tag
}

export const cacheService = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key)
      if (!value) return null
      return JSON.parse(value) as T
    } catch (error) {
      console.error('[Cache] Error getting value:', error)
      return null
    }
  },

  /**
   * Set value in cache with optional TTL
   */
  async set(key: string, value: unknown, options: CacheOptions = {}): Promise<void> {
    try {
      const { ttl = DEFAULT_TTL, tags = [] } = options
      const serialized = JSON.stringify(value)
      
      await redisClient.setEx(key, ttl, serialized)
      
      // Store tags for later invalidation
      if (tags.length > 0) {
        for (const tag of tags) {
          await redisClient.sAdd(`cache:tag:${tag}`, key)
          // Also expire the tag set at max TTL (to clean up old references)
          await redisClient.expire(`cache:tag:${tag}`, Math.max(ttl, 86400)) // max 24h
        }
      }
    } catch (error) {
      console.error('[Cache] Error setting value:', error)
    }
  },

  /**
   * Delete a specific key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key)
    } catch (error) {
      console.error('[Cache] Error deleting key:', error)
    }
  },

  /**
   * Invalidate all cache entries by tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = await redisClient.sMembers(`cache:tag:${tag}`)
      if (keys.length > 0) {
        await redisClient.del(keys)
        await redisClient.del(`cache:tag:${tag}`)
        console.log(`[Cache] Invalidated ${keys.length} keys for tag: ${tag}`)
      }
    } catch (error) {
      console.error('[Cache] Error invalidating by tag:', error)
    }
  },

  /**
   * Invalidate multiple tags at once
   */
  async invalidateTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.invalidateByTag(tag)
    }
  },

  /**
   * Wrap a function with caching
   * @param fn Function to cache
   * @param cacheKey Key for cache storage
   * @param options Cache options
   * @returns Cached function result
   */
  async wrap<T>(
    fn: () => Promise<T>,
    cacheKey: string,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(cacheKey)
    if (cached !== null) {
      console.log(`[Cache] Hit for key: ${cacheKey}`)
      return cached
    }

    // Execute function and cache result
    console.log(`[Cache] Miss for key: ${cacheKey}`)
    const result = await fn()
    await this.set(cacheKey, result, options)
    return result
  },

  /**
   * Generate cache key with prefix and params
   */
  generateKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => {
        const val = params[key]
        if (val === null || val === undefined) return `${key}:null`
        if (typeof val === 'object') return `${key}:${JSON.stringify(val)}`
        return `${key}:${val}`
      })
      .join(':')
    return `gestock:${prefix}:${sortedParams}`
  },

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return redisClient.isReady
  },

  /**
   * Get cache stats
   */
  async getStats(): Promise<{ keys: number; tags: number }> {
    try {
      const allKeys = await redisClient.keys('gestock:*')
      const tagKeys = await redisClient.keys('cache:tag:*')
      return {
        keys: allKeys.length,
        tags: tagKeys.length
      }
    } catch (error) {
      console.error('[Cache] Error getting stats:', error)
      return { keys: 0, tags: 0 }
    }
  }
}

export default cacheService
