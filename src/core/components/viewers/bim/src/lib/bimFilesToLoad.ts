// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { DbFile } from '../../../../../types/dbTypes'

type ModelUIState = Record<number, { isVisible?: boolean; isGhost?: boolean } | undefined>

/** True for the formats the fragments loader can open. */
export function isBimFile(file: DbFile): boolean {
  const extension = file.extension?.toLowerCase()
  return extension === 'frag' || extension === 'ifc'
}

/**
 * The models a scene should hold: opted in on the record, and not switched off this
 * session — which stops a just-hidden model reloading before the write confirms.
 */
export function selectLoadableBimFiles(files: DbFile[], modelUIState: ModelUIState = {}): DbFile[] {
  return files.filter(file =>
    isBimFile(file)
    && file.isVisible === true
    && modelUIState[file.id]?.isVisible !== false)
}
