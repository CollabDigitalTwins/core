// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Validated categorical pair (storage, egress) plus a recessive neutral for the shared baseline, per theme. */
export const USAGE_COLORS = {
  storage: { light: '#2a78d6', dark: '#3987e5' },
  egress: { light: '#eb6834', dark: '#d95926' },
  shared: { light: '#898781', dark: '#898781' },
  spike: { light: '#d03b3b', dark: '#d03b3b' },
} as const

export type UsageColorKey = keyof typeof USAGE_COLORS
