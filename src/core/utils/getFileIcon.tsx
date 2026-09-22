// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { iconForFile } from './fileIconsUtils'

import type { FileIconComponent } from './fileIconsUtils'
import type { DbFile } from '../types/dbTypes'

/** The icon for a stored file. Kept for callers that hold a whole row; `iconForFile` is the rule. */
export function getFileIcon(file: DbFile): FileIconComponent {
  return iconForFile(file)
}
