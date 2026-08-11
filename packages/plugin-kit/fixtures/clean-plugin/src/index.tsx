// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// A real plugin, written the way the kit tells an author to write one: TypeScript
// and JSX, built by `pluginPreset()`. It is a port of the hand-written
// `hello-mounted` plugin the runtime-loading spike used, so the two can be compared
// line for line.
//
// Every value import here is a **bare specifier** the preset leaves external. The
// browser resolves each one through the import map the host publishes, which points
// it at a shim handing back the host's own instance. That is what makes this share
// React with the app rather than loading a second copy, which would break hooks
// outright.
//
// Deliberately absent: `three`, `@thatopen/components`, `maplibre-gl`,
// `lucide-react`. The map arrives as a prop and the icon is named by string, so a
// plugin never imports the heavy viewer libraries. `maplibre-gl` appears only as a
// type, through the kit's map surface, and types are erased before the bundle.

import { useEffect, useState } from 'react'

import { Button, Separator } from '@collabdt/core/plugins-sdk/components'
import { usePluginConfig } from '@collabdt/core/plugins-sdk/config'
import { usePluginTranslations } from '@collabdt/core/plugins-sdk/messages'
import type { MapPluginContext, MapToolProps, ToolbarToolProps } from '@collabdt/plugin-kit/types/map'

interface View {
  lng: number
  lat: number
}

/**
 * Core wraps every toolbar contribution in the standard button-and-dropdown, built
 * from the `label` and `icon` in the registration below. This renders the panel
 * contents only: a plugin drawing its own floating card would end up inside the
 * toolbar strip.
 *
 * `map` is null until MapLibre has finished initialising, so it is guarded rather
 * than asserted.
 */
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
    // Without this the handler keeps firing after the user switches viewers.
    return () => {
      map.off('move', read)
    }
  }, [map])

  return (
    <div className="w-60 p-1">
      <p className="px-2 py-1 text-sm font-medium">{t('title', 'Hello Mounted')}</p>
      <p className="px-2 pb-1 text-xs text-muted-foreground">
        {t('loadedFrom', 'Loaded at runtime, not compiled in.')}
      </p>
      <Separator className="my-1" />

      {view ? (
        <dl className="px-2 py-1 text-sm">
          <Row label={t('latitude', 'Latitude')} value={view.lat.toFixed(decimals)} />
          <Row label={t('longitude', 'Longitude')} value={view.lng.toFixed(decimals)} />
        </dl>
      ) : (
        <p className="px-2 py-1 text-sm text-muted-foreground">{t('waiting', 'Waiting for the map…')}</p>
      )}

      {/* The point of the counter: local state in a runtime-loaded component. Under
          a duplicated React this throws "invalid hook call" instead of counting. */}
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

/**
 * The entry point. The host calls this once, after the administrator has made the
 * plugin available and the user has it switched on, never merely because the folder
 * is mounted.
 */
export function activate(ctx: MapPluginContext) {
  ctx.register('map.tools', {
    id: 'hello-mounted',
    label: 'Hello Mounted',
    // Named by string so the plugin does not import lucide-react.
    icon: 'PackageOpen',
    component: HelloMountedTool,
    stayActive: true,
  })
}
