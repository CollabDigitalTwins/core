'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { usePluginMessageLookup } from '../sdk/messages'

import { resolvePluginIcon } from './pluginIcon'
import { usePluginConfigs, usePluginContributions } from './provider'
import { PluginScopeProvider } from './scope'

import type { ViewerSidebarTab } from '../../components/ui/ViewerSidebar/sidebarTabs'
import type { SidebarTabKey } from '../../store/Menus/reducer'
import type { ViewerNames } from '../../types/dbTypes'

/** Namespaced so a plugin tab can never collide with a built-in one, or with another plugin's. */
export function pluginTabId(pluginId: string, tabId: string): SidebarTabKey {
  return `plugin:${pluginId}:${tabId}`
}

/**
 * The `viewer.tabs` contributions for this viewer; no `viewers` means every viewer. The panel
 * is wrapped in the plugin scope, which is what lets the component inside reach the SDK hooks.
 */
export function usePluginViewerTabs(viewer: ViewerNames): ViewerSidebarTab[] {
  const registrations = usePluginContributions('viewer.tabs')
  const configs = usePluginConfigs()
  const message = usePluginMessageLookup()

  return React.useMemo(
    () => registrations
      .filter(registration => !registration.viewers || registration.viewers.includes(viewer))
      .map((registration) => {
        const Panel = registration.component

        return {
          id: pluginTabId(registration.pluginId, registration.id),
          meta: {
            icon: resolvePluginIcon(registration.icon),
            label: message(registration.pluginId, registration.labelKey, registration.labelKey),
          },
          content: (
            <PluginScopeProvider
              pluginId={registration.pluginId}
              config={configs[registration.pluginId]}
            >
              <Panel />
            </PluginScopeProvider>
          ),
        }
      }),
    [registrations, viewer, configs, message],
  )
}
