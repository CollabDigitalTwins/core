'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../../store/BIM/context'

import { BimPointClouds } from './index'

export interface BimPointCloudOpacity {
  opacityOf: (id: string) => number
  isGhosted: (id: string) => boolean
  setOpacity: (id: string, opacity: number) => void
  setGhosted: (id: string, ghosted: boolean) => void
}

/**
 * Reads and writes per-cloud opacity through the component, re-rendering on every change so the
 * settings slider and the sidebar's ghost toggle always show the same value.
 */
export function useBimPointCloudOpacity(): BimPointCloudOpacity {
  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim

  // The values live in the component; this only forces a read after it changes them.
  const [version, bumpVersion] = React.useReducer((current: number) => current + 1, 0)

  const component = React.useMemo(
    () => bimComponents?.get(BimPointClouds) ?? null,
    [bimComponents],
  )

  React.useEffect(() => {
    if (!component) return
    component.onOpacityChanged.add(bumpVersion)
    component.onAppearanceChanged.add(bumpVersion)
    return () => {
      component.onOpacityChanged.remove(bumpVersion)
      component.onAppearanceChanged.remove(bumpVersion)
    }
  }, [component])

  // `version` is in the deps so a memoising caller cannot keep reading a stale opacity.
  return React.useMemo(() => ({
    opacityOf: (id: string) => component?.opacityOf(id) ?? 1,
    isGhosted: (id: string) => component?.isGhosted(id) ?? false,
    setOpacity: (id: string, opacity: number) => component?.setOpacity(id, opacity),
    setGhosted: (id: string, ghosted: boolean) => component?.setGhosted(id, ghosted),
  }), [component, version])
}
