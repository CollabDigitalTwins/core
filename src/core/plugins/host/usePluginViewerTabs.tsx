'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { usePluginMessageLookup } from '../sdk/messages'

import { usePluginConfigs, usePluginContributions } from './provider'
import { PluginScopeProvider } from './scope'
import { resolvePluginIcon } from './usePluginToolbarTools'

import type { ViewerSidebarTab } from '../../components/ui/ViewerSidebar/sidebarTabs'
import type { SidebarTabKey } from '../../store/Menus/reducer'
import type { ViewerNames } from '../../types/dbTypes'

/** Namespaced so a plugin tab can never collide with a built-in one, or with another plugin's. */
export function pluginTabId(pluginId: string, tabId: string): SidebarTabKey {
  return `plugin:${pluginId}:${tabId}`
}

/**
 * The `viewer.tabs` contributions this viewer should show, ready to append to its own tab
 * list. A registration with no `viewers` appears in every viewer.
 *
 * The panel content is wrapped in the plugin's scope here, which is what lets the component
 * inside call `usePluginState`, `usePluginDialogs` and the rest without passing an id around.
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
