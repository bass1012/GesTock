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
    global: {
      lines: 70,
    },
  },
};
