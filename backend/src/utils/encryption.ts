import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || (process.env.NODE_ENV === 'development' ? '' : (() => { throw new Error('ENCRYPTION_KEY environment variable is required') })())
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

export const encrypt = (text: string): { encryptedData: string; iv: string } => {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string')
  }

  const iv = crypto.randomBytes(IV_LENGTH)
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag().toString('hex')
  
  return {
    encryptedData: encrypted + authTag,
    iv: iv.toString('hex')
  }
}

export const decrypt = (encryptedData: string, ivHex: string): string => {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  
  // aes-256-gcm auth tag is 128 bit (32 hex chars) at the end
  const authTag = Buffer.from(encryptedData.slice(-32), 'hex')
  const encryptedText = encryptedData.slice(0, -32)
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
