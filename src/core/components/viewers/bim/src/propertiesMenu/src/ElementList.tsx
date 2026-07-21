'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Badge } from '../../../../../ui/Badge'
import { Separator } from '../../../../../ui/Separator'

interface ElementListProps {
  selectedElementIds: number[]
  currentElementId: number | null
  onElementSelectAction: (elementId: string) => void
  elementNames?: Record<number, string>
}

export function ElementList({ selectedElementIds, currentElementId, onElementSelectAction, elementNames = {} }: ElementListProps) {
  // Translation
  const t = useTranslations('ElementList')

  if (selectedElementIds.length <= 1) return null

  return (
    <div className="space-y-3 pr-2">
      <div className="flex items-center gap-2">
        <LR.Layers className="h-4 w-4" />
        <span className="text-sm font-medium">
          {t('selectedElements')}
          {' '}
          (
          {selectedElementIds.length}
          )
        </span>
      </div>

      <div className="space-y-2 max-h-32 overflow-y-auto">
        {selectedElementIds.map(elementId => (
          <div
            key={elementId}
            className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
              currentElementId === elementId
                ? 'bg-primary/10 border border-primary'
                : 'bg-muted/50 hover:bg-muted'
            }`}
            onClick={() => onElementSelectAction(elementId.toString())}
          >
            <span className="text-sm font-medium">
              {elementNames[elementId] || `Element ${elementId}`}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {elementId}
              </Badge>
              {currentElementId === elementId && (
                <LR.Eye className="h-3 w-3 text-primary" />
              )}
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-4" />
    </div>
  )
}
