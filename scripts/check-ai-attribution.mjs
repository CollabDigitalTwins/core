#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins
//
// Fails when a commit credits an AI assistant as an author or co-author. The contributor
// graph of this repository is read by people evaluating the project, so authorship stays
// human; an assistant belongs in the pull request description, not the commit trailer.
//
//   node scripts/check-ai-attribution.mjs                        check HEAD
//   node scripts/check-ai-attribution.mjs --range A..B           check every commit in a range (CI)
//   node scripts/check-ai-attribution.mjs --message-file FILE    check one message (commit-msg hook)
//
// Only attribution positions are inspected -- trailers, generator footers, and the
// author/committer identities. Prose is left alone, so "fix: drop the claude trailers"
// is a perfectly legal commit message.

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

// Vendors and assistants seen crediting themselves in git metadata. Extend this list
// rather than loosening the patterns: a bare /\bbot\b/ would flag dependabot, which is
// a legitimate co-author.
const AI_IDENTITIES = [
  /\banthropic\b/i,
  /\bclaude\b/i,
  /\bopenai\b/i,
  /\bchatgpt\b/i,
  /\bgpt-\d/i,
  /\bcodex\b/i,
  /\bcopilot\b/i,
  /\bgemini\b/i,
  /\bbard\b/i,
  /\bcursor\b/i,
  /\bdevin\b/i,
  /\baider\b/i,
  /\bcodeium\b/i,
  /\bwindsurf\b/i,
  /\bllama\b/i,
  /\bmistral\b/i,
  /\bperplexity\b/i,
  /\bcody\b/i,
  /\btabnine\b/i,
  /\bcodewhisperer\b/i,
  /\bamazon q\b/i,
]

const TRAILER_RE =
  /^[ \t]*(co-authored-by|co-committed-by|assisted-by|generated-by|on-behalf-of)[ \t]*:[ \t]*(.+)$/i
const GENERATOR_RE = /generated (?:with|by)\b/i

const isAi = value => AI_IDENTITIES.some(pattern => pattern.test(value))

// Returns the offending lines of one commit message, empty when it is clean.
export function findAiAttribution(message) {
  const findings = []
  for (const line of message.split(/\r?\n/)) {
    const trailer = line.match(TRAILER_RE)
    if (trailer && isAi(trailer[2])) findings.push(line.trim())
    else if (GENERATOR_RE.test(line) && isAi(line)) findings.push(line.trim())
  }
  return findings
}

const git = args => execFileSync('git', args, { encoding: 'utf8' })

function readCommits(range) {
  const shas = git(['log', '--format=%H', ...(range ? [range] : ['-1', 'HEAD'])]).split('\n').filter(Boolean)
  return shas.map(sha => ({
    sha,
    author: git(['show', '-s', '--format=%an <%ae>', sha]).trim(),
    committer: git(['show', '-s', '--format=%cn <%ce>', sha]).trim(),
    message: git(['show', '-s', '--format=%B', sha]),
  }))
}

function checkCommit({ sha, author, committer, message }) {
  const findings = findAiAttribution(message)
  if (isAi(author)) findings.push(`author: ${author}`)
  if (isAi(committer)) findings.push(`committer: ${committer}`)
  return findings.length ? { sha, findings } : null
}

const argument = flag => {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

const messageFile = argument('--message-file')
const range = argument('--range')

const offenders = messageFile
  ? [{ sha: 'the commit being written', findings: findAiAttribution(readFileSync(messageFile, 'utf8')) }].filter(
      entry => entry.findings.length,
    )
  : readCommits(range).map(checkCommit).filter(Boolean)

if (offenders.length) {
  console.error(`✗ AI attribution found in ${offenders.length} commit(s):\n`)
  for (const { sha, findings } of offenders) {
    console.error(`  ${sha}`)
    for (const finding of findings) console.error(`    ${finding}`)
  }
  console.error('\nAuthorship in this repository stays human. Remove the line and amend the commit')
  console.error('(git commit --amend), or rebase to drop it from earlier commits. Credit the')
  console.error('assistant in the pull request description instead.')
  process.exit(1)
}

const scope = messageFile ? 'the commit message' : range ? `commits in ${range}` : 'HEAD'
console.log(`✓ No AI attribution in ${scope}.`)
