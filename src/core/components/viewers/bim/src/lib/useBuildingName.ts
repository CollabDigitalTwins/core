// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { BimContext } from '../../../../../store'

/**
 * Hook returning a function that resolves the building/file display name
 * for a given `modelId`. The model's loaded file lives in either
 * `bimState.bim.buildingModel.bimFile` (single-model viewer) or
 * `bimState.bim.bimModelsAddedToMap[]` (multi-model). We fall back to the
 * raw modelId so the caller never gets `null`.
 *
 * The returned name is stripped of its file extension (".frag", ".ifc",
 * etc.) so it can be safely composed into a download filename.
 */
export function useBuildingName(): (modelId: string) => string {
  const { state: bimState } = React.useContext(BimContext)
  const { buildingModel, bimModelsAddedToMap } = bimState.bim

  return React.useCallback(
    (modelId: string) => {
      const idStr = String(modelId)
      const fromMap = bimModelsAddedToMap.find(
        (m) => String(m.bimFile.id) === idStr,
      )
      if (fromMap) return stripExtension(fromMap.bimFile.name)
      const single = buildingModel.bimFile
      if (single && String(single.id) === idStr) {
        return stripExtension(single.name)
      }
      return idStr
    },
    [buildingModel, bimModelsAddedToMap],
  )
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return name
  return name.slice(0, dot)
}
