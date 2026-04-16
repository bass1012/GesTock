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
}
