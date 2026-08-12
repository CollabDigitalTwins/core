#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins
//
// Adds (or, with --check, verifies) SPDX license headers on source files. Idempotent.
//
//   node scripts/add-license-headers.mjs            add a header to any file missing one
//   node scripts/add-license-headers.mjs --check    exit non-zero if any file lacks one (CI)
//
// A "use client" / "use server" directive has to stay the first statement for the
// React/Next.js bundler, so the header goes after it rather than at the top.

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, extname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')

// `packages/` as well as `src/`: SPDX is a repo rule, not a src/ rule, and a missing
// header under packages/ was already caught by a human reading a diff — exactly what this
// script exists to make unnecessary.
const ROOTS = [join(ROOT, 'src'), join(ROOT, 'packages')].filter(dir => existsSync(dir))

// Never entered: dependencies and build output are not ours to license, and the
// fixture plugins under packages/*/fixtures are stand-ins for a third party's
// code, which carries its own.
const SKIP_DIRECTORIES = new Set(['node_modules', 'dist', 'fixtures'])

const EXTENSIONS = new Set(['.ts', '.tsx', '.mjs'])
const SPDX_TAG = 'SPDX-License-Identifier'

const HEADER_LINES = [
  '// SPDX-License-Identifier: AGPL-3.0-or-later',
  '// Copyright (C) 2025 Collab Digital Twins',
]

// Leading "use client" / "use server" directive, including its trailing newline.
const DIRECTIVE_RE = /^(﻿?[ \t]*['"]use (?:client|server)['"];?[ \t]*\r?\n)/

const checkOnly = process.argv.includes('--check')

function walk(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) files.push(...walk(full))
    } else if (EXTENSIONS.has(extname(entry.name))) files.push(full)
  }
  return files
}

function hasHeader(content) {
  return content.slice(0, 600).includes(SPDX_TAG)
}

function addHeader(content) {
  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const header = HEADER_LINES.join(eol) + eol

  const match = content.match(DIRECTIVE_RE)
  const directive = match ? match[0] : ''
  // Body without the directive, with any leading blank lines trimmed for clean spacing.
  const body = content.slice(directive.length).replace(/^(?:[ \t]*\r?\n)+/, '')

  return directive
    ? directive + eol + header + eol + body
    : header + eol + body
}

const files = ROOTS.flatMap(walk)
const missing = []

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  if (hasHeader(content)) continue
  missing.push(file)
  if (!checkOnly) writeFileSync(file, addHeader(content))
}

if (checkOnly) {
  if (missing.length) {
    console.error(`✗ ${missing.length} of ${files.length} source files are missing an SPDX header:`)
    for (const f of missing.slice(0, 50)) console.error('   ' + relative(ROOT, f))
    if (missing.length > 50) console.error(`   …and ${missing.length - 50} more`)
    process.exit(1)
  }
  console.log(`✓ All ${files.length} source files carry an SPDX header.`)
} else {
  console.log(`✓ Scanned ${files.length} source files; added headers to ${missing.length}.`)
}
