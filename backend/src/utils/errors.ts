export class AppError extends Error {
    statusCode: number
    isOperational: boolean

    constructor(message: string, statusCode: number) {
        super(message)
        this.statusCode = statusCode
        this.isOperational = true
        Error.captureStackTrace(this, this.constructor)
    }
}

export class BadRequestError extends AppError {
    constructor(message = 'Requête invalide') {
        super(message, 400)
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Non autorisé') {
        super(message, 401)
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Accès interdit') {
        super(message, 403)
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Ressource introuvable') {
        super(message, 404)
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Conflit') {
        super(message, 409)
    }
}
