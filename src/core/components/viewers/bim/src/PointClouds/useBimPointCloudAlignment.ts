'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../../store/BIM/context'

import { PointCloudAlignment } from './PointCloudAlignment'

import type { AlignmentState } from './PointCloudAlignment'

/** Mirrors the live alignment session into React. The component owns it; this reads. */
export function useBimPointCloudAlignment(): AlignmentState | null {
  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim
  const [session, setSession] = React.useState<AlignmentState | null>(null)

  React.useEffect(() => {
    if (!bimComponents) {
      setSession(null)
      return
    }

    const alignment = bimComponents.get(PointCloudAlignment)
    const publish = (next: AlignmentState | null) => setSession(next)
    const current = alignment.placement()
    setSession(alignment.activeId && current ? { id: alignment.activeId, placement: current } : null)

    alignment.onChanged.add(publish)
    return () => alignment.onChanged.remove(publish)
  }, [bimComponents])

  return session
}
