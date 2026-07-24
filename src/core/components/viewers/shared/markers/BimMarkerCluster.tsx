'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { Avatar } from '../../../ui/Avatar'
import { UserAvatar } from '../../../ui/UserAvatar'

import type { ClusterMember } from './types'

interface BimMarkerClusterProps {
  members: ClusterMember[]
  highlight?: boolean
  onSelect?: (id: number) => void
  onFocus?: (id: number) => void
}

/** Cluster bubble colour, matching the map comment cluster palette (mapLayersUtils). */
function clusterColor(count: number): string {
  if (count >= 750) return '#f28cb1'
  if (count >= 100) return '#f1f075'
  return '#51bbd6'
}

/**
 * Rendered inside a CSS2DObject at a cluster's world center. Shows a numbered circle for
 * overlapping BIM markers; hovering fans the members out (animated) so each can be
 * seen and clicked, and collapses back on mouse-out. A short close delay keeps the fan open
 * while the pointer crosses the gap between the bubble and a member (same trick the map
 * cluster expansion uses), so members stay clickable. Members mount only while expanded, so a
 * collapsed cluster is just the bubble — no leftover container behind it.
 */
export function BimMarkerCluster({ members, highlight = false, onSelect, onFocus }: BimMarkerClusterProps): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false)
  const [fanned, setFanned] = React.useState(false)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const count = members.length
  const radius = Math.min(64, 26 + count * 4)

  // Animate the fan: members mount at the centre, then move out to their radius on the next frame.
  React.useEffect(() => {
    if (!expanded) {
      setFanned(false)
      return
    }
    const raf = requestAnimationFrame(() => setFanned(true))
    return () => cancelAnimationFrame(raf)
  }, [expanded])

  React.useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  const open = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setExpanded(true)
  }

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setExpanded(false), 150)
  }

  return (
    <div
      className="relative -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
    >
      <div
        className="relative flex items-center justify-center rounded-full text-sm font-medium select-none cursor-pointer"
        style={{
          width: 36,
          height: 36,
          backgroundColor: clusterColor(count),
          color: '#000',
          textShadow: '0 0 2px #fff, 0 0 2px #fff',
          boxShadow: highlight
            ? '0 0 0 2px #73cee2, 0 0 8px rgba(115, 206, 226, 0.5)'
            : '0 0 0 1px white',
        }}
      >
        {count}
      </div>

      {expanded && (
        <div className="absolute left-1/2 top-1/2">
          {members.map((member, i) => {
            const angle = (2 * Math.PI * i) / count - Math.PI / 2
            const x = fanned ? Math.cos(angle) * radius : 0
            const y = fanned ? Math.sin(angle) * radius : 0
            return (
              <div
                key={member.id}
                className="absolute"
                style={{
                  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                  opacity: fanned ? 1 : 0,
                  transition: 'transform 200ms ease, opacity 200ms ease',
                  transitionDelay: `${i * 20}ms`,
                }}
                onMouseEnter={open}
                // pointerdown (not click): the CSS2D renderer re-transforms this element every
                // frame and it is still animating out, so a browser click frequently never fires.
                onPointerDown={(e) => {
                  e.stopPropagation()
                  onSelect?.(member.id)
                  onFocus?.(member.id)
                }}
              >
                <div
                  className="h-9 w-9 rounded-full overflow-hidden cursor-pointer bg-card"
                  style={{ boxShadow: '0 0 0 1px white' }}
                >
                  <Avatar className="h-full w-full">
                    <UserAvatar
                      imageFileId={member.imageFileId ?? null}
                      name={member.userName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </Avatar>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
