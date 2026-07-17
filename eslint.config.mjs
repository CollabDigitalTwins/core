import reactHooks from 'eslint-plugin-react-hooks'
import sonarjs from 'eslint-plugin-sonarjs'
import unicorn from 'eslint-plugin-unicorn'
import tsParser from '@typescript-eslint/parser'

/*
 * Balanced ESLint config for @collabdt/core.
 *
 * Mirrors cdt-na's config but drops the Next.js plugin -- this package is a
 * framework-agnostic library (tsup ESM, consumed via npm/yalc).
 *
 * Every rule is a WARNING on purpose: linting must never block the build.
 * Only hand-picked, high-signal bug-catchers are enabled. We deliberately do
 * NOT enable the unicorn / sonarjs "recommended" sets (cosmetic noise).
 * Zero new dependencies -- all plugins are already installed.
 */
export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '.yalc/**',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      sonarjs,
      unicorn,
    },
    rules: {
      // --- Correctness / real bug catchers ---
      'react-hooks/rules-of-hooks': 'warn', // real bugs (conditional hooks)
      'no-debugger': 'warn',
      eqeqeq: ['warn', 'smart'],
      'sonarjs/no-identical-expressions': 'warn',
      'sonarjs/no-identical-conditions': 'warn',
      'sonarjs/no-all-duplicated-branches': 'warn',
      'sonarjs/no-empty-collection': 'warn',
      'sonarjs/no-use-of-empty-return-value': 'warn',
      'unicorn/no-invalid-remove-event-listener': 'warn',
      'unicorn/no-thenable': 'warn',

      // --- Team conventions ---
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'sonarjs/no-commented-code': 'warn', // delete dead code, git remembers
      'no-var': 'warn',
      'prefer-const': 'warn',

      // exhaustive-deps intentionally OFF (false-positive noise), same as cdt-na.
      // Type-aware rules (consistent-type-imports, import/order) deferred: need new devDeps.
    },
  },
]
