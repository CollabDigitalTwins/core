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

/** WCAG relative luminance, 0 (black) to 1 (white). Returns null for an unparseable colour. */
export function relativeLuminance(colour: string): number | null {
  const rgb = parseHex(colour)
  if (!rgb) return null
  const linear = (value: number): number => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b)
}

/**
 * Black or white, whichever reads better on the given background.
 *
 * Needed wherever a value ramp is used as a fill behind text: a ramp runs from dark to light by
 * design, so no single fixed text colour stays legible across it.
 */
export function readableTextColour(background: string): string {
  const luminance = relativeLuminance(background)
  if (luminance == null) return '#000000'
  // 0.179 is the luminance at which white and black text have equal WCAG contrast.
  return luminance > 0.179 ? '#000000' : '#ffffff'
}

/** A hex colour as `rgba(...)` at the given alpha, for glows and washes. */
export function withAlpha(colour: string, alpha: number): string {
  const rgb = parseHex(colour)
  if (!rgb) return colour
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp01(alpha)})`
}
