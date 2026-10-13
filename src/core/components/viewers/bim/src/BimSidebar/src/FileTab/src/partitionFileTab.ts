// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { isMapFile, partitionBySection } from '../../../../../../../ui/FilesManager/src/fileType'

import type { DbFile } from '../../../../../../../../types/dbTypes'
import type { FileSection } from '../../../../../../../ui/FilesManager/src/fileType'

const isLooseMapFile = (file: DbFile): boolean => isMapFile(file) && file.attachedFilesBuildingId == null

const belongsToFileTab = (file: DbFile): boolean =>
  !isLooseMapFile(file) && file.tag !== 'user'

export function partitionFileTab(files: DbFile[]): Record<FileSection, DbFile[]> {
  return partitionBySection(files.filter(belongsToFileTab))
}
