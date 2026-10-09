'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

/** `slug → locale → strings`, straight from each loaded manifest's `messages`. */
export type RuntimePluginMessages = Record<string, Record<string, Record<string, unknown>>>

/**
 * Manifests fetched at runtime arrive after the i18n catalog is built, so their strings
 * reach lookups through this instead. Standalone so the SDK can read it without the host.
 */
export const RuntimePluginMessagesContext = React.createContext<RuntimePluginMessages>({})

export function collectRuntimeMessages(
  manifests: ReadonlyArray<{ slug?: unknown; messages?: unknown } | null | undefined>,
): RuntimePluginMessages {
  const bySlug: RuntimePluginMessages = {}
  for (const manifest of manifests) {
    if (typeof manifest?.slug !== 'string' || !isRecord(manifest.messages)) continue
    bySlug[manifest.slug] = manifest.messages as Record<string, Record<string, unknown>>
  }
  return bySlug
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
