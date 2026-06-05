/* eslint-env node */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/**/*.test.ts'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  setupFiles: ['./jest.setup.ts'],
  collectCoverageFrom: [
    'src/services/stock.service.ts',
    'src/services/sales.service.ts',
    'src/services/auth.service.ts',
    'src/controllers/products.controller.ts',
    'src/controllers/users.controller.ts',
    'src/controllers/warehouses.controller.ts',
    'src/controllers/alert.controller.ts',
    'src/utils/errors.ts',
    'src/utils/jwt.ts',
    'src/utils/asyncHandler.ts',
    'src/utils/mapper.ts',
  ],
  coverageThreshold: {
    // Seuils par fichier — la CI échoue si un fichier passe en dessous
    './src/services/sales.service.ts': { lines: 85 },
    './src/services/stock.service.ts': { lines: 40 },
    './src/services/auth.service.ts': { lines: 60 },
    './src/utils/errors.ts': { lines: 100 },
    './src/utils/jwt.ts': { lines: 90 },
    // Seuil global minimal — filet de sécurité
    global: { lines: 50, functions: 40, branches: 30 },
  },
}
