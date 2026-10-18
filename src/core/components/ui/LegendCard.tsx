'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import { cn } from '../../utils/utils'

import { Badge } from './Badge'
import { Button } from './Button'
import { Command } from './Command'
import { Menubar } from './Menubar'

// Capped at the viewport so a phone-width card never runs under the map's right-hand controls.
const DEFAULT_WIDTH = 'w-[min(18rem,calc(100vw-1.5rem))]'

const HEADER_BUTTON = 'h-7 w-7 text-muted-foreground hover:text-foreground'

export interface LegendCardProps {
  /** Heading, before the optional count badge. A node lets a card make its title interactive. */
  title: React.ReactNode
  /** Used for the collapse button's accessible name when `title` is not a plain string. */
  titleLabel?: string
  /** Rendered in a badge after the title. Omit for a card that is not counting anything. */
  count?: number
  /** Collapsed body. Only mounted while the card is open. */
  children: React.ReactNode
  defaultOpen?: boolean
  /** Controls the collapse state; pair with `onOpenChange`. Omit to let the card own it. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Renders an X beside the chevron. Omit for a card that cannot be dismissed. */
  onClose?: () => void
  closeLabel?: string
  /** Merged onto the card shell, e.g. a width in place of the viewport-capped 18rem. */
  className?: string
  testId?: string
  countTestId?: string
}

/**
 * The floating card chrome shared by every viewer overlay in the bottom-left stack: title, count
 * badge and chevron collapse. Presentation only; callers decide when it exists and supply the body.
 */
export function LegendCard({
  title,
  titleLabel,
  count,
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  onClose,
  closeLabel,
  className,
  testId,
  countTestId,
}: LegendCardProps): React.ReactElement {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  const label = titleLabel ?? (typeof title === 'string' ? title : undefined)

  const toggle = () => {
    setUncontrolledOpen(!open)
    onOpenChange?.(!open)
  }

  return (
    <div data-testid={testId} className="pointer-events-auto">
      <Menubar className={cn('h-auto flex-col items-stretch p-0', DEFAULT_WIDTH, className)}>
        <Command>
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-sm font-semibold">{title}</span>
              {count !== undefined && (
                <Badge data-testid={countTestId} className="h-5 min-w-5 justify-center rounded-full px-1.5 text-xs tabular-nums">
                  {count}
                </Badge>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-expanded={open}
                aria-label={label}
                onClick={toggle}
                className={HEADER_BUTTON}
              >
                <LR.ChevronUp size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label={closeLabel}
                  title={closeLabel}
                  className={HEADER_BUTTON}
                >
                  <LR.X size={14} />
                </Button>
              )}
            </div>
          </div>
          {open && <div className="max-h-[40vh] overflow-y-auto border-t">{children}</div>}
        </Command>
      </Menubar>
    </div>
  )
}
