// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { typeOfRecord } from '../../../../ui/FilesManager/src/fileType'

import { FULL_PLACEMENT, SCALABLE_OBJECT_PLACEMENT, YAW_ONLY_PLACEMENT } from './placementTarget'

import type { PlacementCapabilities } from './placementTarget'
import type { DbFile } from '../../../../../types/dbTypes'

type Classifiable = Pick<DbFile, 'extension'> & Partial<Pick<DbFile, 'type' | 'mimeType'>>

/**
 * What a file's placement is allowed to change, decided in one place so the card, the viewport
 * menu and the adapters cannot disagree about it.
 */
export function capabilitiesForFile(file: Classifiable): PlacementCapabilities {
  const type = typeOfRecord(file as DbFile)
  if (type === 'point-cloud-file') return FULL_PLACEMENT
  if (type === '3d-file' || type === 'cad-file') return SCALABLE_OBJECT_PLACEMENT
  return YAW_ONLY_PLACEMENT
}

/** A survey of the whole building already carries its own coordinates, so picking a spot is meaningless. */
export function dropsAtOrigin(file: Classifiable): boolean {
  const type = typeOfRecord(file as DbFile)
  return type === 'point-cloud-file' || type === 'bim-file'
}
