import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export type AuditAction = 
    // Auth actions
    | 'USER_LOGIN'
    | 'USER_LOGOUT'
    | 'USER_REGISTER'
    | 'PASSWORD_CHANGE'
    | 'PASSWORD_RESET'
    // User management
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'USER_DELETED'
    | 'ROLE_CHANGED'
    // SuperAdmin actions
    | 'TENANT_SUSPENDED'
    | 'TENANT_ACTIVATED'
    | 'SUBSCRIPTION_MODIFIED'
    | 'QUOTA_MODIFIED'
    | 'FORCE_PASSWORD_RESET'
    | 'AUDIT_LOG_VIEWED'
    // Critical data operations
    | 'PRODUCT_DELETED'
    | 'SUPPLIER_DELETED'
    | 'ORDER_CANCELLED'
    | 'ORDER_RECEIVED'
    | 'STOCK_ADJUSTED'
    | 'STOCK_MOVEMENT_IN'
    | 'STOCK_MOVEMENT_OUT'
    | 'STOCK_TRANSFER'
    | 'SALE_COMPLETED'
    | 'SALE_CANCELLED'
    | 'API_KEY_GENERATED'
    | 'API_KEY_REVOKED'

export interface AuditLogData {
    action: AuditAction
    userId: string
    tenantId?: string | null
    resource?: string
    resourceId?: string
    metadata?: Record<string, any>
    ip?: string
    userAgent?: string
}

export const auditService = {
    /**
     * Log a critical action
     */
    async log(data: AuditLogData): Promise<void> {
        try {
            await (prisma as any).auditLog.create({
                data: {
                    action: data.action,
                    userId: data.userId,
                    tenantId: data.tenantId,
                    resource: data.resource,
                    resourceId: data.resourceId,
                    metadata: data.metadata || {},
                    ip: data.ip,
                    userAgent: data.userAgent,
                    createdAt: new Date(),
                },
            })
        } catch (error) {
            // Audit logging should not break the application
            // But we should log to console for debugging
            console.error('Failed to create audit log:', error)
        }
    },

    /**
     * Get audit logs with filtering and pagination
     */
    async getLogs(options: {
        tenantId?: string
        userId?: string
        action?: AuditAction
        startDate?: Date
        endDate?: Date
        page?: number
        limit?: number
    }) {
        const {
            tenantId,
            userId,
            action,
            startDate,
            endDate,
            page = 1,
            limit = 50,
        } = options

        const where: any = {}

        if (tenantId) where.tenantId = tenantId
        if (userId) where.userId = userId
        if (action) where.action = action
        if (startDate || endDate) {
            where.createdAt = {}
            if (startDate) where.createdAt.gte = startDate
            if (endDate) where.createdAt.lte = endDate
        }

        const [logs, total] = await Promise.all([
            (prisma as any).auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: {
                            email: true,
                            firstName: true,
                            lastName: true,
                            role: true,
                        },
                    },
                    tenant: {
                        select: {
                            name: true,
                            slug: true,
                        },
                    },
                },
            }),
            (prisma as any).auditLog.count({ where }),
        ])

        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        }
    },

    /**
     * Get recent audit logs for a specific user
     */
    async getUserRecentLogs(userId: string, limit: number = 10) {
        return (prisma as any).auditLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        })
    },

    /**
     * Get audit logs for a specific tenant
     */
    async getTenantLogs(tenantId: string, page: number = 1, limit: number = 50) {
        return this.getLogs({ tenantId, page, limit })
    },
}
