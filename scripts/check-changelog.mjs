#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins
//
// Fails when a change to the public surface of this package leaves CHANGELOG.md untouched.
// Every path under src/core/ is reachable through a `./*` subpath export, so a consumer can
// import it; a silent change there is a silent break. The changelog stopped being written
// after 0.4.5 and nine releases shipped undocumented, which is what this exists to prevent.
//
//   node scripts/check-changelog.mjs --range A..B      check a range (CI)
//   node scripts/check-changelog.mjs                   check the working tree against HEAD
//
// Escape hatch: put [skip changelog] in the pull request title or a commit subject. Use it
// for a change that genuinely has no consumer-visible effect and say why in the PR.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const CHANGELOG = 'CHANGELOG.md'
const UNRELEASED = '## [Unreleased]'
const SKIP_RE = /\[skip changelog\]/i

// src/core/** ships via `./*`, the packages publish separately, templates/ is what an author gets.
const PUBLIC_RE =
  /^(src\/core\/|packages\/plugin-kit\/src\/|packages\/create-cdt-plugin\/(src|templates)\/)/

// Changes here cannot reach a consumer, so they never require an entry.
const EXEMPT_RE = /(\.test\.[cm]?[jt]sx?$|\.spec\.[cm]?[jt]sx?$|\/__tests__\/|\/__mocks__\/|\/fixtures\/)/

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()

export function requiresEntry(paths) {
  return paths.filter(p => PUBLIC_RE.test(p) && !EXEMPT_RE.test(p))
}

function changedPaths(range) {
  const out = range
    ? git('diff', '--name-only', range)
    : git('diff', '--name-only', 'HEAD')
  return out ? out.split('\n').filter(Boolean) : []
}

function skipRequested(range) {
  if (SKIP_RE.test(process.env.PR_TITLE ?? '')) return true
  if (!range) return false
  const subjects = git('log', '--format=%s%n%b', range)
  return SKIP_RE.test(subjects)
}

function main() {
  const rangeFlag = process.argv.indexOf('--range')
  const range = rangeFlag === -1 ? null : process.argv[rangeFlag + 1]

  const paths = changedPaths(range)
  const needing = requiresEntry(paths)

  // --list makes the drafting skill and this check read the same surface definition.
  if (process.argv.includes('--list')) {
    for (const p of needing) console.log(p)
    return
  }

  if (needing.length === 0) {
    console.log('No public-surface changes; no changelog entry required.')
    return
  }

  if (skipRequested(range)) {
    console.log(`[skip changelog] honoured for ${needing.length} public-surface file(s).`)
    return
  }

  if (!existsSync(CHANGELOG)) fail(`${CHANGELOG} is missing.`, needing)
  if (!readFileSync(CHANGELOG, 'utf8').includes(UNRELEASED)) {
    fail(`${CHANGELOG} has no "${UNRELEASED}" section to add to.`, needing)
  }
  if (!paths.includes(CHANGELOG)) {
    fail(`${CHANGELOG} was not updated.`, needing)
  }

  console.log(`${CHANGELOG} updated alongside ${needing.length} public-surface file(s).`)
}

function fail(reason, needing) {
  const shown = needing.slice(0, 20)
  console.error(`\nChangelog check failed: ${reason}\n`)
  console.error('These changed files are reachable by a consumer:')
  for (const p of shown) console.error(`  ${p}`)
  if (needing.length > shown.length) console.error(`  ... and ${needing.length - shown.length} more`)
  console.error(`\nAdd an entry under "${UNRELEASED}" in ${CHANGELOG} using a Keep a Changelog`)
  console.error('heading (Added / Changed / Deprecated / Removed / Fixed / Security), plus')
  console.error('### Migration when a consumer must edit code to upgrade.')
  console.error('\nIf this change truly has no consumer-visible effect, put [skip changelog]')
  console.error('in the pull request title and say why in the description.\n')
  process.exit(1)
}

// pathToFileURL because Windows spellings never match; argv[1] is absent under -e and on import.
const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (entry && import.meta.url === entry) main()
