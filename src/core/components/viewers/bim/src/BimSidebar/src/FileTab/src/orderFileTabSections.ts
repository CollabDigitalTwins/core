// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { FileSection } from '../../../../../../../ui/FilesManager/src/fileType'

/** The user's section order with the empty sections sunk to the bottom, each group stable. */
export function orderFileTabSections(
  order: readonly FileSection[],
  counts: Record<FileSection, number>,
): FileSection[] {
  return [
    ...order.filter(id => counts[id] > 0),
    ...order.filter(id => !(counts[id] > 0)),
  ]
}
