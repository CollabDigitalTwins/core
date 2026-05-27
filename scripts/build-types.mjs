// Emit .d.ts via tsc with a "ratchet" on known pre-existing type errors.
//
// The codebase carries type errors that the app masks via next.config
// `ignoreBuildErrors: true`. tsc still EMITS every declaration regardless
// (noEmitOnError defaults to false), so the published types are complete;
// the erroring expressions just fall back to looser types.
//
// To get a usable `yarn build` without silently hiding regressions, we
// tolerate up to BASELINE errors but FAIL on any NEW one. Lower BASELINE as
// errors are fixed (run `yarn build:types:strict` to see the full list).
import { spawnSync } from 'node:child_process'

const BASELINE = 13 // pre-existing type errors as of 2026-05-27 — only lower this

const res = spawnSync('npx', ['tsc', '-p', 'tsconfig.build.json'], {
  shell: true,
  encoding: 'utf8',
})
const out = `${res.stdout || ''}${res.stderr || ''}`
process.stdout.write(out)

const count = (out.match(/error TS\d+/g) || []).length

if (count > BASELINE) {
  console.error(
    `\n❌ ${count} type errors — ${count - BASELINE} NEW beyond the baseline of ${BASELINE}. ` +
    `Fix the new error(s), or update BASELINE in scripts/build-types.mjs if intended.`,
  )
  process.exit(1)
}
if (count > 0) {
  console.warn(
    `\n⚠️  ${count} pre-existing type error(s) tolerated (baseline ${BASELINE}). ` +
    `.d.ts emitted best-effort. Run \`yarn build:types:strict\` to list them.`,
  )
}
process.exit(0)
