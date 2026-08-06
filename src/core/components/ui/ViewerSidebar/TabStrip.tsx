'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useCompactTabStrip } from '../../../hooks/ui/useCompactTabStrip'
import { cn } from '../../../utils/utils'
import { Separator } from '../Separator'

import { SIDEBAR_TAB_META, sidebarPanelId, sidebarTabId } from './sidebarTabs'

import type { SidebarTabType } from '../../../store/Menus/reducer'

interface TabStripProps {
  /** Visible tab ids, in display order. */
  tabs: SidebarTabType[]
  activeTab: SidebarTabType
  onTabChangeAction: (tab: SidebarTabType) => void
}

/**
 * The viewer sidebar's tab strip — one implementation for every viewer.
 *
 * Each tab is an icon with its label underneath. When the strip is too narrow for
 * readable labels the labels drop and the icons carry it alone; the name stays
 * available through the tooltip and the accessible name. That is what stops the
 * old text-only strip from degrading into "Se..." / "Set..." on a narrow sidebar.
 */
export function TabStrip({ tabs, activeTab, onTabChangeAction }: TabStripProps) {
  // Translation
  const t = useTranslations('TabSelector')

  const listRef = React.useRef<HTMLDivElement>(null)
  const buttonsRef = React.useRef<Array<HTMLButtonElement | null>>([])
  const compact = useCompactTabStrip(listRef, tabs.length)

  // Roving-focus keyboard nav, per the WAI-ARIA tabs pattern.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = tabs.length - 1
    let nextIndex: number

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = index === lastIndex ? 0 : index + 1
        break
      case 'ArrowLeft':
        nextIndex = index === 0 ? lastIndex : index - 1
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = lastIndex
        break
      default:
        return
    }

    const nextTab = tabs[nextIndex]
    if (!nextTab) return

    event.preventDefault()
    onTabChangeAction(nextTab)
    buttonsRef.current[nextIndex]?.focus()
  }

  return (
    <div>
      <Separator />

      <div className="px-4 py-3">
        <div ref={listRef} role="tablist" aria-orientation="horizontal" className="flex items-center gap-1 w-full">
          {tabs.map((tab, index) => {
            const { icon: Icon, labelKey } = SIDEBAR_TAB_META[tab]
            const label = t(labelKey)
            const isActive = tab === activeTab

            return (
              <button
                key={tab}
                ref={(node) => { buttonsRef.current[index] = node }}
                type="button"
                role="tab"
                id={sidebarTabId(tab)}
                aria-selected={isActive}
                aria-controls={sidebarPanelId(tab)}
                // Roving tabIndex: one stop for the whole strip, arrows move within it.
                tabIndex={isActive ? 0 : -1}
                title={label}
                aria-label={label}
                className={cn(
                  'flex-1 min-w-0 min-h-10 flex flex-col items-center justify-center gap-1 px-1 py-2',
                  'rounded-md cursor-pointer transition-colors font-medium',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                )}
                onClick={() => onTabChangeAction(tab)}
                onKeyDown={event => handleKeyDown(event, index)}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {!compact && (
                  <span className="max-w-full truncate text-[11px] leading-none">{label}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <Separator />
    </div>
  )
}
