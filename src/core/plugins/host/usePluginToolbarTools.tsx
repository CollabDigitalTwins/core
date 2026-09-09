'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import { SubmenuContext, ToolbarSubmenu } from '../../components/ToolbarSubmenu'
import { Button } from '../../components/ui/Button'

import { resolvePluginIcon } from './pluginIcon'
import { usePluginConfigs, usePluginContributions, type PluginContribution } from './provider'
import { PluginScopeProvider } from './scope'

import type { CursorType } from '../../types/global'
import type { Tool } from '../../types/tools'
import type { ToolbarRegistration } from '../sdk/types'

import type { LucideProps } from 'lucide-react'

/** The three toolbar capabilities. All share `ToolbarRegistration`. */
export type ToolbarCapability = 'map.tools' | 'bim.tools' | 'pointcloud.tools'

/** What `ToolbarButton` renders for a tool that supplies its own component. */
type ToolComponent = NonNullable<Tool['component']>

/**
 * Plugin contributions for one toolbar, as `Tool` objects the toolbars already
 * render: `[...coreTools, ...usePluginToolbarTools('bim.tools', viewerProps)]`.
 *
 * `extraProps` is spread onto the plugin's component by `ToolbarButton` — how a BIM
 * tool gets its viewer handles. Each viewer passes its own, keeping this module free
 * of viewer-engine imports that would pull three into the map bundle.
 */
export function usePluginToolbarTools(
  capability: ToolbarCapability,
  extraProps?: Record<string, unknown>,
): Tool[] {
  const contributions = usePluginContributions(capability)
  const configs = usePluginConfigs()

  // Cached by tool id to keep component identity stable. `extraProps` changes on
  // most renders (it carries live viewer handles), and rebuilding on each would
  // remount the plugin's panel and lose its state on every camera move.
  const wrapped = React.useRef(new Map<string, ToolComponent>())

  return React.useMemo(() => {
    const live = new Set<string>()

    const tools = contributions.map(contribution => {
      const id = pluginToolId(contribution)
      live.add(id)

      let Component = wrapped.current.get(id)
      if (!Component) {
        Component = wrapPluginComponent(contribution, () => configs[contribution.pluginId])
        wrapped.current.set(id, Component)
      }

      return {
        id,
        title: contribution.label,
        icon: resolvePluginIcon(contribution.icon),
        // An invented cursor is a CSS no-op, not a crash, so it goes unvalidated.
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

// A stay-active plugin must outlive the dropdown, which destroys its children on close.
const PluginStayActivePanel: React.FC<{
  children: React.ReactNode
  tool: Tool
}> = ({ children, tool }) => {
  const { openSubmenu, setOpenSubmenu } = React.useContext(SubmenuContext)
  const isOpen = openSubmenu === tool.id
  const panelId = React.useId()
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpenSubmenu(null)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenSubmenu(null)
    }

    // Armed while closed, this would read the press that opens the panel as an outside press.
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, setOpenSubmenu])

  return (
    <div ref={containerRef} className="relative flex items-center">
      <Button
        size="default"
        variant="ghost"
        className="flex flex-row justify-center items-center px-1 pointer-events-auto text-primary-dark"
        title={tool.title}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setOpenSubmenu(isOpen ? null : tool.id)}
      >
        <tool.icon />
        <LR.ChevronDown className={`-ml-2 transition-all duration-200 scale-75 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>
      {/* Opens upward because the toolbar is pinned to the bottom of the viewport. */}
      <div
        id={panelId}
        hidden={!isOpen}
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[8rem] max-h-[60vh] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md pointer-events-auto"
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Wrap a plugin's component into a real toolbar entry.
 *
 * `ToolbarButton` renders `tool.component` *instead of* a button, so a plugin
 * returning a panel would render it inline and blow the strip out of the viewport.
 * `ToolbarSubmenu` gives it the same ghost button and dropdown every core tool has,
 * built from the `label` and `icon` it already declared. The wrapper also supplies
 * the plugin scope the scoped SDK hooks read.
 */
function wrapPluginComponent(
  contribution: PluginContribution<ToolbarCapability>,
  // Lazily, because the component identity is cached: capturing the config by value
  // would freeze it at whatever it was on first render.
  readConfig: () => Record<string, unknown> | undefined,
): ToolComponent {
  // Props are typed per capability at `ctx.register`. This wrapper forwards whatever
  // the hosting toolbar passed, so the shape is erased here on purpose.
  const Component = contribution.component as unknown as React.ComponentType<Record<string, unknown>>

  function PluginToolboxItem({ tool, ...rest }: React.ComponentProps<ToolComponent>) {
    const panel = (
      <PluginScopeProvider pluginId={contribution.pluginId} config={readConfig()}>
        <Component tool={tool} {...rest} />
      </PluginScopeProvider>
    )

    if (tool.stayActive) {
      return <PluginStayActivePanel tool={tool}>{panel}</PluginStayActivePanel>
    }

    return <ToolbarSubmenu tool={tool}>{panel}</ToolbarSubmenu>
  }

  PluginToolboxItem.displayName = `PluginTool(${contribution.pluginId}/${contribution.id})`
  return PluginToolboxItem
}
