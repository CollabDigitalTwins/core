// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Building, DbFile } from '../../../../types/dbTypes'

type BimDispatch = (action: {
  type: 'TOGGLE_BIM_TO_MAP'
  payload: {
    buildingModel: {
      bimFile: DbFile
      building: Building | null
    }
  }
}) => void

export function toggleBimToMap(
  bimDispatch: BimDispatch,
  bimFile: DbFile,
  building: Building | null,
) {
  if (!building) return

  bimDispatch({
    type: 'TOGGLE_BIM_TO_MAP',
    payload: {
      buildingModel: {
        bimFile,
        building,
      },
    },
  })
}