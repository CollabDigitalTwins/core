'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { placementToast } from './placementToastMessage'

import type { PlacementState } from './placementCore'
import type { PlacementEvent } from './placementEvent'

/** Reports a finished placement edit. A Done that changed nothing never commits, so it stays quiet. */
export function usePlacementCommitToasts(onCommitted: PlacementEvent<PlacementState> | null) {
  const t = useTranslations('Placement')
  const announce = React.useRef(t)
  React.useEffect(() => { announce.current = t }, [t])

  React.useEffect(() => {
    if (!onCommitted) return

    const report = (state: PlacementState) => {
      const { tone, key } = placementToast(state.mode, state.ok !== false)
      toast[tone](announce.current(key, { name: state.name }))
    }

    onCommitted.add(report)
    return () => onCommitted.remove(report)
  }, [onCommitted])
}
