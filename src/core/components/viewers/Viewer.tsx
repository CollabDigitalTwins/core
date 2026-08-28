'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import * as React from 'react'

import { parsePluginViewerKey } from '../../plugins/host/pluginViewerKey'
import { BuildingsContext, MenusContext } from '../../store'
import { ViewerNames } from '../../types'

// Deep import, not the ui barrel: the barrel drags heavy modules into the eager map bundle.
import { switchLanguage } from '../../utils/utils'
import { UserSettings } from '../settings'
import { Toolbar } from '../Toolbar'
import { SidebarTrigger } from '../ui/Sidebar'

import { MapViewer } from './map/MapViewer'
import { isViewerAllowed } from './viewerAccess'

import type { Organization, ViewerKey } from '../../types/dbTypes'

// Code-split: map-only sessions must not pay for @thatopen or the Potree stack.
const BimViewer = dynamic(
  () => import('./bim/BimViewer').then(m => ({ default: m.BimViewer })),
  { ssr: false, loading: () => <ViewerLoadingFallback label="Loading BIM viewer…" /> },
)
const PointCloudViewer = dynamic(
  () => import('./pointcloud/PointCloudViewer').then(m => ({ default: m.PointCloudViewer })),
  { ssr: false, loading: () => <ViewerLoadingFallback label="Loading point cloud viewer…" /> },
)

// DataMenu reaches BimViewer through FilePreview, so a static import undoes the split above.
const PluginsManager = dynamic(
  () => import('./plugins/PluginsManager').then(m => ({ default: m.PluginsManager })),
  { ssr: false, loading: () => <ViewerLoadingFallback label="Loading plugins…" /> },
)

const DataMenu = dynamic(
  () => import('./Data/DataMenu').then(m => ({ default: m.DataMenu })),
  { ssr: false, loading: () => <ViewerLoadingFallback label="Loading data…" /> },
)

// Lazy too, or every plugin's page code lands in the eager bundle for every user.
const PluginDataPageHost = dynamic(
  () => import('../../plugins/host/PluginDataPageHost').then(m => ({ default: m.PluginDataPageHost })),
  { ssr: false, loading: () => <ViewerLoadingFallback label="Loading page…" /> },
)

// Matches BimLoadingState using only Tailwind tokens, so the eager bundle stays light.
function ViewerLoadingFallback({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
      <div className="flex items-center gap-3 rounded-md border border-border bg-card px-5 py-4 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-foreground text-base font-medium font-['Inter'] leading-7">{label}</span>
      </div>
    </div>
  )
}

interface ViewerProps {
  organization: Organization
  minioBaseUrl?: string
  martinBaseUrl?: string
  pointcloudApiUrl?: string
  maptilerKey?: string
  geocodeEarthApiKey?: string
  geocoderUrl?: string
}

