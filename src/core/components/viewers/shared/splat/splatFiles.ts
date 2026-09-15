// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { DbFile } from '../../../../types/dbTypes'

export const SPLAT_EXTENSIONS = ['ply', 'spz', 'splat', 'ksplat', 'sog'] as const

/** For a file input's `accept`. */
export const SPLAT_ACCEPT = '.ply,.spz,.splat,.ksplat,.sog'

const SPLAT_TYPE = 'splat-file'

export function isSplatExtension(extension: string | null | undefined): boolean {
  if (!extension) return false
  return (SPLAT_EXTENSIONS as readonly string[]).includes(extension.toLowerCase())
}

/**
 * Which files Spark can render. Either signal is enough: an upload records the
 * type, while a file added through a generic path only carries an extension.
 */
export function isSplatFile(file: DbFile): boolean {
  return file.type?.toLowerCase() === SPLAT_TYPE || isSplatExtension(file.extension)
}

/**
 * Splat ids to switch on: the visible ones `seen` has not claimed yet, which it then claims.
 * Claiming every splat, visible or not, is what keeps a refetch from re-adding a hidden one.
 */
export function claimSplatIds(files: DbFile[], seen: Set<string>): string[] {
  const visible: string[] = []
  for (const file of files) {
    if (!isSplatFile(file)) continue
    const id = String(file.id)
    if (seen.has(id)) continue
    seen.add(id)
    if (file.isVisible === true) visible.push(id)
  }
  return visible
}

/** Spark's `SplatFileType` values, as literals so only the loader ever imports Spark. */
export type SplatFileType = 'ply' | 'spz' | 'splat' | 'ksplat' | 'pcsogszip'

const FILE_TYPES: Record<string, SplatFileType> = {
  ply: 'ply',
  spz: 'spz',
  splat: 'splat',
  ksplat: 'ksplat',
  sog: 'pcsogszip',
}

/**
 * Names the decoder for an extension. Assets are stored under an extensionless UUID,
 * so Spark cannot infer this from the download URL and throws if left to guess.
 */
export function splatFileType(extension: string | null | undefined): SplatFileType | undefined {
  if (!extension) return undefined
  return FILE_TYPES[extension.toLowerCase()]
}
