import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { UnauthorizedError, NotFoundError } from '../utils/errors';
import { auditService } from '../services/audit.service';

const prisma = new PrismaClient();

// Minimal middleware to verify super admin secret
export const superAdminMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return next(new UnauthorizedError('Code maitre requis'));
    }
    
    if (!authHeader.startsWith('Bearer ')) {
        return next(new UnauthorizedError('Format: Bearer <token> requis'));
    }
    
    const parts = authHeader.split(' ');
    if (parts.length < 2) {
        return next(new UnauthorizedError('Token manquant'));
    }
    
    const token = parts[1]?.trim();
    if (!token) {
        return next(new UnauthorizedError('Token vide'));
    }
    
    const secret = process.env.SUPER_ADMIN_SECRET?.trim();
    
    if (!secret) {
        return next(new UnauthorizedError('SUPER_ADMIN_SECRET non configuré'));
    }
    
    if (token !== secret) {
        return next(new UnauthorizedError('Code maitre invalide'));
    }
    
    next();
};

export const superAdminController = {
    async listTenants(req: Request, res: Response, next: NextFunction) {
        try {
            const tenants = await prisma.tenant.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { users: true, apiKeys: true } }
                }
            });
            
            // Format to return relevant stats
            const result = tenants.map(t => {
                const config = (t.config as any) || {};
                return {
                    id: t.id,
                    slug: t.slug,
                    name: t.name,
                    plan: t.plan,
                    status: config.subscriptionStatus || 'trialing',
                    isSuspended: t.isSuspended,
                    apiEnabled: t.apiEnabled,
                    apiKeysCount: t._count.apiKeys,
                    currentPeriodEnd: config.subscriptionEndDate || null,
                    usersCount: t._count.users,
                    createdAt: t.createdAt
                };
            });
            
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    async updateTenantPlan(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { plan, durationMonths } = req.body;
            
            const tenant = await prisma.tenant.findUnique({ where: { id } });
            if (!tenant) return res.status(404).json({ error: 'Tenant introuvable' });
            
            const config = (tenant.config as any) || {};
            
            // Calculate new end date
            let currentEnd = config.subscriptionEndDate ? new Date(config.subscriptionEndDate) : new Date();
            if (currentEnd < new Date()) currentEnd = new Date(); // If expired, start from today
            
            const newEndDate = new Date(currentEnd);
            newEndDate.setMonth(newEndDate.getMonth() + (durationMonths || 1));
            
            const updated = await prisma.tenant.update({
                where: { id },
                data: {
                    plan,
                    config: {
                        ...config,
                        subscriptionStatus: 'active',
                        subscriptionEndDate: newEndDate.toISOString()
                    }
                }
            });

            // Audit log
            await auditService.log({
                action: 'SUBSCRIPTION_MODIFIED',
                userId: 'superadmin',
                tenantId: id,
                resource: 'tenant',
                resourceId: id,
                metadata: { newPlan: plan, durationMonths: durationMonths || 1, endDate: newEndDate },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({ message: 'Plan mis à jour avec succès', tenant: updated });
        } catch (error) {
            next(error);
        }
    },
    
    async verifyLogin(req: Request, res: Response) {
        // If it passes the middleware, it's valid
        res.json({ success: true });
    },

    async getAuditLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                tenantId,
                userId,
                action,
                startDate,
                endDate,
                page = '1',
                limit = '50'
            } = req.query;

            const result = await auditService.getLogs({
                tenantId: tenantId as string,
                userId: userId as string,
                action: action as any,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                page: parseInt(page as string, 10),
                limit: parseInt(limit as string, 10)
            });

            // Log the audit log access itself
            await auditService.log({
                action: 'AUDIT_LOG_VIEWED',
                userId: 'superadmin',
                resource: 'audit_logs',
                metadata: {
                    filters: { tenantId, userId, action, startDate, endDate }
                },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    async toggleTenantStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenant = await prisma.tenant.findUnique({ where: { id } });
            if (!tenant) return res.status(404).json({ error: 'Tenant introuvable' });

            const newStatus = !tenant.isSuspended;
            const updated = await prisma.tenant.update({
                where: { id },
                data: { isSuspended: newStatus }
            });

            // Audit log
            await auditService.log({
                action: newStatus ? 'TENANT_SUSPENDED' : 'TENANT_ACTIVATED',
                userId: 'superadmin',
                tenantId: id,
                resource: 'tenant',
                resourceId: id,
                metadata: { previousStatus: tenant.isSuspended, newStatus },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({ message: `Statut mis à jour : ${updated.isSuspended ? 'Suspendu' : 'Actif'}`, tenant: updated });
        } catch (error) {
            next(error);
        }
    },

    async toggleTenantApi(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenant = await prisma.tenant.findUnique({ where: { id } });
            if (!tenant) return res.status(404).json({ error: 'Tenant introuvable' });

            const updated = await prisma.tenant.update({
                where: { id },
                data: { apiEnabled: !tenant.apiEnabled }
            });

            res.json({ message: `Accès API : ${updated.apiEnabled ? 'Activé' : 'Désactivé'}`, tenant: updated });
        } catch (error) {
            next(error);
        }
    },

    async listTenantUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const { tenantId } = req.params;
            const users = await prisma.user.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    mustChangePassword: true,
                    createdAt: true
                }
            });
            res.json(users);
        } catch (error) {
            next(error);
        }
    },

    async resetUserPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = req.params;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) throw new NotFoundError('Utilisateur introuvable');

            // Generate a readable random code: G-STOCK-XXXX
            const randomCode = `G-STOCK-${Math.floor(1000 + Math.random() * 9000)}`;
            const hashedPassword = await bcrypt.hash(randomCode, 12);

            await prisma.user.update({
                where: { id: userId },
                data: {
                    password: hashedPassword,
                    mustChangePassword: true
                }
            });

            // Audit log
            await auditService.log({
                action: 'FORCE_PASSWORD_RESET',
                userId: 'superadmin',
                tenantId: user.tenantId,
                resource: 'user',
                resourceId: userId,
                metadata: { targetEmail: user.email },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            // We return the raw code only once here so the technician can give it to the client
            res.json({ 
                message: 'Mot de passe réinitialisé', 
                tempPassword: randomCode 
            });
        } catch (error) {
            next(error);
        }
    },

    async getAuditStats(req: Request, res: Response, next: NextFunction) {
        try {
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);

            // Catégories d'actions
            const authActions    = ['USER_LOGIN', 'USER_LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'FORCE_PASSWORD_RESET'];
            const userActions    = ['USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'ROLE_CHANGED'];
            const tenantActions  = ['TENANT_SUSPENDED', 'TENANT_ACTIVATED', 'SUBSCRIPTION_MODIFIED', 'QUOTA_MODIFIED'];
            const stockActions   = ['STOCK_MOVEMENT_IN', 'STOCK_MOVEMENT_OUT', 'STOCK_TRANSFER', 'STOCK_ADJUSTED', 'PRODUCT_DELETED'];
            const salesActions   = ['SALE_COMPLETED', 'SALE_CANCELLED', 'ORDER_RECEIVED', 'ORDER_CANCELLED'];
            const apiActions     = ['API_KEY_GENERATED', 'API_KEY_REVOKED', 'AUDIT_LOG_VIEWED'];

            const [total24h, logins24h, suspensions24h, subscriptions7d, totalLogs] = await Promise.all([
                (prisma as any).auditLog.count({ where: { createdAt: { gte: last24h } } }),
                (prisma as any).auditLog.count({ where: { action: 'USER_LOGIN', createdAt: { gte: last24h } } }),
                (prisma as any).auditLog.count({ where: { action: 'TENANT_SUSPENDED', createdAt: { gte: last7d } } }),
                (prisma as any).auditLog.count({ where: { action: 'SUBSCRIPTION_MODIFIED', createdAt: { gte: last7d } } }),
                (prisma as any).auditLog.count(),
            ]);

            // Répartition par catégorie (7 derniers jours)
            const [authCount, userCount, tenantCount, stockCount, salesCount, apiCount] = await Promise.all([
                (prisma as any).auditLog.count({ where: { action: { in: authActions   }, createdAt: { gte: last7d } } }),
                (prisma as any).auditLog.count({ where: { action: { in: userActions   }, createdAt: { gte: last7d } } }),
                (prisma as any).auditLog.count({ where: { action: { in: tenantActions }, createdAt: { gte: last7d } } }),
                (prisma as any).auditLog.count({ where: { action: { in: stockActions  }, createdAt: { gte: last7d } } }),
                (prisma as any).auditLog.count({ where: { action: { in: salesActions  }, createdAt: { gte: last7d } } }),
                (prisma as any).auditLog.count({ where: { action: { in: apiActions    }, createdAt: { gte: last7d } } }),
            ]);

            res.json({
                summary: {
                    total24h,
                    logins24h,
                    suspensions7d: suspensions24h,
                    subscriptions7d,
                    totalLogs,
                },
                categories7d: [
                    { name: 'Auth & Sessions',      count: authCount,   color: 'blue'   },
                    { name: 'Gestion Utilisateurs', count: userCount,   color: 'yellow' },
                    { name: 'Tenants & Abonnements',count: tenantCount, color: 'red'    },
                    { name: 'Stock & Produits',     count: stockCount,  color: 'orange' },
                    { name: 'Ventes & Commandes',   count: salesCount,  color: 'green'  },
                    { name: 'API & Système',         count: apiCount,    color: 'gray'   },
                ],
            });
        } catch (error) {
            next(error);
        }
    },

    async exportAuditLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const { tenantId, userId, action, startDate, endDate } = req.query;

            const result = await auditService.getLogs({
                tenantId: tenantId as string,
                userId: userId as string,
                action: action as any,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                page: 1,
                limit: 5000, // Cap à 5 000 lignes pour l'export
            });

            // Construire le CSV
            const header = ['Date', 'Action', 'Tenant', 'Utilisateur', 'Email', 'Ressource', 'ID Ressource', 'IP', 'User-Agent'];
            const rows = result.logs.map((log: any) => [
                new Date(log.createdAt).toISOString(),
                log.action,
                log.tenant?.name || log.tenantId || '',
                log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : log.userId,
                log.user?.email || '',
                log.resource || '',
                log.resourceId || '',
                log.ip || '',
                (log.userAgent || '').replace(/,/g, ' '),
            ]);

            const csv = [header, ...rows].map(r => r.map((v: string) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`);
            res.send('\uFEFF' + csv); // BOM UTF-8 pour Excel
        } catch (error) {
            next(error);
        }
    }
};
