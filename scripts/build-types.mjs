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

const BASELINE = 11 // pre-existing type errors as of 2026-08-14 — only lower this

const res = spawnSync('npx', ['tsc', '-p', 'tsconfig.build.json'], {
  shell: true,
  encoding: 'utf8',
})
const out = `${res.stdout || ''}${res.stderr || ''}`
process.stdout.write(out)

// TS5033 ("Could not write file ... EPERM/EBUSY") is NOT a type error — it means a
// process is holding files in dist/ open so tsc can't overwrite them (a `tsup --watch`
// dev session, the VS Code TS server, the Windows Search indexer, or antivirus). On
// Windows these end up "delete-pending" and clear only when the handle closes. Count
// them separately so a transient file lock never masquerades as a type regression.
const writeErrors = (out.match(/error TS5033/g) || []).length
const typeErrors = (out.match(/error TS\d+/g) || []).length - writeErrors

if (writeErrors > 0) {
  console.error(
    `\n❌ ${writeErrors} declaration file(s) could not be written to dist/ (TS5033) — ` +
    `a FILE LOCK, not a type error. A process is holding dist/ open. ` +
    `Stop \`yarn dev:linked\` / tsup --watch, or reboot to release delete-pending handles, then rebuild.`,
  )
  process.exit(1)
}

if (typeErrors > BASELINE) {
  console.error(
    `\n❌ ${typeErrors} type errors — ${typeErrors - BASELINE} NEW beyond the baseline of ${BASELINE}. ` +
    `Fix the new error(s), or update BASELINE in scripts/build-types.mjs if intended.`,
  )
  process.exit(1)
}
if (typeErrors > 0) {
  console.warn(
    `\n⚠️  ${typeErrors} pre-existing type error(s) tolerated (baseline ${BASELINE}). ` +
    `.d.ts emitted best-effort. Run \`yarn build:types:strict\` to list them.`,
  )
}
process.exit(0)
