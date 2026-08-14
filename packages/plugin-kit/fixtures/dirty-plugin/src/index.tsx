// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// The clean fixture with one line added: an import of `three`. Its build must fail.
//
// `three` is genuinely installed here, which is the whole point. Absent, esbuild would
// fail on module *resolution* — red for a reason that proves nothing about the guard.
// Installed, it is resolved and inlined, and the guard's bundled-package check is what
// rejects the build. The test asserts on the guard's own wording so the two cannot be
// confused.

import { useEffect, useState } from 'react'
import * as THREE from 'three'

import { Button, Separator } from '@collabdt/core/plugins-sdk/components'
import { usePluginConfig } from '@collabdt/core/plugins-sdk/config'
import { usePluginTranslations } from '@collabdt/core/plugins-sdk/messages'
import type { MapPluginContext, MapToolProps, ToolbarToolProps } from '@collabdt/plugin-kit/types/map'

// Read at module scope and rendered below, so tree-shaking cannot drop the import.
const version = THREE.REVISION

interface View {
  lng: number
  lat: number
}

function HelloMountedTool({ map }: ToolbarToolProps & MapToolProps) {
  const t = usePluginTranslations()
  const { decimals = 4 } = usePluginConfig() as { decimals?: number }

  const [view, setView] = useState<View | null>(null)
  const [clicks, setClicks] = useState(0)

  useEffect(() => {
    if (!map) return

    const read = () => {
      const centre = map.getCenter()
      setView({ lng: centre.lng, lat: centre.lat })
    }

    read()
    map.on('move', read)
    return () => {
      map.off('move', read)
    }
  }, [map])

  return (
    <div className="w-60 p-1">
      <p className="px-2 py-1 text-sm font-medium">{t('title', 'Hello Mounted')}</p>
      <p className="px-2 pb-1 text-xs text-muted-foreground">three r{version}</p>
      <Separator className="my-1" />

      {view ? (
        <dl className="px-2 py-1 text-sm">
          <Row label={t('latitude', 'Latitude')} value={view.lat.toFixed(decimals)} />
          <Row label={t('longitude', 'Longitude')} value={view.lng.toFixed(decimals)} />
        </dl>
      ) : (
        <p className="px-2 py-1 text-sm text-muted-foreground">{t('waiting', 'Waiting for the map…')}</p>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="mt-1 w-full justify-between font-normal"
        onClick={() => setClicks(count => count + 1)}
      >
        {t('clicks', 'Clicks')}
        <span className="tabular-nums">{String(clicks)}</span>
      </Button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

export function activate(ctx: MapPluginContext) {
  ctx.register('map.tools', {
    id: 'dirty-plugin',
    label: 'Dirty Plugin',
    icon: 'PackageOpen',
    component: HelloMountedTool,
    stayActive: true,
  })
}
