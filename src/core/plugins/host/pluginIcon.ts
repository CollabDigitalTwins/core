// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'

import type { LucideProps } from 'lucide-react'
import type * as React from 'react'

// A leaf module on purpose: the Plugins page resolves an icon too, and importing a hook to
// get this pulled the store barrel into a card that has no business with it.

/** Shown when a plugin names an icon that does not exist, so the button still appears. */
const FALLBACK_ICON = LR.Puzzle

/** A plugin may pass a lucide component, or its name as a string — JSON manifests only carry the string. */
export function resolvePluginIcon(
  icon: string | React.ComponentType<LucideProps>,
): React.ComponentType<LucideProps> {
  if (typeof icon !== 'string') return icon

  const candidate = (LR as unknown as Record<string, unknown>)[icon]
  return isComponent(candidate) ? candidate : FALLBACK_ICON
}

// Lucide icons are `forwardRef` objects, so a bare `typeof === 'function'` check
// rejects every real icon. Anything renderable is callable or carries `$$typeof`.
function isComponent(value: unknown): value is React.ComponentType<LucideProps> {
  if (typeof value === 'function') return true
  return typeof value === 'object' && value !== null && '$$typeof' in value
}
