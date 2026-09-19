'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../../store/BIM/context'

import { BimSplats } from './index'

import type { LoadedSplat } from '../../../shared/splat/splatRegistry'

/** Mirrors the splats `BimSplats` actually holds into React state. It owns them; this reads. */
export function useBimSplats(): LoadedSplat[] {
  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim
  const [splats, setSplats] = React.useState<LoadedSplat[]>([])

  React.useEffect(() => {
    if (!bimComponents) {
      setSplats([])
      return
    }

    const component = bimComponents.get(BimSplats)
    const publish = () => setSplats(component.list())
    publish()

    component.onChanged.add(publish)
    return () => component.onChanged.remove(publish)
  }, [bimComponents])

  return splats
}
