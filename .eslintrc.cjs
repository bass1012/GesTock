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
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
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
  ],
  rules: {
    'no-case-declarations': 'warn',
    'prefer-const': 'warn',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
  },
}
