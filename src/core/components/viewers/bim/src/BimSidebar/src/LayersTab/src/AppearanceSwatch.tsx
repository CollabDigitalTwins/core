'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { hexFromInt } from '../../../../../../../../utils/colourUtils'
import { cn } from '../../../../../../../../utils/utils'
import { Popover, PopoverContent, PopoverTrigger } from '../../../../../../../ui/Popover'

import { AppearanceControls } from './AppearanceControls'
import { useAppearance } from './AppearanceProvider'

import type { AppearanceSource } from '../../../../lib/appearanceOverrides'

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
  const { overrideFor } = useAppearance()

  const override = overrideFor(source, nodeId)
  const hex = hexFromInt(override?.color)
  const isSet = override !== undefined

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
        className="w-48 p-3"
        onClick={event => event.stopPropagation()}
      >
        <AppearanceControls source={source} nodeId={nodeId} />
      </PopoverContent>
    </Popover>
  )
}
