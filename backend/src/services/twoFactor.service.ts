import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { encryptionService } from './encryption.service'

const prisma = new PrismaClient()

// Generate TOTP secret (base32 encoded)
const generateSecret = (): string => {
    const buffer = crypto.randomBytes(20)
    return buffer.toString('base64url').toUpperCase().replace(/[^A-Z2-7]/g, '').slice(0, 32)
}

// Generate TOTP code based on secret and time
const generateTOTP = (secret: string, window = 0): string => {
    const time = Math.floor(Date.now() / 1000 / 30) + window
    const timeBuffer = Buffer.alloc(8)
    timeBuffer.writeBigUInt64BE(BigInt(time), 0)
    
    // Decode base32 secret
    const decoded = base32Decode(secret)
    
    // HMAC
    const hmac = crypto.createHmac('sha1', decoded)
    hmac.update(timeBuffer)
    const hash = hmac.digest()
    
    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f
    const code = ((hash[offset] & 0x7f) << 24 |
                  (hash[offset + 1] & 0xff) << 16 |
                  (hash[offset + 2] & 0xff) << 8 |
                  (hash[offset + 3] & 0xff)) % 1000000
    
    return code.toString().padStart(6, '0')
}

// Base32 decode
const base32Decode = (encoded: string): Buffer => {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let bits = ''
    for (const char of encoded.toUpperCase()) {
        const val = base32Chars.indexOf(char)
        if (val === -1) continue
        bits += val.toString(2).padStart(5, '0')
    }
    
    const result: number[] = []
    for (let i = 0; i < bits.length; i += 8) {
        const byte = bits.slice(i, i + 8)
        if (byte.length === 8) {
            result.push(parseInt(byte, 2))
        }
    }
    return Buffer.from(result)
}

// Generate backup codes
const generateBackupCodes = (): string[] => {
    const codes: string[] = []
    for (let i = 0; i < 8; i++) {
        codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
    }
    return codes
}

export const twoFactorService = {
    /**
     * Enable 2FA for a user
     * Returns the secret and backup codes (only shown once)
     */
    async enable(userId: string): Promise<{ secret: string; backupCodes: string[]; qrCodeUrl: string }> {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) throw new Error('Utilisateur introuvable')

        // Generate secret
        const secret = generateSecret()
        
        // Generate backup codes and encrypt them
        const backupCodes = generateBackupCodes()
        const encryptedCodes = backupCodes.map(code => encryptionService.hash(code))
        
        // Encrypt secret before storing
        const encryptedSecret = encryptionService.encryptForStorage(secret)
        
        // Update user
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorSecret: encryptedSecret,
                twoFactorEnabled: true,
                twoFactorBackupCodes: encryptedCodes,
            },
        })
        
        // Generate QR code URL (compatible with Google Authenticator)
        const qrCodeUrl = `otpauth://totp/GesStock:${user.email}?secret=${secret}&issuer=GesStock`
        
        return { secret, backupCodes, qrCodeUrl }
    },

    /**
     * Verify a 2FA code
     */
    async verify(userId: string, code: string): Promise<boolean> {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return false
        }
        
        try {
            // Decrypt the stored secret
            const secret = encryptionService.decryptFromStorage(user.twoFactorSecret)
            
            // Check current and adjacent time windows
            for (let window = -1; window <= 1; window++) {
                const expectedCode = generateTOTP(secret, window)
                if (expectedCode === code) {
                    return true
                }
            }
            
            // Check backup codes
            if (user.twoFactorBackupCodes && Array.isArray(user.twoFactorBackupCodes)) {
                const codes = user.twoFactorBackupCodes as string[]
                const index = codes.findIndex(hashed => encryptionService.verifyHash(code, hashed))
                
                if (index !== -1) {
                    // Remove used backup code
                    const newCodes = [...codes.slice(0, index), ...codes.slice(index + 1)]
                    await prisma.user.update({
                        where: { id: userId },
                        data: { twoFactorBackupCodes: newCodes },
                    })
                    return true
                }
            }
            
            return false
        } catch (error) {
            console.error('2FA verification error:', error)
            return false
        }
    },

    /**
     * Disable 2FA for a user
     */
    async disable(userId: string): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorSecret: null,
                twoFactorEnabled: false,
                twoFactorBackupCodes: [], // Utilise un tableau vide pour les champs JSON nullable dans Prisma
            },
        })
    },

    /**
     * Check if user has 2FA enabled
     */
    async isEnabled(userId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { twoFactorEnabled: true },
        })
        return user?.twoFactorEnabled || false
    },

    /**
     * Regenerate backup codes
     */
    async regenerateBackupCodes(userId: string): Promise<string[]> {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user || !user.twoFactorEnabled) {
            throw new Error('2FA non activé')
        }
        
        const newCodes = generateBackupCodes()
        const encryptedCodes = newCodes.map(code => encryptionService.hash(code))
        
        await prisma.user.update({
            where: { id: userId },
            data: { twoFactorBackupCodes: encryptedCodes },
        })
        
        return newCodes
    },
}
