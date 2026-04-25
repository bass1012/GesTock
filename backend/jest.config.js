/* eslint-env node */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/**/*.test.ts'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  collectCoverageFrom: [
    'src/services/stock.service.ts',
    'src/services/sales.service.ts',
    'src/utils/errors.ts',
    'src/utils/jwt.ts',
  ],
  coverageThreshold: {
    // Seuils par fichier — reflètent le niveau de test actuel
    // Augmenter progressivement au fur et à mesure que la couverture monte
    './src/services/sales.service.ts': { lines: 85 },
    './src/services/stock.service.ts': { lines: 40 },
    './src/utils/errors.ts':           { lines: 70 },
    './src/utils/jwt.ts':              { lines: 55 },
  },
};
