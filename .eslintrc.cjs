module.exports = {
  root: true,
  env: {
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'sonarjs'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:sonarjs/recommended',
    'prettier',
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'frontend/dev-dist/',
    'coverage/',
    '.husky/',
    '*.min.js',
  ],
  overrides: [
    {
      files: ['backend/**/*.ts'],
      env: {
        node: true,
      },
    },
    {
      files: ['frontend/**/*.{ts,tsx}'],
      env: {
        browser: true,
      },
    },
    {
      // Disable no-explicit-any for test files since type mocks use 'any' extensively
      files: ['**/*.test.ts', '**/*.test.tsx', '**/tests/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      // Warn on existing source files for progressive type refactoring
      files: ['backend/src/**/*.ts', 'frontend/src/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
  rules: {
    'no-case-declarations': 'warn',
    'prefer-const': 'error',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'sonarjs/no-duplicate-string': 'off',
    'sonarjs/cognitive-complexity': 'warn',
    'sonarjs/prefer-immediate-return': 'warn',
    'sonarjs/no-duplicated-branches': 'warn',
    'sonarjs/no-identical-functions': 'warn',
    'sonarjs/no-nested-template-literals': 'warn',
    'sonarjs/no-collapsible-if': 'warn',
  },
}
