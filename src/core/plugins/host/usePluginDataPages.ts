'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { usePluginMessageLookup } from '../sdk/messages'

import { resolvePluginIcon } from './pluginIcon'
import { pluginViewerKey } from './pluginViewerKey'
import { usePluginContributions } from './provider'

import type { ViewerKey } from '../../types/dbTypes'
import type { LucideProps } from 'lucide-react'

export interface PluginNavItem {
  /** The `viewer` key this item switches to. */
  id: ViewerKey
  title: string
  icon: React.ComponentType<LucideProps>
}

/**
 * The `data.pages` contributions as nav items. They sit in Datasets beside Buildings, so a
 * contributed page reads as part of the platform.
 */
export function usePluginDataPages(): PluginNavItem[] {
  const registrations = usePluginContributions('data.pages')
  const message = usePluginMessageLookup()

  return React.useMemo(
    () => registrations.map(registration => ({
      id: pluginViewerKey(registration.pluginId, registration.id),
      title: message(registration.pluginId, registration.titleKey, registration.titleKey),
      icon: resolvePluginIcon(registration.icon),
    })),
    [registrations, message],
  )
}
