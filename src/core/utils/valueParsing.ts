// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

const TRUE_WORDS = new Set(['true', 'yes', 'y', '1', 'oui', 'si', 'sí', 't'])
const FALSE_WORDS = new Set(['false', 'no', 'n', '0', 'non', 'f'])

/** A number from a number or a formatted numeric string (`$1,200`, `45 %`); null for anything else. */
export function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[$%\s]/g, '').replace(/,/g, '')
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

/** A boolean from a boolean, 0/1, or a yes/no style word in English, French or Spanish; null otherwise. */
export function parseBooleanValue(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === 0) return value === 1
  if (typeof value !== 'string') return null
  const word = value.trim().toLowerCase()
  if (TRUE_WORDS.has(word)) return true
  if (FALSE_WORDS.has(word)) return false
  return null
}

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
}
