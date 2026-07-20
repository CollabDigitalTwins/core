import reactHooks from 'eslint-plugin-react-hooks';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import tsParser from '@typescript-eslint/parser';
import tseslint from 'typescript-eslint';

/*
 * Balanced ESLint config for @collabdt/core.
 *
 * This package is a framework-agnostic library (tsup ESM, consumed via
 * npm/yalc), so there is no Next.js plugin here.
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
      parserOptions: {
        ecmaFeatures: { jsx: true },
        // Tier 2 (2026-07-20): enable type-aware linting. projectService picks
        // the nearest tsconfig per file; tsconfigRootDir anchors it here.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      sonarjs,
      unicorn,
      '@typescript-eslint': tseslint.plugin,
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

      // --- Tier 1 hardening (2026-07-20): more zero-dep, high-signal rules ---
      // ESLint core correctness (bug catchers from the recommended set, opted in explicitly)
      'no-self-compare': 'warn', // `x === x` is always a mistake
      'no-unsafe-optional-chaining': 'warn', // `(a?.b)()` can throw on undefined
      'no-async-promise-executor': 'warn', // `new Promise(async ...)` swallows rejections
      // require-atomic-updates: evaluated in Tier 1, dropped -- all hits were benign
      // sequential writes after await (no real races), pure false-positive noise.
      'no-fallthrough': 'warn', // missing `break` in switch
      'no-constant-binary-expression': 'warn', // e.g. `x || {} ?? y`, always-truthy checks
      // sonarjs bug catchers
      'sonarjs/no-ignored-return': 'warn', // return value of a pure call discarded
      'sonarjs/no-element-overwrite': 'warn', // writing the same index/key twice
      'sonarjs/no-unused-collection': 'warn', // a collection is populated but never read
      'sonarjs/no-gratuitous-expressions': 'warn', // conditions that are always true/false
      'sonarjs/no-ignored-exceptions': 'warn', // empty catch swallows the error
      'sonarjs/no-collection-size-mischeck': 'warn', // `.length >= 0` and similar
      // unicorn safety
      'unicorn/no-await-in-promise-methods': 'warn', // `Promise.all([await x])` is a bug
      'unicorn/no-single-promise-in-promise-methods': 'warn',
      'unicorn/no-invalid-fetch-options': 'warn', // body with GET/HEAD
      'unicorn/error-message': 'warn', // `new Error()` with no message
      'unicorn/throw-new-error': 'warn', // `throw Error()` -> `throw new Error()`
      'unicorn/prefer-includes': 'warn', // `.indexOf(x) !== -1` -> `.includes(x)`

      // --- Team conventions ---
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'sonarjs/no-commented-code': 'warn', // delete dead code, git remembers
      'no-var': 'warn',
      'prefer-const': 'warn',

      // exhaustive-deps intentionally OFF (false-positive noise).

      // --- Tier 2 hardening (2026-07-20): type-aware rules ---
      // Requires typescript-eslint devDep + projectService above. All `warn`.
      '@typescript-eslint/no-floating-promises': 'warn', // unawaited promise, silent failure
      '@typescript-eslint/no-misused-promises': 'warn', // promise where a boolean/void is expected
      '@typescript-eslint/await-thenable': 'warn', // `await` on a non-promise (usually a bug)
      // no-unnecessary-condition: DROPPED. Requires strictNullChecks, which this
      // package's tsconfig has off (strict:false). Without it the rule can't tell
      // nullable from non-nullable, so every defensive `?.`/null-guard fires:
      // 3066 pure false positives. Re-enable if/when strict null checks land.
      // `import type` for type-only imports. disallowTypeAnnotations:false keeps
      // legitimate inline `import()` types (e.g. `typeof import('memjs')` for lazy
      // loads, `as import('geojson').X` casts) which aren't auto-fixable.
      '@typescript-eslint/consistent-type-imports': ['warn', { disallowTypeAnnotations: false }],
    },
  },
];
