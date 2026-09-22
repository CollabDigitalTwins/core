// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { partitionBySection } from '../../../../../../../ui/FilesManager/src/fileType'

import type { DbFile } from '../../../../../../../../types/dbTypes'
import type { FileSection } from '../../../../../../../ui/FilesManager/src/fileType'

/** The map viewer's own markers and user avatars never belong to a building's File tab. */
const belongsToFileTab = (file: DbFile): boolean =>
  file.type?.toLowerCase() !== 'map-file' && file.tag !== 'user'

export function partitionFileTab(files: DbFile[]): Record<FileSection, DbFile[]> {
  return partitionBySection(files.filter(belongsToFileTab))
}
