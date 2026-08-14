'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Separator } from '../../sdk/components'
import { usePluginTranslations } from '../../sdk/messages'

import { ReadoutRow } from './ReadoutRow'

import type { PointCloudToolProps } from '{{CORE_ENTRY}}'
import type { ToolbarToolProps } from '../../sdk/types'

/**
 * `viewer` is `unknown` on purpose: Potree publishes no types, and a fabricated interface
 * would be worse than making you narrow it.
 *
 * This is the narrowing. Check for the member you are about to use, then use it. `ready` says
 * Potree has finished initialising; it is not a substitute for the check, because it tells
 * you nothing about the shape of what you were handed.
 */
function countClouds(viewer: unknown): number | null {
  if (typeof viewer !== 'object' || viewer === null) return null
  if (!('scene' in viewer)) return null

  const { scene } = viewer as { scene?: { pointclouds?: unknown } }

  return Array.isArray(scene?.pointclouds) ? scene.pointclouds.length : null
}

export function {{COMPONENT}}({ viewer, ready }: ToolbarToolProps & PointCloudToolProps) {
  const t = usePluginTranslations()

  const clouds = ready ? countClouds(viewer) : null

  return (
    <div className="w-60 p-1">
      <p className="px-2 py-1 text-sm font-medium">{t('title', '{{NAME}}')}</p>
      <Separator className="my-1" />

      {ready ? (
        <dl className="px-2 py-1 text-sm">
          <ReadoutRow
            label={t('clouds', 'Point clouds')}
            value={clouds === null ? t('unknown', 'Not reported') : String(clouds)}
          />
        </dl>
      ) : (
        <p className="px-2 py-1 text-sm text-muted-foreground">
          {t('waiting', 'Waiting for the point cloud…')}
        </p>
      )}
    </div>
  )
}
