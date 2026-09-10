// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { FileSection } from '../../../../../../../ui/FilesManager/src/fileType'

/** Sections open by default only when they hold something, until the user says otherwise. */
export function resolveOpenSections(
  explicit: Partial<Record<FileSection, boolean>>,
  counts: Record<FileSection, number>,
): Record<FileSection, boolean> {
  const resolved = {} as Record<FileSection, boolean>
  for (const id of Object.keys(counts) as FileSection[]) {
    resolved[id] = explicit[id] ?? counts[id] > 0
  }
  return resolved
}
