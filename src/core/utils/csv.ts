// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export type CsvCell = string | number | null | undefined

/** Quotes when needed and prefixes `'` to text that a spreadsheet would run as a formula. */
export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'number' ? String(Math.round(value * 1000) / 1000) : value
  const safe = /^[=+\-@\t\r]/.test(text) && typeof value === 'string' ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(header: readonly string[], rows: readonly CsvCell[][]): string {
  return [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')
}

/** Starts a browser download of text; the BOM makes Excel read UTF-8 names correctly. */
export function downloadText(content: string, filename: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['﻿', content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
