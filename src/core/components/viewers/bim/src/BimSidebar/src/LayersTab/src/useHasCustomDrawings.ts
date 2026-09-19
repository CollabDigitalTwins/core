'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../../../../../store'

import { ElevationsTool } from '../../../../ElevationsTool'

import type { ElevationEntry } from '../../../../ElevationsTool'

/** Whether any plane-cut drawing exists, so the Custom tab comes and goes with them. */
export function useHasCustomDrawings(): boolean {
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim

  const [hasCustom, setHasCustom] = React.useState(false)

  React.useEffect(() => {
    if (!bimComponents) return
    const tool = bimComponents.get(ElevationsTool)

    const update = (entries: ElevationEntry[]) =>
      setHasCustom(entries.some((entry) => entry.planeKey !== undefined))

    update(tool.elevations)
    tool.onElevationsChanged.add(update)
    return () => tool.onElevationsChanged.remove(update)
  }, [bimComponents])

  return hasCustom
}
