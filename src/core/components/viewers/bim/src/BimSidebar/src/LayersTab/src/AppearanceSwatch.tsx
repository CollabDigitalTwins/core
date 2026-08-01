'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { cn } from '../../../../../../../../utils/utils'
import { Button } from '../../../../../../../ui/Button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../../../../../ui/Popover'
import { Slider } from '../../../../../../../ui/Slider'

import { useAppearance } from './AppearanceProvider'

import type { AppearanceSource } from '../../../../lib/appearanceOverrides'

/** What the picker opens on for a node that has no colour yet: the app accent. */
const DEFAULT_PICKER_COLOR = '#73cee2'

/**
 * Floor for the opacity slider. Zero would make the element invisible, which the
 * row's visibility switch already does — and an invisible element cannot be
 * clicked to get back, so it reads as a bug rather than a setting.
 */
const MIN_OPACITY_PERCENT = 10

function toHex(color: number | undefined): string | undefined {
  if (color === undefined) return undefined
  return `#${color.toString(16).padStart(6, '0')}`
}

interface Props {
  source: AppearanceSource
  nodeId: string
  /** The node's label, for the accessible name of the trigger. */
  label: string
}

/**
 * The little circle at the left of a tree row: colour and opacity for that node
 * and everything under it.
 *
 * Kept deliberately quiet — an empty outline until the node carries an override,
 * then filled with its colour at its opacity, so the tree reads as a tree rather
 * than as a palette.
 */
export function AppearanceSwatch({ source, nodeId, label }: Props) {
  const t = useTranslations('LayersTab')
  const { overrideFor, setAppearance, endCoalescing, clearNode } = useAppearance()

  const override = overrideFor(source, nodeId)
  const hex = toHex(override?.color)
  const opacityPercent = Math.round((override?.opacity ?? 1) * 100)
  const isSet = override !== undefined

  // The native picker streams changes while the user moves around in it, and the
  // slider fires on every tick, so both fold into one undo step per interaction.
  const onColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number.parseInt(event.target.value.replace('#', ''), 16)
    if (!Number.isNaN(next)) {
      setAppearance(source, nodeId, { color: next }, `color:${source}:${nodeId}`)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          // The row itself selects the node on click; this must not.
          onClick={event => event.stopPropagation()}
          title={t('appearanceTitle')}
          aria-label={t('appearanceLabel', { name: label })}
          className={cn(
            'relative h-3 w-3 flex-shrink-0 rounded-full border transition-opacity',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            isSet
              ? 'border-foreground/40'
              : 'border-muted-foreground/60 opacity-40 group-hover:opacity-100 focus-visible:opacity-100',
          )}
        >
          {isSet && (
            <span
              className="absolute inset-0 rounded-full"
              style={{
                backgroundColor: hex ?? 'currentColor',
                // Hints at the opacity without letting the dot fade to nothing —
                // an invisible indicator cannot tell you the row is overridden.
                opacity: Math.max(0.35, override.opacity ?? 1),
              }}
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-48 space-y-3 p-3"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <label
            title={t('colorTitle')}
            className="relative inline-block h-5 w-5 flex-shrink-0 cursor-pointer overflow-hidden rounded-full border border-foreground/20"
            style={{ backgroundColor: hex ?? DEFAULT_PICKER_COLOR }}
          >
            <input
              type="color"
              value={hex ?? DEFAULT_PICKER_COLOR}
              onChange={onColorChange}
              onBlur={endCoalescing}
              aria-label={t('colorTitle')}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          <span className="font-mono text-xs uppercase text-muted-foreground">
            {hex ?? '—'}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('opacityLabel')}</span>
            <span className="tabular-nums text-muted-foreground">{opacityPercent}%</span>
          </div>
          <Slider
            className="mt-2"
            value={[opacityPercent]}
            min={MIN_OPACITY_PERCENT}
            max={100}
            step={5}
            onValueChange={([next]) =>
              setAppearance(
                source,
                nodeId,
                { opacity: next / 100 },
                `opacity:${source}:${nodeId}`,
              )
            }
            onValueCommit={endCoalescing}
            aria-label={t('opacityLabel')}
          />
        </div>

        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={!isSet}
            onClick={() => clearNode(source, nodeId)}
          >
            {t('resetNodeLabel')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
