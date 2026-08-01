'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

interface Props {
  /** Buttons for this view, shown right-aligned above the content. */
  actions?: React.ReactNode
  /** Item count shown at the left of the action row. */
  count?: number
  children: React.ReactNode
}

/**
 * The body of one view inside a `LayerGroupSection`.
 *
 * Views no longer own a collapsible header of their own — the group provides
 * it — so their per-view controls live in a compact toolbar above the scrolling
 * content instead.
 */
export function LayerViewPanel({ actions, count, children }: Props) {
  const hasToolbar = actions !== undefined || count !== undefined

  return (
    <div className="flex flex-col h-full min-h-0">
      {hasToolbar && (
        <div className="flex items-center gap-1 pb-1 flex-shrink-0">
          {count !== undefined && (
            <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
          )}
          <div className="flex items-center gap-1 ml-auto">{actions}</div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">{children}</div>
    </div>
  )
}
