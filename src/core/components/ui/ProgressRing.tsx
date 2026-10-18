'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

export const VIEWBOX = 40
export const RING_STROKE = 3

/** Flush with the ring box's edge: half the stroke sits either side of the circle. */
const RADIUS = VIEWBOX / 2 - RING_STROKE / 2

export const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// A phase that reports no percentage spins an arc of this length instead of sitting at zero.
const INDETERMINATE_FRACTION = 0.25

/** How much of the ring to leave undrawn, as an SVG stroke-dashoffset. */
export function arcOffset(progress: number | null): number {
  if (progress == null) return CIRCUMFERENCE * (1 - INDETERMINATE_FRACTION)
  const clamped = Math.min(100, Math.max(0, progress))
  return CIRCUMFERENCE * (1 - clamped / 100)
}

/** The surface the ring sits on: a filled primary one, or a light one like a panel or the map. */
export type ProgressRingTone = 'onPrimary' | 'onSurface'

const TONE: Record<ProgressRingTone, { track: string, arc: string }> = {
  onPrimary: { track: 'stroke-primary-foreground/25', arc: 'stroke-primary-foreground' },
  onSurface: { track: 'stroke-primary/20', arc: 'stroke-primary' },
}

export interface ProgressRingProps {
  progress: number | null
  size?: number | '100%'
  tone?: ProgressRingTone
  showPercent?: boolean
  label?: string
  style?: React.CSSProperties
  className?: string
}

/** A ring filled to `progress` percent (0–100), or a spinning arc while the amount is unknown. */
export function ProgressRing({ progress, size = 20, tone = 'onSurface', showPercent = false, label, style, className }: ProgressRingProps) {
  const spinning = progress == null
  const { track, arc } = TONE[tone]
  const ring = (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      width={size}
      height={size}
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label && !spinning ? Math.round(progress) : undefined}
      className={['shrink-0', className, spinning ? 'animate-spin' : undefined].filter(Boolean).join(' ')}
      style={spinning ? style : { ...style, transform: 'rotate(-90deg)' }}
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
  if (!showPercent || spinning) return ring
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
      {ring}
      <span>{Math.round(progress)}%</span>
    </span>
  )
}
