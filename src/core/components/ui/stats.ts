// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import React from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import Stats from 'three/examples/jsm/libs/stats.module.js'

interface StatsOverlayProps {
  mapRef: React.RefObject<MapRef>
  enabled: boolean
}

export function StatsOverlay({ mapRef, enabled }: StatsOverlayProps) {
  React.useEffect(() => {
    if (!enabled) return

    const stats = new Stats()
    stats.showPanel(0)

    // Wait until mapRef.current.getContainer() is available, then append
    const waitForContainer = () => {
      const container = mapRef.current?.getContainer()
      if (container) {
        // Style the stats DOM
        stats.dom.style.position = 'fixed'
        stats.dom.style.width = '85px'
        stats.dom.style.height = '50px'
        stats.dom.style.marginTop = `calc(100vh - 85px)`
        stats.dom.style.marginLeft = `calc(100vw - 100px)`

        document.body.append(stats.dom)
      }
      else {
        // Retry in 200ms
        setTimeout(waitForContainer, 200)
      }
    }
    waitForContainer()

    // Start the RAF loop
    let frameId: number
    const tick = () => {
      stats.begin()
      stats.end()
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(frameId)
      if (stats.dom.parentElement) {
        stats.dom.remove()
      }
    }
  }, [mapRef, enabled])

  return null
}
