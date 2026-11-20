// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export interface Box { left: number; top: number; width: number; height: number }
export interface Size { width: number; height: number }

const GAP = 14
const MARGIN = 16
const STEP = 8
const MIN_HEIGHT = 200

const right = (b: Box) => b.left + b.width
const bottom = (b: Box) => b.top + b.height
const inflate = (b: Box, by: number): Box => ({ left: b.left - by, top: b.top - by, width: b.width + by * 2, height: b.height + by * 2 })
const overlaps = (a: Box, b: Box) => a.left < right(b) && b.left < right(a) && a.top < bottom(b) && b.top < bottom(a)
const centreDistance = (a: Box, b: Box) => Math.hypot(a.left + a.width / 2 - b.left - b.width / 2, a.top + a.height / 2 - b.top - b.height / 2)
const edgeDistance = (a: Box, b: Box) =>
  Math.hypot(Math.max(b.left - right(a), a.left - right(b), 0), Math.max(b.top - bottom(a), a.top - bottom(b), 0))

/** Where `a` and `b` overlap, or null when they do not. */
export function intersect(a: Box, b: Box): Box | null {
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const width = Math.min(right(a), right(b)) - left
  const height = Math.min(bottom(a), bottom(b)) - top
  return width > 0 && height > 0 ? { left, top, width, height } : null
}

/** The part of `box` inside the viewport, or null when none of it is. */
export const visiblePart = (box: Box, viewport: Size) => intersect(box, { left: 0, top: 0, ...viewport })

function stops(from: number, to: number): number[] {
  const values: number[] = []
  for (let v = from; v < to; v += STEP) values.push(v)
  return [...values, Math.max(from, to)]
}

function nearestFree(anchor: Box, card: Size, viewport: Size, blocked: Box[]): Box | null {
  let best: Box | null = null
  let bestScore = Infinity
  for (const top of stops(MARGIN, viewport.height - card.height - MARGIN)) {
    for (const left of stops(MARGIN, viewport.width - card.width - MARGIN)) {
      const candidate = { left, top, ...card }
      if (blocked.some(b => overlaps(candidate, b))) continue
      const score = edgeDistance(candidate, anchor) + centreDistance(candidate, anchor) / 100
      if (score < bestScore) [best, bestScore] = [candidate, score]
    }
  }
  return best
}

function tallestFree(anchor: Box, card: Size, viewport: Size, blocked: Box[]): Box | null {
  let spot = nearestFree(anchor, card, viewport, blocked)
  if (spot || card.height <= MIN_HEIGHT) return spot
  spot = nearestFree(anchor, { ...card, height: MIN_HEIGHT }, viewport, blocked)
  let [fits, fails] = [MIN_HEIGHT, card.height]
  while (spot && fails - fits > STEP) {
    const height = Math.floor((fits + fails) / 2)
    const found = nearestFree(anchor, { ...card, height }, viewport, blocked)
    if (found) [fits, spot] = [height, found]
    else fails = height
  }
  return spot
}

/** Whether the card fits to the left or right of the target. */
export const fitsBeside = (target: Box, cardWidth: number, viewportWidth: number) =>
  Math.max(target.left, viewportWidth - right(target)) - GAP - MARGIN >= cardWidth

export interface Placement { left: number; top: number; maxHeight?: number }

const capped = (left: number, top: number, viewport: Size): Placement => ({ left, top, maxHeight: viewport.height - top - MARGIN })

// Docks at the edge with more room outside the target, so a short card covers only the target's far end.
function dockToEdge(target: Box, card: Size, viewport: Size, blocked: Box[]): Placement {
  const left = Math.max(MARGIN, (viewport.width - card.width) / 2)
  const column = { left, top: 0, width: card.width, height: viewport.height }
  const inColumn = blocked.filter(b => overlaps(b, column))
  const upper = inColumn.filter(b => b.top + b.height / 2 < viewport.height / 2)
  const ceiling = Math.max(MARGIN, ...upper.map(bottom))
  const floor = Math.min(viewport.height - MARGIN, ...inColumn.filter(b => !upper.includes(b)).map(b => b.top))
  const above = target.top - GAP - ceiling
  const below = floor - bottom(target) - GAP
  const height = Math.min(card.height, Math.max(above, below, MIN_HEIGHT))
  return { left, top: below >= above ? floor - height : ceiling, maxHeight: height }
}

/** The free spot nearest the target, clear of it and of `avoid`, shortening the card before covering the target. */
export function placeCard(target: Box | null, card: Size, viewport: Size, avoid: Box[] = []): Placement {
  const blocked = avoid.map(b => inflate(b, GAP))
  if (target) {
    const beside = tallestFree(target, card, viewport, [...blocked, inflate(target, GAP)])
    return beside ? { left: beside.left, top: beside.top, maxHeight: beside.height } : dockToEdge(target, card, viewport, blocked)
  }
  const centre = { left: viewport.width / 2, top: viewport.height / 2, width: 0, height: 0 }
  const spot = nearestFree(centre, card, viewport, blocked)
  if (spot) return capped(spot.left, spot.top, viewport)
  return capped(Math.max(MARGIN, (viewport.width - card.width) / 2), Math.max(MARGIN, viewport.height - card.height - MARGIN), viewport)
}
