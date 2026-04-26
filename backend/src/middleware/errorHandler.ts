import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/errors'
import { ZodError } from 'zod'

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    // Zod validation errors
    if (err instanceof ZodError) {
        return res.status(400).json({
            status: 400,
            message: 'Données invalides',
            errors: err.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        })
    }

    // Custom app errors
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: err.statusCode,
            message: err.message,
        })
    }

    // Unknown errors
    console.error('Unhandled error:', err)
    return res.status(500).json({
        status: 500,
        message: 'Erreur interne du serveur',
    })
}
