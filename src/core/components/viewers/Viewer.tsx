'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ViewerNames } from '../../types'
import { BuildingsContext, MenusContext } from '../../store'
import { MapViewer } from './map/MapViewer'
// Deep file import (not the ui barrel): the barrel re-exports heavy modules
// (InfoSidebar, useFileUploadHandler, …) that would land in the eager map-route bundle.
import { SidebarTrigger } from '../ui/Sidebar'
import { UserSettings } from '../settings'
import { Toolbar } from '../Toolbar'
import { switchLanguage } from '../../utils/utils'
import { Organization } from '../../types/dbTypes'

// Code-split the heavy viewers: BimViewer pulls in ~456 KB gzipped of
// @thatopen/*, PointCloudViewer the Potree loader stack — loaded only when
// selected, so map-only sessions never pay their cost. MapViewer stays static
// because every user lands on it.
const BimViewer = dynamic(
  () => import('./bim/BimViewer').then(m => ({ default: m.BimViewer })),
  { ssr: false, loading: () => <ViewerLoadingFallback label="Loading BIM viewer…" /> },
)
const PointCloudViewer = dynamic(
  () => import('./pointcloud/PointCloudViewer').then(m => ({ default: m.PointCloudViewer })),
  { ssr: false, loading: () => <ViewerLoadingFallback label="Loading point cloud viewer…" /> },
)

// DataMenu transitively imports BimViewer (via FilePreview), so keep it lazy
// too — a static import would pull @thatopen + three/webgpu back into the eager
// bundle. Only rendered for the data viewers, so map-only sessions skip it.
const DataMenu = dynamic(
  () => import('./Data/DataMenu').then(m => ({ default: m.DataMenu })),
  { ssr: false, loading: () => <ViewerLoadingFallback label="Loading data…" /> },
)

// Styled to match the in-viewer loading card (see BimLoadingState): a soft
// backdrop-blurred overlay with a bordered card, spinner + label. Uses only
// Tailwind tokens + one lucide icon, so it adds no meaningful weight to the
// eager map-route bundle (Viewer.tsx is statically imported).
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
}

export function Viewer({ organization }: ViewerProps) {

  const searchParams = useSearchParams()
  const viewer = (searchParams.get('viewer') as ViewerNames) || ViewerNames.map

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

  // Check if viewer is valid based on appContent
  const isViewerValid = appContent.length === 0 || appContent.includes(viewer)
  
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
    if (defaultLanguage) switchLanguage(defaultLanguage)
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

  const selectedViewer = (
    <>
      {[ViewerNames.map, ViewerNames.bim, ViewerNames.pointcloud].includes(validViewer) && <SidebarTrigger />}
      <div style={{ height: '100%', width: '100%', position: 'relative' }}>
        <div style={{ display: validViewer === ViewerNames.map ? 'block' : 'none', width: '100%', height: '100%' }}>
          <MapViewer organization={organization} />
        </div>
        {validViewer === ViewerNames.bim && <BimViewer />}
        {validViewer === ViewerNames.pointcloud && <PointCloudViewer />}
        {[ViewerNames.buildings, ViewerNames.sites, ViewerNames.files, ViewerNames.land, ViewerNames.infrastructure, ViewerNames.extensions, ViewerNames.users].includes(validViewer) && (
          <DataMenu currentViewer={validViewer} />
        )}
        {[ViewerNames.settings].includes(validViewer) && (
          <UserSettings />
        )}
      </div>
    </>
  )

  return (
    <>
      {selectedViewer}
      <Toolbar viewer={validViewer} />
    </>
  )
}