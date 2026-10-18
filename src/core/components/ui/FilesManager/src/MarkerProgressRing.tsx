'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { ProgressRing } from '../../ProgressRing'

import { useUploadTasks } from './uploadProgress'

import type { ProgressRingTone } from '../../ProgressRing'

export { arcOffset, CIRCUMFERENCE, RING_STROKE, VIEWBOX } from '../../ProgressRing'

/** Pixels the ring reaches past the pin's own box, so it reads as a ring and not as the pin's rim. */
export const OVERHANG = 3

/** Which pin the ring sits on: a filled primary pin, or a light surface one like the map's. */
export type MarkerRingTone = ProgressRingTone

const OVERHANG_BOX: React.CSSProperties = {
  position: 'absolute',
  top: -OVERHANG,
  left: -OVERHANG,
  width: `calc(100% + ${OVERHANG * 2}px)`,
  height: `calc(100% + ${OVERHANG * 2}px)`,
  pointerEvents: 'none',
}

/**
 * The ring around an uploading pin, the size of the pin itself. Its box is inline because a
 * consumer's Tailwind build may never generate a utility class only this package uses.
 */
export function MarkerProgressRing({ progress, tone = 'onPrimary' }: { progress: number | null, tone?: MarkerRingTone }) {
  return <ProgressRing progress={progress} size="100%" tone={tone} style={OVERHANG_BOX} />
}

/** Finds the pin's own upload task by name, so only a pin that is loading subscribes to the store. */
export function UploadProgressRing({ fileName, tone }: { fileName: string, tone?: MarkerRingTone }) {
  const tasks = useUploadTasks()
  return <MarkerProgressRing progress={tasks.find(task => task.name === fileName)?.progress ?? null} tone={tone} />
}
