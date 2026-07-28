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
  /** Heading, beside the optional count badge. A node lets a card make its title interactive. */
  title: React.ReactNode
  /** Used for the collapse button's accessible name when `title` is not a plain string. */
  titleLabel?: string
  /** Rendered in a badge before the title. Omit for a card that is not counting anything. */
  count?: number
  /** Collapsed body. Only mounted while the card is open. */
  children: React.ReactNode
  defaultOpen?: boolean
  /** Renders an X beside the chevron. Omit for a card that cannot be dismissed. */
  onClose?: () => void
  closeLabel?: string
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
  titleLabel,
  count,
  children,
  defaultOpen = true,
  onClose,
  closeLabel,
  testId,
  countTestId,
}: LegendCardProps): React.ReactElement {
  const [open, setOpen] = React.useState(defaultOpen)
  const label = titleLabel ?? (typeof title === 'string' ? title : undefined)

  return (
    <div data-testid={testId} className="pointer-events-auto">
      {/* Never wider than the viewport: on a phone a fixed 18rem card runs under the map's
          right-hand controls and off the screen. */}
      <Menubar className="w-[min(18rem,calc(100vw-1.5rem))] h-auto">
        <Command>
          <div>
            <div className={`flex items-center justify-between gap-3 ${open ? 'p-3' : 'pl-1 py-0'}`}>
              <div className="flex items-center gap-2">
                {count !== undefined && <Badge data-testid={countTestId}>{count}</Badge>}
                <div className="text-sm font-medium">{title}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1 pr-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(o => !o)}
                  aria-expanded={open}
                  aria-label={label}
                  className="h-7 w-7 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
                >
                  <LR.ChevronUp
                    size={14}
                    className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                  />
                </Button>
                {onClose && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    aria-label={closeLabel}
                    title={closeLabel}
                    className="h-7 w-7 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
                  >
                    <LR.X size={14} />
                  </Button>
                )}
              </div>
            </div>
            {open && <div className="max-h-[40vh] overflow-y-auto pb-1">{children}</div>}
          </div>
        </Command>
      </Menubar>
    </div>
  )
}
