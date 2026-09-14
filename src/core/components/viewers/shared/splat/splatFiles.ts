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
