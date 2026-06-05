import redisClient from '../config/redis'

const BLACKLIST_PREFIX = 'jwt:blacklist:'

export const jwtBlacklistService = {
  /**
   * Add a JWT token to the blacklist
   * @param token - The JWT token to blacklist
   * @param expiresIn - Time until token expiration (in seconds)
   */
  async blacklistToken(token: string, expiresIn: number): Promise<void> {
    const key = `${BLACKLIST_PREFIX}${token}`
    // Store with TTL equal to token remaining lifetime
    await redisClient.setEx(key, expiresIn, '1')
  },

  /**
   * Check if a token is blacklisted
   * @param token - The JWT token to check
   * @returns true if blacklisted, false otherwise
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const key = `${BLACKLIST_PREFIX}${token}`
    const result = await redisClient.get(key)
    return result !== null
  },

  /**
   * Blacklist a refresh token (stored separately)
   */
  async blacklistRefreshToken(token: string, expiresIn: number): Promise<void> {
    const key = `refresh:${BLACKLIST_PREFIX}${token}`
    await redisClient.setEx(key, expiresIn, '1')
  },

  /**
   * Check if a refresh token is blacklisted
   */
  async isRefreshTokenBlacklisted(token: string): Promise<boolean> {
    const key = `refresh:${BLACKLIST_PREFIX}${token}`
    const result = await redisClient.get(key)
    return result !== null
  },

  /**
   * Store the active session ID for a user
   */
  async setActiveSession(userId: string, sessionId: string): Promise<void> {
    const key = `active_session:${userId}`
    // 7 days TTL (same as refresh token)
    await redisClient.setEx(key, 7 * 24 * 60 * 60, sessionId)
  },

  /**
   * Get the active session ID for a user
   */
  async getActiveSession(userId: string): Promise<string | null> {
    const key = `active_session:${userId}`
    return await redisClient.get(key)
  },

  /**
   * Remove active session on logout
   */
  async removeActiveSession(userId: string): Promise<void> {
    const key = `active_session:${userId}`
    await redisClient.del(key)
  },
}
