'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { MapContext } from '../../../store'
import { useOrganizationMapStyles } from '../../viewers/map/utils/useOrganizationMapStyles'
import { useLatest } from '../useTourLayout'

import { DEMO_DELAY_MS } from './platformHost'

import type { MapStyle } from '../../../types/map'

/** The organization's map styles, and a demo that switches to the next one and back unless the person picks one meanwhile. */
export function useMapStyleTour() {
  const { dispatch } = React.useContext(MapContext)
  const { styles, current: shown } = useOrganizationMapStyles()
  const current = useLatest(shown)

  const picked = React.useRef(false)
  const apply = React.useCallback((mapStyle: MapStyle) => dispatch({ type: 'UPDATE_MAP_STYLE', payload: { mapStyle } }), [dispatch])

  const setMapStyle = React.useCallback((url: string) => {
    const style = styles.find(candidate => candidate.url === url)
    if (!style) return
    picked.current = true
    apply(style)
  }, [styles, apply])

  const demoMapStyle = React.useCallback(() => {
    const original = current.current
    picked.current = false
    let shown: MapStyle | undefined
    const timer = window.setTimeout(() => {
      shown = styles[(styles.findIndex(style => style.url === original.url) + 1) % styles.length]
      if (shown && shown.url !== original.url) apply(shown)
    }, DEMO_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      if (shown && !picked.current && current.current.url === shown.url) apply(original)
    }
  }, [styles, current, apply])

  return { mapStyles: styles, setMapStyle, demoMapStyle }
}
