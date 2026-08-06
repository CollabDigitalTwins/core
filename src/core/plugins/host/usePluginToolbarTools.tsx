'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import { usePluginContributions, type PluginContribution } from './provider'
import { PluginScopeProvider } from './scope'

import type { CursorType } from '../../types/global'
import type { Tool } from '../../types/tools'
import type { ToolbarRegistration } from '../sdk/types'
import type { LucideProps } from 'lucide-react'

/** The three toolbar capabilities. All share `ToolbarRegistration`. */
export type ToolbarCapability = 'map.tools' | 'bim.tools' | 'pointcloud.tools'

/** What `ToolbarButton` renders for a tool that supplies its own component. */
type ToolComponent = NonNullable<Tool['component']>

/** Shown when a plugin names an icon that does not exist, so the button still appears. */
const FALLBACK_ICON = LR.Puzzle

/**
 * Resolve a registration's icon to a component.
 *
 * A plugin may pass a lucide component directly, or its name as a string — the
 * string form is what survives a JSON manifest and is what the docs show.
 */
export function resolvePluginIcon(
  icon: ToolbarRegistration['icon'],
): React.ComponentType<LucideProps> {
  if (typeof icon !== 'string') return icon

  const candidate = (LR as unknown as Record<string, unknown>)[icon]
  return isComponent(candidate) ? candidate : FALLBACK_ICON
}

/**
 * Lucide icons are `forwardRef` objects, not functions, so a `typeof === 'function'`
 * check rejects every real icon. Anything React can render is either callable or
 * carries `$$typeof`.
 */
function isComponent(value: unknown): value is React.ComponentType<LucideProps> {
  if (typeof value === 'function') return true
  return typeof value === 'object' && value !== null && '$$typeof' in value
}

/**
 * Plugin contributions for one toolbar, as `Tool` objects the existing toolbars
 * already know how to render.
 *
 * Merge the result into the viewer's own tool array:
 *
 *   return [...coreTools, ...usePluginToolbarTools('bim.tools', viewerProps)]
 *
 * `extraProps` is spread onto the plugin's component by `ToolbarButton`, which is
 * how a BIM tool receives its viewer handles. Each viewer passes its own, so this
 * module stays free of any viewer-engine import — importing `@thatopen` here would
 * pull three into the eager map-route bundle.
 */
export function usePluginToolbarTools(
  capability: ToolbarCapability,
  extraProps?: Record<string, unknown>,
): Tool[] {
  const contributions = usePluginContributions(capability)

  // Wrapped components are cached by tool id so their identity is stable across
  // renders. Rebuilding them whenever `extraProps` changes — and it changes on
  // most renders, since it carries live viewer handles — would remount the
  // plugin's panel and throw away its state on every camera move.
  const wrapped = React.useRef(new Map<string, ToolComponent>())

  return React.useMemo(() => {
    const live = new Set<string>()

    const tools = contributions.map(contribution => {
      const id = pluginToolId(contribution)
      live.add(id)

      let Component = wrapped.current.get(id)
      if (!Component) {
        Component = wrapPluginComponent(contribution)
        wrapped.current.set(id, Component)
      }

      return {
        id,
        title: contribution.label,
        icon: resolvePluginIcon(contribution.icon),
        // A cursor a plugin invents is a CSS no-op, not a crash, so it is taken
        // at its word rather than validated against the core union.
        cursor: contribution.cursor as CursorType | undefined,
        stayActive: contribution.stayActive,
        component: Component,
        extraProps,
      } satisfies Tool
    })

    // Drop cache entries for plugins that have since been disabled.
    for (const id of wrapped.current.keys()) {
      if (!live.has(id)) wrapped.current.delete(id)
    }

    return tools
  }, [contributions, extraProps])
}

function pluginToolId(contribution: PluginContribution<ToolbarCapability>) {
  return `plugin:${contribution.pluginId}:${contribution.id}` as const
}

/**
 * Wrap a plugin's component so it renders inside its own plugin scope, which is
 * what the scoped SDK hooks (`usePluginStore`, `usePluginTranslations`) read.
 */
function wrapPluginComponent(
  contribution: PluginContribution<ToolbarCapability>,
): ToolComponent {
  const Component = contribution.component as React.ComponentType<Record<string, unknown>>

  function PluginToolboxItem(props: React.ComponentProps<ToolComponent>) {
    return (
      <PluginScopeProvider pluginId={contribution.pluginId}>
        <Component {...props} />
      </PluginScopeProvider>
    )
  }

  PluginToolboxItem.displayName = `PluginTool(${contribution.pluginId}/${contribution.id})`
  return PluginToolboxItem
}
