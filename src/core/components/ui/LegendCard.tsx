'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import { Badge } from './Badge'
import { Button } from './Button'
import { Command } from './Command'
import { Menubar } from './Menubar'

interface LegendCardProps {
  /** Heading text, beside the optional count badge. */
  title: string
  /** Rendered in a badge before the title. Omit for a card that is not counting anything. */
  count?: number
  /** Collapsed body. Only mounted while the card is open. */
  children: React.ReactNode
  defaultOpen?: boolean
  testId?: string
  countTestId?: string
}

/**
 * The floating card chrome shared by every viewer overlay in the bottom-left stack: the same
 * `Menubar` shell, count badge and chevron collapse as the DatasetManager card, so a new
 * legend lines up with the existing ones instead of hand-tuning offsets.
 *
 * Presentation only. Callers decide when the card should exist at all, and supply the body.
 */
export function LegendCard({
  title,
  count,
  children,
  defaultOpen = true,
  testId,
  countTestId,
}: LegendCardProps): React.ReactElement {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <div data-testid={testId} className="pointer-events-auto">
      <Menubar className="w-72 h-auto">
        <Command>
          <div>
            <div className={`flex items-center justify-between gap-3 ${open ? 'p-3' : 'pl-1 py-0'}`}>
              <div className="flex items-center gap-2">
                {count !== undefined && <Badge data-testid={countTestId}>{count}</Badge>}
                <div className="text-sm font-medium">{title}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                aria-label={title}
                className="opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
              >
                <LR.ChevronUp
                  size={14}
                  className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
              </Button>
            </div>
            {open && <div className="max-h-[40vh] overflow-y-auto pb-1">{children}</div>}
          </div>
        </Command>
      </Menubar>
    </div>
  )
}
