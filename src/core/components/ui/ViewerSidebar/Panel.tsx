'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { cn } from '../../../utils/utils'
import { SearchInput } from '../SearchInput'

interface ViewerSidebarPanelProps {
  children: React.ReactNode
  /**
   * 'sections' — the panel does not scroll; its sections manage their own overflow.
   * 'scroll'   — the panel is a single padded, scrolling stack (settings-style).
   */
  variant?: 'sections' | 'scroll'
  /** Renders a search field above the content. */
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  className?: string
}

/**
 * The body wrapper for a viewer sidebar tab. Replaces the wrapper `div` (and the
 * search-field markup above it) that every tab used to copy-paste.
 */
export function ViewerSidebarPanel({
  children,
  variant = 'sections',
  search,
  className,
}: ViewerSidebarPanelProps) {
  return (
    <div
      className={cn(
        variant === 'scroll'
          ? 'w-full flex-1 min-h-0 flex flex-col gap-6 p-4 overflow-y-auto'
          : 'flex-1 min-h-0 flex flex-col space-y-6 py-4 overflow-hidden',
        className,
      )}
    >
      {search && (
        // 'scroll' already pads the panel; 'sections' pads per-child.
        <div className={variant === 'sections' ? 'px-4' : undefined}>
          <SearchInput
            placeholder={search.placeholder ?? 'Search...'}
            value={search.value}
            onChange={event => search.onChange(event.target.value)}
          />
        </div>
      )}
      {children}
    </div>
  )
}
