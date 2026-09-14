#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins
//
// Fails when a change to a public surface leaves that surface's changelog untouched.
// Every path under src/core/ is reachable through a `./*` subpath export, so a consumer can
// import it; a silent change there is a silent break. The changelog stopped being written
// after 0.4.5 and nine releases shipped undocumented, which is what this exists to prevent.
//
// Each surface answers to its own changelog. plugin-kit and create-cdt-plugin version and
// publish independently of core, so a kit change has no honest heading in a file whose next
// version is core's -- pointing them all at one file is how a kit change lands under core's
// [Unreleased] and ships to npm undocumented anyway.
//
//   node scripts/check-changelog.mjs --range A..B      check a range (CI)
//   node scripts/check-changelog.mjs                   check the working tree against HEAD
//
// Escape hatch: put [skip changelog] in the pull request title or a commit subject. Use it
// for a change that genuinely has no consumer-visible effect and say why in the PR.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const UNRELEASED = '## [Unreleased]'
const SKIP_RE = /\[skip changelog\]/i

// src/core/** ships via `./*`, the packages publish separately, templates/ is what an author gets.
const AREAS = [
  { re: /^src\/core\//, changelog: 'CHANGELOG.md' },
  { re: /^packages\/plugin-kit\/src\//, changelog: 'packages/plugin-kit/CHANGELOG.md' },
  {
    re: /^packages\/create-cdt-plugin\/(src|templates)\//,
    changelog: 'packages/create-cdt-plugin/CHANGELOG.md',
  },
]

// Changes here cannot reach a consumer, so they never require an entry.
const EXEMPT_RE = /(\.test\.[cm]?[jt]sx?$|\.spec\.[cm]?[jt]sx?$|\/__tests__\/|\/__mocks__\/|\/fixtures\/)/

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()

export function requiresEntry(paths) {
  return paths.filter(p => AREAS.some(area => area.re.test(p)) && !EXEMPT_RE.test(p))
}

/** Groups changed paths by the changelog each one is answerable to. */
export function groupByChangelog(paths) {
  const groups = new Map()
  for (const path of requiresEntry(paths)) {
    const { changelog } = AREAS.find(area => area.re.test(path))
    groups.set(changelog, [...groups.get(changelog) ?? [], path])
  }
  return groups
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
  const groups = groupByChangelog(paths)
  const total = [...groups.values()].reduce((count, files) => count + files.length, 0)

  // --list makes the drafting skill and this check read the same surface definition.
  if (process.argv.includes('--list')) {
    for (const [changelog, files] of groups) {
      for (const path of files) console.log(`${changelog}\t${path}`)
    }
    return
  }

  if (total === 0) {
    console.log('No public-surface changes; no changelog entry required.')
    return
  }

  if (skipRequested(range)) {
    console.log(`[skip changelog] honoured for ${total} public-surface file(s).`)
    return
  }

  // Every area is checked before anything is reported, so a pull request touching two of them
  // hears about both at once rather than one failed run at a time.
  const problems = [...groups]
    .map(([changelog, files]) => ({ changelog, files, reason: reasonMissing(changelog, paths) }))
    .filter(problem => problem.reason)

  if (problems.length > 0) fail(problems)

  console.log(`${groups.size} changelog(s) updated alongside ${total} public-surface file(s).`)
}

function reasonMissing(changelog, paths) {
  if (!existsSync(changelog)) return 'is missing'
  if (!readFileSync(changelog, 'utf8').includes(UNRELEASED)) {
    return `has no "${UNRELEASED}" section to add to`
  }
  if (!paths.includes(changelog)) return 'was not updated'
  return null
}

function fail(problems) {
  console.error('\nChangelog check failed.\n')
  for (const { changelog, files, reason } of problems) {
    const shown = files.slice(0, 20)
    console.error(`${changelog} ${reason}, but these changed files are reachable through it:`)
    for (const path of shown) console.error(`  ${path}`)
    if (files.length > shown.length) console.error(`  ... and ${files.length - shown.length} more`)
    console.error('')
  }
  console.error(`Add an entry under "${UNRELEASED}" in each, using a Keep a Changelog heading`)
  console.error('(Added / Changed / Deprecated / Removed / Fixed / Security), plus')
  console.error('### Migration when a consumer must edit code to upgrade.')
  console.error('\nIf this change truly has no consumer-visible effect, put [skip changelog]')
  console.error('in the pull request title and say why in the description.\n')
  process.exit(1)
}

// pathToFileURL because Windows spellings never match; argv[1] is absent under -e and on import.
const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (entry && import.meta.url === entry) main()
