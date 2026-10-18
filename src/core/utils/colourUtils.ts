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

/** sRGB interpolation, `t` clamped to 0..1: endpoints are user-picked, so the midpoint should match mixing them by eye. */
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

/** Black or white, whichever reads better on `background`; a dark-to-light ramp behind text needs both. */
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

/** `#rrggbb` for a three.js-style 0xRRGGBB number; an unset colour stays unset. */
export function hexFromInt(colour: number): string
export function hexFromInt(colour: number | undefined): string | undefined
export function hexFromInt(colour: number | undefined): string | undefined {
  return colour === undefined ? undefined : `#${colour.toString(16).padStart(6, '0')}`
}

/** The 0xRRGGBB number for a `#rrggbb` string, or null when it does not parse. */
export function intFromHex(colour: string): number | null {
  const value = Number.parseInt(colour.replace('#', ''), 16)
  return Number.isNaN(value) ? null : value
}

const CSS_COLOUR_FUNCTION = /^(rgb|rgba|hsl|hsla)\(\s*[\d.]+%?\s*,?\s*[\d.]+%?\s*,?\s*[\d.]+%?\s*([,/]\s*[\d.]+%?\s*)?\)$/i
const RGB_TRIPLET = /^\s*(\d{1,3})\s*[,; ]\s*(\d{1,3})\s*[,; ]\s*(\d{1,3})\s*$/

function isNamedCssColour(value: string): boolean {
  return /^[a-z]{3,20}$/i.test(value) && typeof CSS !== 'undefined' && CSS.supports?.('color', value) === true
}

/** A CSS colour MapLibre can draw, from hex, `rgb()`/`hsl()`, a CSS name or a bare `r,g,b` triplet; null otherwise. */
export function normaliseColour(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.startsWith('#')) return parseHex(trimmed) ? trimmed : null
  if (CSS_COLOUR_FUNCTION.test(trimmed)) return trimmed
  const triplet = RGB_TRIPLET.exec(trimmed)
  if (triplet) {
    const channels = triplet.slice(1, 4).map(Number)
    return channels.every(c => c <= 255) ? `rgb(${channels.join(', ')})` : null
  }
  return isNamedCssColour(trimmed) ? trimmed.toLowerCase() : null
}

/** An Esri `[r, g, b, a]` symbol colour as `{ colour, opacity }`. */
export function fromEsriColour(colour: unknown): { colour: string; opacity: number } | null {
  if (!Array.isArray(colour) || colour.length < 3) return null
  const [r, g, b, a = 255] = colour.map(Number)
  if ([r, g, b, a].some(n => !Number.isFinite(n))) return null
  return { colour: toHex({ r, g, b }), opacity: clamp01(a / 255) }
}
