'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../store'

import { CameraNavigation } from './CameraNavigation'

import type { CameraNavigationState } from './CameraNavigation'

/** Mirrors the component's state into React. Null until the world has been built. */
export function useCameraNavigation() {
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim

  const navigation = React.useMemo(
    () => bimComponents?.get(CameraNavigation) ?? null,
    [bimComponents],
  )

  const [navState, setNavState] = React.useState<CameraNavigationState | null>(null)

  React.useEffect(() => {
    if (!navigation) {
      setNavState(null)
      return
    }
    setNavState(navigation.state)
    const publish = (next: CameraNavigationState) => setNavState(next)
    navigation.onChanged.add(publish)
    return () => navigation.onChanged.remove(publish)
  }, [navigation])

  return { navigation, navState }
}
