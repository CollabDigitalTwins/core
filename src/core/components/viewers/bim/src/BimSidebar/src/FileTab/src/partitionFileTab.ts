// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { SECTION_FOR_TYPE, typeOfRecord } from '../../../../../../../ui/FilesManager/src/fileType'

import type { DbFile } from '../../../../../../../../types/dbTypes'
import type { FileSection } from '../../../../../../../ui/FilesManager/src/fileType'

const EMPTY = (): Record<FileSection, DbFile[]> =>
  ({ bim: [], models: [], pointClouds: [], files: [] })

/** The map viewer's own markers and user avatars never belong to a building's File tab. */
const belongsToFileTab = (file: DbFile): boolean =>
  file.type?.toLowerCase() !== 'map-file' && file.tag !== 'user'

export function partitionFileTab(files: DbFile[]): Record<FileSection, DbFile[]> {
  const buckets = EMPTY()
  for (const file of files) {
    if (!belongsToFileTab(file)) continue
    buckets[SECTION_FOR_TYPE[typeOfRecord(file)]].push(file)
  }
  return buckets
}
