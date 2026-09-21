'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useUploadTasks } from './uploadProgress'

export const VIEWBOX = 40
export const RING_STROKE = 3

/** Pixels the ring reaches past the pin's own box, so it reads as a ring and not as the pin's rim. */
export const OVERHANG = 3

/** Flush with the ring box's edge: half the stroke sits either side of the circle. */
const RADIUS = VIEWBOX / 2 - RING_STROKE / 2

export const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// The converting phase reports no percentage, so an arc of this length spins instead of sitting at zero.
const INDETERMINATE_FRACTION = 0.25

/** How much of the ring to leave undrawn, as an SVG stroke-dashoffset. */
export function arcOffset(progress: number | null): number {
  if (progress == null) return CIRCUMFERENCE * (1 - INDETERMINATE_FRACTION)
  const clamped = Math.min(100, Math.max(0, progress))
  return CIRCUMFERENCE * (1 - clamped / 100)
}

/** Which pin the ring sits on: a filled primary pin, or a light surface one like the map's. */
export type MarkerRingTone = 'onPrimary' | 'onSurface'

const TONE: Record<MarkerRingTone, { track: string, arc: string }> = {
  onPrimary: { track: 'stroke-primary-foreground/25', arc: 'stroke-primary-foreground' },
  onSurface: { track: 'stroke-primary/20', arc: 'stroke-primary' },
}

interface MarkerProgressRingProps {
  progress: number | null
  tone?: MarkerRingTone
}

/**
 * The ring around an uploading pin, the size of the pin itself. Its box is inline because a
 * consumer's Tailwind build may never generate a utility class only this package uses.
 */
export function MarkerProgressRing({ progress, tone = 'onPrimary' }: MarkerProgressRingProps) {
  const spinning = progress == null
  const { track, arc } = TONE[tone]

  const box: React.CSSProperties = {
    position: 'absolute',
    top: -OVERHANG,
    left: -OVERHANG,
    width: `calc(100% + ${OVERHANG * 2}px)`,
    height: `calc(100% + ${OVERHANG * 2}px)`,
    pointerEvents: 'none',
  }

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      className={spinning ? 'animate-spin' : undefined}
      style={spinning ? box : { ...box, transform: 'rotate(-90deg)' }}
    >
      <circle cx={VIEWBOX / 2} cy={VIEWBOX / 2} r={RADIUS} fill="none" strokeWidth={RING_STROKE} className={track} />
      <circle
        cx={VIEWBOX / 2}
        cy={VIEWBOX / 2}
        r={RADIUS}
        fill="none"
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={arcOffset(progress)}
        className={arc}
        style={{ transition: 'stroke-dashoffset 200ms ease-out' }}
      />
    </svg>
  )
}

/** Finds the pin's own upload task by name, so only a pin that is loading subscribes to the store. */
export function UploadProgressRing({ fileName, tone }: { fileName: string, tone?: MarkerRingTone }) {
  const tasks = useUploadTasks()
  return <MarkerProgressRing progress={tasks.find(task => task.name === fileName)?.progress ?? null} tone={tone} />
}
