'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

/**
 * Drawn here: `lucide-react` is unshimmed, so a plugin cannot import it. Icon *names* work in
 * registrations, where the host resolves them. Labels live on each button's aria-label.
 */
export function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function CheckIcon() {
  return <path d="M20 6 9 17l-5-5" />
}

export function XIcon() {
  return <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>
}

/** Smaller than the button glyphs — it sits inside a 24px swatch, not a 32px button. */
export function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
