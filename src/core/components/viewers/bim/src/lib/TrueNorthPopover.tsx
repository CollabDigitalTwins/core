'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button } from '../../../../ui/Button'
import { Input } from '../../../../ui/Input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../../ui/Popover'

interface Props {
  /** The open plan's model project north, in degrees (-180, 180]. */
  northAngle: number
  /** Whether the floorplan tool is currently waiting for a line click. */
  pickingNorth: boolean
  /** Disabled when no floorplan is open, or its model has no file to save to. */
  disabled: boolean
  onChangeAngle: (degrees: number) => void
  onStartPick: () => void
  onCancelPick: () => void
}

/**
 * Compass button whose popover sets the open plan's model project north: a typed angle, or a line
 * drawn with two clicks on the plan that the model then turns square to. Esc cancels the line.
 */
export function TrueNorthPopover({
  northAngle,
  pickingNorth,
  disabled,
  onChangeAngle,
  onStartPick,
  onCancelPick,
}: Props) {
  const t = useTranslations('ViewSection')
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<string>(formatAngle(northAngle))

  // A line pick changes the angle from outside the input.
  React.useEffect(() => {
    setDraft(formatAngle(northAngle))
  }, [northAngle])

  // Close the popover automatically when the user kicks off a line pick.
  React.useEffect(() => {
    if (pickingNorth) setOpen(false)
  }, [pickingNorth])

  const commitDraft = () => {
    const value = Number(draft)
    if (!Number.isFinite(value)) {
      setDraft(formatAngle(northAngle))
      return
    }
    onChangeAngle(value)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0"
          title={t('trueNorthTitle')}
          disabled={disabled}
        >
          <LR.Compass className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('trueNorthTitle')}
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">
              {t('trueNorthAngleLabel')}
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={-180}
                max={180}
                step={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitDraft()
                    e.currentTarget.blur()
                  }
                }}
                className="h-8 text-sm"
                disabled={disabled}
              />
              <span className="text-xs text-muted-foreground">°</span>
            </div>
          </label>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-8 text-xs"
            disabled={disabled || pickingNorth}
            onClick={onStartPick}
          >
            <LR.MousePointerClick className="h-3.5 w-3.5" />
            {pickingNorth ? t('trueNorthPicking') : t('trueNorthPickLine')}
          </Button>

          {pickingNorth && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={onCancelPick}
            >
              {t('trueNorthCancelPick')}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs"
            disabled={disabled || northAngle === 0}
            onClick={() => onChangeAngle(0)}
          >
            <LR.RotateCcw className="h-3 w-3 mr-1" />
            {t('trueNorthReset')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function formatAngle(degrees: number): string {
  // Whole numbers stay clean when typed; a picked angle keeps one decimal.
  const rounded = Math.round(degrees * 10) / 10
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)
}
