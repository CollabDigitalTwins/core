'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { PlacementEditor } from './PlacementEditor'
import { placementToast } from './placementToastMessage'

import type * as OBC from '@thatopen/components'

/**
 * Reports every finished placement edit, whatever kind of object it was. The editor only
 * announces a commit that changed something, so a Done that moved nothing stays quiet.
 */
export function usePlacementToasts(components: OBC.Components | null) {
  const t = useTranslations('Placement')
  const announce = React.useRef(t)
  React.useEffect(() => { announce.current = t }, [t])

  React.useEffect(() => {
    if (!components) return

    let editor: PlacementEditor
    try { editor = components.get(PlacementEditor) }
    catch { return }

    const report = (state: { name: string, mode: 'translate' | 'rotate' | 'scale', ok?: boolean }) => {
      const { tone, key } = placementToast(state.mode, state.ok !== false)
      toast[tone](announce.current(key, { name: state.name }))
    }

    editor.onCommitted.add(report)
    return () => editor.onCommitted.remove(report)
  }, [components])
}
