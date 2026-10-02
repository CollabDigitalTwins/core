// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

interface ParsedVersion {
  core: [number, number, number]
  prerelease: string[]
}

function parse(version: string): ParsedVersion | null {
  const match = SEMVER.exec(version.trim())
  if (!match) return null
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ? match[4].split('.') : [],
  }
}

export function isValidVersion(version: string): boolean {
  return parse(version) !== null
}

function compareIdentifiers(a: string, b: string): number {
  const aNumeric = /^\d+$/.test(a)
  const bNumeric = /^\d+$/.test(b)
  if (aNumeric && bNumeric) return Number(a) - Number(b)
  if (aNumeric) return -1
  if (bNumeric) return 1
  return a < b ? -1 : a > b ? 1 : 0
}

function comparePrerelease(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return b.length - a.length
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    if (a[index] === undefined) return -1
    if (b[index] === undefined) return 1
    const order = compareIdentifiers(a[index], b[index])
    if (order !== 0) return order
  }
  return 0
}

/** Negative when `a` is older than `b`, positive when newer; invalid versions sort first. */
export function compareVersions(a: string, b: string): number {
  const left = parse(a)
  const right = parse(b)
  if (!left || !right) return (left ? 1 : 0) - (right ? 1 : 0)

  for (let index = 0; index < 3; index++) {
    const order = left.core[index] - right.core[index]
    if (order !== 0) return order
  }
  return comparePrerelease(left.prerelease, right.prerelease)
}

export function highestVersion<T extends { version: string }>(rows: T[]): T | null {
  return rows.reduce<T | null>(
    (best, row) => (!best || compareVersions(row.version, best.version) > 0 ? row : best),
    null,
  )
}
