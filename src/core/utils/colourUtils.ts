// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** An sRGB colour, 0-255 per channel. */
export interface Rgb {
  r: number
  g: number
  b: number
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n)

/** Parses `#abc` or `#aabbcc` (with or without the hash). Returns null for anything else. */
export function parseHex(colour: string): Rgb | null {
  const raw = colour.trim().replace(/^#/, '')
  const hex = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  }
}

const channel = (n: number): string => Math.round(n).toString(16).padStart(2, '0')

/** `{r,g,b}` back to a `#rrggbb` string. */
export function toHex({ r, g, b }: Rgb): string {
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

/**
 * Straight sRGB interpolation between two hex colours, `t` clamped to 0..1.
 *
 * sRGB rather than a perceptual space is deliberate: both endpoints are colours an operator
 * picked in a colour input, so the midpoint should be the one they would predict from mixing
 * them. Falls back to whichever endpoint parses when the other is malformed.
 */
export function lerpHex(from: string, to: string, t: number): string {
  const a = parseHex(from)
  const b = parseHex(to)
  if (!a || !b) return a ? from : to
  const k = clamp01(t)
  return toHex({
    r: a.r + (b.r - a.r) * k,
    g: a.g + (b.g - a.g) * k,
    b: a.b + (b.b - a.b) * k,
  })
}

/** A hex colour as `rgba(...)` at the given alpha, for glows and washes. */
export function withAlpha(colour: string, alpha: number): string {
  const rgb = parseHex(colour)
  if (!rgb) return colour
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp01(alpha)})`
}
