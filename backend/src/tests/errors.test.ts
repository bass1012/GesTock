import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../utils/errors'

describe('AppError', () => {
  it('crée une erreur avec statusCode et message', () => {
    const err = new AppError('Test', 400)
    expect(err.statusCode).toBe(400)
    expect(err.message).toBe('Test')
    expect(err.isOperational).toBe(true)
    expect(err).toBeInstanceOf(Error)
  })

  it('capture la stack trace', () => {
    const err = new AppError('Stack', 500)
    expect(err.stack).toBeDefined()
  })
})

describe('BadRequestError', () => {
  it('a le status 400 et le message par défaut', () => {
    const err = new BadRequestError()
    expect(err.statusCode).toBe(400)
    expect(err.message).toBe('Requête invalide')
  })

  it('accepte un message personnalisé', () => {
    const err = new BadRequestError('Email requis')
    expect(err.message).toBe('Email requis')
  })

  it('est une instance de AppError', () => {
    expect(new BadRequestError()).toBeInstanceOf(AppError)
  })
})

describe('UnauthorizedError', () => {
  it('a le status 401 et le message par défaut', () => {
    const err = new UnauthorizedError()
    expect(err.statusCode).toBe(401)
    expect(err.message).toBe('Non autorisé')
  })

  it('accepte un message personnalisé', () => {
    const err = new UnauthorizedError('Token invalide')
    expect(err.message).toBe('Token invalide')
  })

  it('est une instance de AppError', () => {
    expect(new UnauthorizedError()).toBeInstanceOf(AppError)
  })
})

describe('ForbiddenError', () => {
  it('a le status 403 et le message par défaut', () => {
    const err = new ForbiddenError()
    expect(err.statusCode).toBe(403)
    expect(err.message).toBe('Accès interdit')
  })

  it('accepte un message personnalisé', () => {
    const err = new ForbiddenError('Rôle insuffisant')
    expect(err.message).toBe('Rôle insuffisant')
  })

  it('est une instance de AppError', () => {
    expect(new ForbiddenError()).toBeInstanceOf(AppError)
  })
})

describe('NotFoundError', () => {
  it('a le status 404 et le message par défaut', () => {
    const err = new NotFoundError()
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('Ressource introuvable')
  })

  it('accepte un message personnalisé', () => {
    const err = new NotFoundError('Produit non trouvé')
    expect(err.message).toBe('Produit non trouvé')
  })

  it('est une instance de AppError', () => {
    expect(new NotFoundError()).toBeInstanceOf(AppError)
  })
})

describe('ConflictError', () => {
  it('a le status 409 et le message par défaut', () => {
    const err = new ConflictError()
    expect(err.statusCode).toBe(409)
    expect(err.message).toBe('Conflit')
  })

  it('accepte un message personnalisé', () => {
    const err = new ConflictError('Email déjà utilisé')
    expect(err.message).toBe('Email déjà utilisé')
  })

  it('est une instance de AppError', () => {
    expect(new ConflictError()).toBeInstanceOf(AppError)
  })
})
