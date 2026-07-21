import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import importPlugin from 'eslint-plugin-import';
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
      react,
      'jsx-a11y': jsxA11y,
      sonarjs,
      unicorn,
      import: importPlugin,
      '@typescript-eslint': tseslint.plugin,
    },
    settings: {
      // eslint-plugin-react needs the React version; detect from installed deps.
      react: { version: 'detect' },
      // Tier 3 (2026-07-20): let eslint-plugin-import resolve TS files and the
      // `@/*` path alias from tsconfig, so no-cycle / order don't false-report
      // on unresolved local imports.
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: { extensions: ['.js', '.mjs', '.ts', '.tsx', '.json'] },
      },
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

      // --- Tier 3 hardening (2026-07-20): import hygiene / cycle detection ---
      // Requires eslint-plugin-import devDep + the import/resolver settings above.
      // no-cycle is the real prize here: circular deps silently break ESM
      // tree-shaking (core's deep-import win) and have caused runtime ordering
      // bugs. ignoreExternal skips cycles that only pass through node_modules
      // (not ours to fix); maxDepth caps the traversal so lint stays tractable.
      // no-unresolved is the guard that keeps no-cycle honest: it fails loudly
      // if the resolver stops resolving local/`@/*` imports, so no-cycle can't
      // silently degrade to a false "0 cycles". Clean today (0 warnings).
      'import/no-unresolved': 'warn',
      'import/no-cycle': ['warn', { ignoreExternal: true, maxDepth: 6 }],
      // Ordering is autofixable, so it stays a formatter concern, not a review
      // burden. Alphabetized within groups, a blank line between groups; the
      // `@/*` alias is grouped as internal so it sorts after third-party deps.
      // `always-and-inside-groups` (not plain `always`): many files subdivide
      // their relative-import group with blank-separated section comments
      // (`// Custom hooks`, `// Utilities`). That intra-group spacing is
      // intentional and the fixer can't collapse it (comments block the fix),
      // so we allow blanks inside a group while still requiring them between
      // groups. Group order + alphabetization stay enforced.
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'after' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always-and-inside-groups',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // --- Tier 4 hardening (2026-07-21): typed correctness + React component-library safety ---
      // Zero runtime deps; the react-family plugins are now declared explicitly in
      // package.json (previously resolved transitively via eslint-config-next).
      // Candidates were measured against src/; FP-floods dropped (see end of block).
      //
      // Type-aware bug-catchers (extend the Tier 2 projectService spine):
      '@typescript-eslint/no-base-to-string': 'warn', // silent `[object Object]` in string context
      '@typescript-eslint/no-misused-spread': 'warn', // spreading a string/promise/etc where it's a bug
      '@typescript-eslint/unbound-method': 'warn', // unbound `this` method ref (classic React method-passing bug)
      '@typescript-eslint/prefer-promise-reject-errors': 'warn', // reject(non-Error) loses stack/type
      '@typescript-eslint/return-await': 'warn', // missing `return await` inside try/catch drops the catch
      '@typescript-eslint/no-for-in-array': 'warn', // `for..in` over an array yields string indices
      '@typescript-eslint/no-implied-eval': 'warn', // string-argument setTimeout/Function
      '@typescript-eslint/no-array-delete': 'warn', // `delete arr[i]` leaves a hole
      '@typescript-eslint/no-duplicate-type-constituents': 'warn', // duplicate union/intersection members
      '@typescript-eslint/only-throw-error': 'warn', // throwing a non-Error value
      '@typescript-eslint/restrict-plus-operands': 'warn', // `+` across mismatched/any operand types
      // React component-library safety (core ships components to ~16 consumer orgs):
      'react/jsx-key': 'warn', // missing `key` in a list render
      'react/no-unstable-nested-components': 'warn', // component defined during render (remount/perf bug)
      'react/jsx-no-constructed-context-values': 'warn', // fresh object/array as context value (perf bug)
      'react/no-direct-mutation-state': 'warn', // direct this.state mutation
      'react/jsx-no-target-blank': 'warn', // target="_blank" without rel=noopener (tabnabbing)
      // Accessibility regression guards (clean today, cheap insurance for a UI library):
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      // Evaluated and DROPPED (counts measured 2026-07-21 against src/):
      // - no-confusing-void-expression (525): stylistic flood (arrow bodies returning void), not bug-catching.
      // - no-unnecessary-type-assertion (210): under this pkg's strict:false tsconfig "unnecessary" is
      //   unreliable (null untracked); autofix would strip assertions that matter once strict null checks
      //   land. Revisit with a future strictNullChecks tier.
      // - react/no-array-index-key (62): benign for the many stable/static lists here.
      // - require-await (57): benign; async used for interface/API-shape consistency (cf. Tier 1 require-atomic-updates).
      // - restrict-template-expressions (11): mostly benign number/boolean interpolation.
    },
  },
];
