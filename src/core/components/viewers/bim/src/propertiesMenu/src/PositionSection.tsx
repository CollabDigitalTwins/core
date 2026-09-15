'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button } from '../../../../../ui/Button'
import { NumberField } from '../../Placement/NumberField'
import { AXES, WORLD_AXIS, toDegrees, toRadians } from '../../Placement/placementAxes'
import { narrowPlacement } from '../../Placement/placementTarget'
import { usePlacementSession } from '../../Placement/usePlacementSession'

import type { PointCloudPlacement } from '../../../../shared/pointcloud/pointCloudPlacement'
import type { PlacementTarget } from '../../Placement/placementTarget'

const COMMIT_DELAY_MS = 400

export interface PositionSectionProps {
  target: PlacementTarget | null
  isExpanded: boolean
  onToggleAction: (groupId: string) => void
  onEditInViewport: () => void
  /** Shown under the header when the target is not the thing the user clicked, such as a whole model. */
  hint?: string
}

export function PositionSection({ target, isExpanded, onToggleAction, onEditInViewport, hint }: PositionSectionProps) {
  const t = useTranslations('PropertiesMenu')
  const session = usePlacementSession()

  const [placement, setPlacement] = React.useState<PointCloudPlacement | null>(null)
  React.useEffect(() => { setPlacement(target?.read() ?? null) }, [target])

  // The gizmo writes the target directly, so the fields follow the live session rather than the reverse.
  React.useEffect(() => {
    if (session && session.id === target?.id) setPlacement(session.placement)
  }, [session, target])

  const commitRef = React.useRef<number | null>(null)
  React.useEffect(() => () => { if (commitRef.current !== null) clearTimeout(commitRef.current) }, [])

  const change = React.useCallback((next: PointCloudPlacement) => {
    if (!target) return
    const narrowed = narrowPlacement(next, target.capabilities)
    setPlacement(narrowed)
    target.apply(narrowed)

    if (commitRef.current !== null) clearTimeout(commitRef.current)
    commitRef.current = window.setTimeout(() => { void target.commit(narrowed) }, COMMIT_DELAY_MS)
  }, [target])

  if (!target || !placement) return null

  return (
    <div className="space-y-2 p-3">
      <button
        onClick={() => onToggleAction('position')}
        className="flex items-center justify-between w-full pr-2 text-left hover:bg-muted/50 rounded-md transition-colors"
      >
        <div className="flex items-center gap-2">
          <LR.Axis3d className="h-4 w-4" />
          <span className="text-sm font-medium">{t('position')}</span>
        </div>
        <LR.ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="pl-6 space-y-2">
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          <div className="grid grid-cols-3 gap-1">
            {AXES.map((axis, index) => (
              <NumberField
                key={axis}
                label={axis}
                value={placement.position[WORLD_AXIS[index]]}
                step={0.1}
                onCommit={(value) => {
                  const position = [...placement.position] as [number, number, number]
                  position[WORLD_AXIS[index]] = value
                  change({ ...placement, position })
                }}
              />
            ))}
          </div>
          <NumberField
            label={t('rotation')}
            value={toDegrees(placement.rotation[1])}
            step={1}
            onCommit={(degrees) => {
              const rotation = [...placement.rotation] as [number, number, number]
              rotation[1] = toRadians(degrees)
              change({ ...placement, rotation })
            }}
          />
          {target.capabilities.scale && (
            <NumberField
              label={t('scale')}
              value={placement.scale}
              step={0.01}
              min={0.001}
              onCommit={scale => change({ ...placement, scale })}
            />
          )}
          <Button variant="outline" size="sm" onClick={onEditInViewport}>{t('editInViewport')}</Button>
        </div>
      )}
    </div>
  )
}
