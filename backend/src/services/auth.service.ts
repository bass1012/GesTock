import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, jwt } from '../utils/jwt'
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors'
import { tenantService } from './tenant.service'
import { jwtBlacklistService } from './jwtBlacklist.service'

const prisma = new PrismaClient()

export const authService = {
    async register(data: {
        email: string
        password: string
        firstName: string
        lastName: string
        companyName: string
        companySlug: string
    }) {
        // Check if tenant slug already exists
        const existingTenant = await prisma.tenant.findUnique({
            where: { slug: data.companySlug },
        })
        if (existingTenant) {
            throw new ConflictError('Cet identifiant d\'entreprise est déjà pris')
        }

        // Create tenant
        const tenant = await prisma.tenant.create({
            data: {
                slug: data.companySlug,
                name: data.companyName,
                plan: 'starter',
                config: {
                    modules: {
                        stock: true,
                        fournisseurs: false,
                        facturation: false,
                        rapports: false,
                        multi_entrepot: false,
                    },
                    theme: {
                        primaryColor: '#2563EB',
                    },
                },
            },
        })

        // Create tenant schema
        await tenantService.createTenantSchema(data.companySlug)

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 12)

        // Create admin user
        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                firstName: data.firstName,
                lastName: data.lastName,
                role: 'admin',
                tenantId: tenant.id,
            },
        })

        // Generate tokens
        const tokenPayload = { userId: user.id, tenantId: tenant.id, role: user.role }
        const accessToken = generateAccessToken(tokenPayload)
        const refreshToken = generateRefreshToken(tokenPayload)

        // Save refresh token
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
        })

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
            tenant: {
                id: tenant.id,
                slug: tenant.slug,
                name: tenant.name,
                plan: tenant.plan,
                config: tenant.config,
            },
            accessToken,
            refreshToken,
        }
    },

    async login(email: string, password: string, tenantSlug?: string) {
        // Find user — if tenantSlug provided, scope to that tenant
        let user
        if (tenantSlug) {
            const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
            if (!tenant) throw new NotFoundError('Tenant introuvable')
            user = await prisma.user.findUnique({
                where: { email_tenantId: { email, tenantId: tenant.id } },
                include: { tenant: true },
            })
        } else {
            // Find first user with this email
            user = await prisma.user.findFirst({
                where: { email },
                include: { tenant: true },
            })
        }

        if (!user) {
            throw new UnauthorizedError('Email ou mot de passe incorrect')
        }

        if (user.tenant.isSuspended) {
            throw new UnauthorizedError('COMPTE SUSPENDU. Veuillez contacter le support (QG).')
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
            throw new UnauthorizedError('Email ou mot de passe incorrect')
        }

        const activeSessionId = await jwtBlacklistService.getActiveSession(user.id)
        if (activeSessionId) {
            // Replace any previous session to avoid locking the user out if
            // the old device/browser was closed without explicit logout.
            await prisma.refreshToken.deleteMany({ where: { userId: user.id } })
            await jwtBlacklistService.removeActiveSession(user.id)
        }

        // Generate tokens
        const sessionId = crypto.randomUUID()
        const tokenPayload = { userId: user.id, tenantId: user.tenantId, role: user.role, sessionId }
        const accessToken = generateAccessToken(tokenPayload)
        const refreshToken = generateRefreshToken(tokenPayload)

        // Invalidate all previous sessions: delete old refresh tokens
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } })

        // Store active session ID in Redis
        await jwtBlacklistService.setActiveSession(user.id, sessionId)

        // Save refresh token
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        })

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                mustChangePassword: user.mustChangePassword,
            },
            tenant: {
                id: user.tenant.id,
                slug: user.tenant.slug,
                name: user.tenant.name,
                plan: user.tenant.plan,
                config: user.tenant.config,
            },
            accessToken,
            refreshToken,
        }
    },

    async refresh(oldRefreshToken: string) {
        // Check if refresh token is blacklisted (already used)
        const isBlacklisted = await jwtBlacklistService.isRefreshTokenBlacklisted(oldRefreshToken)
        if (isBlacklisted) {
            throw new UnauthorizedError('Refresh token révoqué. Veuillez vous reconnecter.')
        }

        // Verify token
        const payload = verifyRefreshToken(oldRefreshToken)

        // Check if token exists in DB
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: oldRefreshToken },
            include: { user: { include: { tenant: true } } },
        })

        if (!storedToken || storedToken.expiresAt < new Date()) {
            throw new UnauthorizedError('Refresh token invalide ou expiré')
        }

        if (storedToken.user.tenant.isSuspended) {
            throw new UnauthorizedError('COMPTE SUSPENDU. Veuillez contacter le support (QG).')
        }

        // Blacklist the old refresh token before deleting (for detection of replay attacks)
        const tokenExpiry = Math.floor((storedToken.expiresAt.getTime() - Date.now()) / 1000)
        if (tokenExpiry > 0) {
            await jwtBlacklistService.blacklistRefreshToken(oldRefreshToken, tokenExpiry)
        }

        // Delete old token (ignore if already deleted)
        try {
            await prisma.refreshToken.delete({ where: { id: storedToken.id } })
        } catch (e) {
            // Token already deleted or not found, continue
        }

        // Generate new tokens
        const tokenPayload = { userId: payload.userId, tenantId: payload.tenantId, role: payload.role }
        const accessToken = generateAccessToken(tokenPayload)
        const refreshToken = generateRefreshToken(tokenPayload)

        // Save new refresh token (upsert to avoid unique constraint conflict)
        await prisma.refreshToken.upsert({
            where: { token: refreshToken },
            update: {
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            create: {
                token: refreshToken,
                userId: payload.userId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        })

        return { accessToken, refreshToken }
    },

    async logout(accessToken: string, refreshToken?: string) {
        // Blacklist the access token (remaining TTL)
        try {
                const decoded = jwt.decode(accessToken) as any
            if (decoded && decoded.exp) {
                const remaining = decoded.exp - Math.floor(Date.now() / 1000)
                if (remaining > 0) {
                    await jwtBlacklistService.blacklistToken(accessToken, remaining)
                }
            }
        } catch (e) {
            // Ignore decode errors
        }

        // Blacklist and delete refresh token if provided
        if (refreshToken) {
            try {
                const decoded = jwt.decode(refreshToken) as any
                if (decoded && decoded.exp) {
                    const remaining = decoded.exp - Math.floor(Date.now() / 1000)
                    if (remaining > 0) {
                        await jwtBlacklistService.blacklistRefreshToken(refreshToken, remaining)
                    }
                }
            } catch (e) {
                // Ignore decode errors
            }
            await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
        }

        // Remove active session
        if (accessToken) {
            try {
            const decoded = jwt.decode(accessToken) as any
                if (decoded?.userId) {
                    await jwtBlacklistService.removeActiveSession(decoded.userId)
                }
            } catch (e) {
                // Ignore
            }
        }
    },

    async changePasswordMandatory(userId: string, newPassword: string) {
        const hashedPassword = await bcrypt.hash(newPassword, 12)
        return await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: false,
            },
        })
    },
}
