// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { isBimFile } from '../../bim/src/lib/bimFilesToLoad'

import { toggleBimToMap } from './toggleBimToMap'

import type { Building, DbFile } from '../../../../types/dbTypes'

interface MapDispatches {
  fileDispatch: (action: { type: 'ADD_TO_MAP', payload: { id: number } }) => void
  bimDispatch: Parameters<typeof toggleBimToMap>[0]
}

/**
 * Puts a newly placed file on the map through whichever store draws its kind: a model is
 * drawn from the BIM store, everything else from the file store.
 */
export function addFileToMap(
  file: DbFile,
  { fileDispatch, bimDispatch }: MapDispatches,
  building: Building | null = null,
): void {
  if (isBimFile(file)) {
    toggleBimToMap(bimDispatch, file, building)
    return
  }

  fileDispatch({ type: 'ADD_TO_MAP', payload: { id: file.id } })
}
