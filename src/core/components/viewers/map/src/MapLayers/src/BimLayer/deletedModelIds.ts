// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { DbFile } from '../../../../../../../types/dbTypes'

/** Ids of on-map models whose file was in the previous list and is gone from the current one. */
export function deletedModelIds(
  models: { bimFile: Pick<DbFile, 'id'> }[],
  previousFileIds: ReadonlySet<number> | null,
  currentFileIds: ReadonlySet<number>,
): string[] {
  if (!previousFileIds) return []
  return models
    .map(model => model.bimFile.id)
    .filter(id => previousFileIds.has(id) && !currentFileIds.has(id))
    .map(String)
}
