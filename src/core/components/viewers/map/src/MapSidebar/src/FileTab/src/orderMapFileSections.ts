// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { FileSection } from '../../../../../../../ui/FilesManager/src/fileType'

/** Section order with the collapsed ones sunk to the bottom, each group stable. */
export function orderMapFileSections(
  ids: readonly FileSection[],
  open: Record<FileSection, boolean>,
): FileSection[] {
  return [...ids.filter(id => open[id]), ...ids.filter(id => !open[id])]
}
