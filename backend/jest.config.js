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
    'src/utils/errors.ts',
    'src/utils/jwt.ts',
  ],
  coverageThreshold: {
    './src/services/sales.service.ts': { lines: 85 },
    './src/services/stock.service.ts': { lines: 40 },
    './src/services/auth.service.ts':  { lines: 60 },
    './src/utils/errors.ts':           { lines: 100 },
    './src/utils/jwt.ts':              { lines: 80 },
  },
};
