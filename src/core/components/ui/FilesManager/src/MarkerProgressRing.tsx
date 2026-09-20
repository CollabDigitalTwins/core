'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useUploadTasks } from './uploadProgress'

const RADIUS = 18

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

/** Whether the ring sits around the pin or within its bounds, replacing the pin's own outline. */
export type MarkerRingFit = 'around' | 'within'

const FIT: Record<MarkerRingFit, string> = {
  around: 'inset-[-3px] h-[42px] w-[42px]',
  within: 'inset-0 h-full w-full',
}

interface MarkerProgressRingProps {
  progress: number | null
  tone?: MarkerRingTone
  fit?: MarkerRingFit
}

/** The ring around an uploading pin: fills to the percentage, or spins while there is none. */
export function MarkerProgressRing({ progress, tone = 'onPrimary', fit = 'around' }: MarkerProgressRingProps) {
  const spinning = progress == null
  const { track, arc } = TONE[tone]

  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={`pointer-events-none absolute ${FIT[fit]} ${spinning ? 'animate-spin' : '-rotate-90'}`}
    >
      <circle cx="20" cy="20" r={RADIUS} fill="none" strokeWidth="3" className={track} />
      <circle
        cx="20"
        cy="20"
        r={RADIUS}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={arcOffset(progress)}
        className={`${arc} transition-[stroke-dashoffset] duration-200 ease-out`}
      />
    </svg>
  )
}

/** Finds the pin's own upload task by name, so only a pin that is loading subscribes to the store. */
export function UploadProgressRing({ fileName, tone, fit }: { fileName: string, tone?: MarkerRingTone, fit?: MarkerRingFit }) {
  const tasks = useUploadTasks()
  return <MarkerProgressRing progress={tasks.find(task => task.name === fileName)?.progress ?? null} tone={tone} fit={fit} />
}