export function Viewer({ organization, minioBaseUrl, martinBaseUrl, pointcloudApiUrl, maptilerKey, geocodeEarthApiKey, geocoderUrl }: ViewerProps) {

  const searchParams = useSearchParams()
  const viewer = (searchParams.get('viewer') as ViewerKey) || ViewerNames.map

  const { dispatch: menusDispatch, state: menusState } = React.useContext(MenusContext)
  const { state: buildingState } = React.useContext(BuildingsContext)
  // const { dispatch: appConfigDispatch } = React.useContext(AppConfigContext)
  const { building } = buildingState.buildings
  const { currentViewer } = menusState.menus
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = React.useState(false)

  // Use a ref to track if we're currently updating -> prevent circular updates
  const isUpdatingRef = React.useRef(false)

    const { appContent } = organization

  const pluginPage = parsePluginViewerKey(viewer)
  const isViewerValid = isViewerAllowed(viewer, appContent)

  // Use default viewer (map) if current viewer is not valid
  const validViewer = isViewerValid ? viewer : ViewerNames.map

  // Update URL if viewer was not available for the organization
  React.useEffect(() => {
    if (isMounted && !isViewerValid && viewer !== ViewerNames.map) {
      const newSearchParams = new URLSearchParams(searchParams.toString())
      newSearchParams.delete('viewer')
      if (building?.id) {
        newSearchParams.set('buildingId', String(building.id))
      }
      router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false })
    }
  }, [isMounted, isViewerValid, viewer, searchParams, pathname, router, building?.id])

  // On first mount, respond to URL
  React.useEffect(() => {
    if (!isMounted) {
      menusDispatch({
        type: 'SET_VIEWER',
        payload: { currentViewer: validViewer },
      })
      setIsMounted(true)
    }
  }, [isMounted, validViewer, menusDispatch])

  React.useEffect(() => {
    if (!organization) return
    const defaultLanguage  = organization.languages?.[0] || 'En'
    if (defaultLanguage) void switchLanguage(defaultLanguage)
  }, [organization])

  // Handle context changes (from sidebar, HeaderButtons, etc.)
  React.useEffect(() => {
    if (!isMounted || !currentViewer || currentViewer === validViewer || isUpdatingRef.current) {
      return
    }

    isUpdatingRef.current = true

    // Create URLSearchParams to preserve existing search params

    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set('viewer', currentViewer)
    if (building?.id) {
      newSearchParams.set('buildingId', String(building.id))
    }


    router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false })

    // Reset the flag after a brief delay to allow the navigation to complete
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 100)
  }, [currentViewer, isMounted, pathname, router, viewer, searchParams])

  // Handle URL changes (direct navigation)
  React.useEffect(() => {
    if (isMounted && currentViewer !== validViewer && !isUpdatingRef.current) {
      isUpdatingRef.current = true

      menusDispatch({
        type: 'SET_VIEWER',
        payload: { currentViewer: validViewer },
      })

      // Reset the flag after a brief delay
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 100)
    }
  }, [validViewer, menusDispatch, isMounted, currentViewer])

  // Null while a plugin page shows, so the branches below stay exhaustive over ViewerNames.
  const builtInViewer = pluginPage ? null : (validViewer as ViewerNames)

  const selectedViewer = (
    <>
      {builtInViewer !== null
        && [ViewerNames.map, ViewerNames.bim, ViewerNames.pointcloud].includes(builtInViewer)
        && <SidebarTrigger />}
      <div style={{ height: '100%', width: '100%', position: 'relative' }}>
        <div style={{ display: builtInViewer === ViewerNames.map ? 'block' : 'none', width: '100%', height: '100%' }}>
          <MapViewer organization={organization} maptilerKey={maptilerKey} />
        </div>
        {builtInViewer === ViewerNames.bim && <BimViewer pointcloudApiUrl={pointcloudApiUrl} />}
        {builtInViewer === ViewerNames.pointcloud && <PointCloudViewer pointcloudApiUrl={pointcloudApiUrl} />}
        {builtInViewer !== null
          && [ViewerNames.buildings, ViewerNames.sites, ViewerNames.files, ViewerNames.land, ViewerNames.infrastructure, ViewerNames.users].includes(builtInViewer) && (
          <DataMenu currentViewer={builtInViewer} organization={organization} geocodeEarthApiKey={geocodeEarthApiKey} geocoderUrl={geocoderUrl} />
        )}
        {/* `plugins` used to route through DataMenu, which rendered nothing:
            VIEWER_CONFIG gives it no dataType. It has its own page now. */}
        {builtInViewer === ViewerNames.extensions && (
          <div className="h-full w-full overflow-y-auto">
            <PluginsManager />
          </div>
        )}
        {builtInViewer === ViewerNames.settings && (
          <UserSettings minioBaseUrl={minioBaseUrl} />
        )}
        {pluginPage && (
          <div className="h-full w-full overflow-y-auto">
            <PluginDataPageHost viewer={validViewer} />
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {selectedViewer}
      <Toolbar viewer={validViewer} minioBaseUrl={minioBaseUrl} martinBaseUrl={martinBaseUrl} organization={organization} geocodeEarthApiKey={geocodeEarthApiKey} geocoderUrl={geocoderUrl} />
    </>
  )
}