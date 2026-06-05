import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const KEY_LENGTH = 32
const ITERATIONS = 100000

// Get master key from environment (support both names)
const getMasterKey = (): string => {
  const key = process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_MASTER_KEY
  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      return 'dev-only-encryption-key-do-not-use-in-production-123'
    }
    throw new Error('ENCRYPTION_KEY or ENCRYPTION_MASTER_KEY environment variable is required')
  }
  return key
}

export const encryptionService = {
  /**
   * Derive encryption key from master key and salt
   */
  deriveKey(masterKey: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha512')
  },

  /**
   * Encrypt sensitive data
   * @param data - Plain text data to encrypt
   * @returns Encrypted data with IV, salt, and auth tag
   */
  encrypt(data: string): { encrypted: string; iv: string; salt: string; authTag: string } {
    const masterKey = getMasterKey()

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH)

    // Derive key
    const key = this.deriveKey(masterKey, salt)

    // Encrypt
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // Get auth tag
    const authTag = cipher.getAuthTag()

    return {
      encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      authTag: authTag.toString('hex'),
    }
  },

  /**
   * Decrypt sensitive data
   * @param encryptedData - Object containing encrypted data, IV, salt, and auth tag
   * @returns Decrypted plain text
   */
  decrypt(encryptedData: { encrypted: string; iv: string; salt: string; authTag: string }): string {
    const masterKey = getMasterKey()

    // Convert hex strings back to buffers
    const salt = Buffer.from(encryptedData.salt, 'hex')
    const iv = Buffer.from(encryptedData.iv, 'hex')
    const authTag = Buffer.from(encryptedData.authTag, 'hex')

    // Derive key
    const key = this.deriveKey(masterKey, salt)

    // Decrypt
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  },

  /**
   * Encrypt API key or other simple string value
   * Returns a single string that can be stored in the database
   */
  encryptForStorage(data: string): string {
    const encrypted = this.encrypt(data)
    // Store all components as a single JSON string
    return JSON.stringify(encrypted)
  },

  /**
   * Decrypt data that was stored with encryptForStorage
   */
  decryptFromStorage(storedData: string): string {
    const parsed = JSON.parse(storedData)
    return this.decrypt(parsed)
  },

  /**
   * Hash sensitive data (one-way, for verification)
   * Use for data that doesn't need to be retrieved, only verified
   */
  hash(data: string): string {
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex')
    return `${salt}:${hash}`
  },

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashed: string): boolean {
    const [salt, hash] = hashed.split(':')
    const verify = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex')
    return hash === verify
  },
}
