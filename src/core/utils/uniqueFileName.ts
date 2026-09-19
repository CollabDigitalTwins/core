// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Disambiguates a clash as `plan (1).dxf`. Scene objects resolve to DB records by name. */
export function uniqueFileName(name: string, existingNames: string[]): string {
  const taken = new Set(existingNames)
  if (!taken.has(name)) return name

  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const extension = dot > 0 ? name.slice(dot) : ''

  let counter = 1
  while (taken.has(`${stem} (${counter})${extension}`)) counter++
  return `${stem} (${counter})${extension}`
}
