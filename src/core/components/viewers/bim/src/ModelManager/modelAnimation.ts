// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export interface AnimationState {
  clipIndex: number
  playing: boolean
  speed: number
}

export const MIN_SPEED = 0.1
export const MAX_SPEED = 3

export const DEFAULT_ANIMATION_STATE: AnimationState = { clipIndex: 0, playing: true, speed: 1 }

/** A model with no clips is never "animated", so the card offers no animation action for it. */
export function initialState(clipCount: number): AnimationState | null {
  return clipCount > 0 ? { ...DEFAULT_ANIMATION_STATE } : null
}

export function withClip(state: AnimationState, clipIndex: number, clipCount: number): AnimationState {
  if (clipIndex < 0 || clipIndex >= clipCount) return state
  return { ...state, clipIndex }
}

export function withPlaying(state: AnimationState, playing: boolean): AnimationState {
  return { ...state, playing }
}

export function withSpeed(state: AnimationState, speed: number): AnimationState {
  if (!Number.isFinite(speed)) return state
  return { ...state, speed: Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed)) }
}

/** The renderer draws on demand, so a paused or stopped mixer must not keep asking for frames. */
export function needsFrames(states: (AnimationState | null)[]): boolean {
  return states.some((state) => state?.playing === true)
}
