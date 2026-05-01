'use client'

// Dependencies
import * as React from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ViewerNames } from '../../types'
import { BuildingsContext, MenusContext } from '../../store'
import { BimViewer } from './bim/BimViewer'
import { PointCloudViewer } from './pointcloud/PointCloudViewer'
import { DataMenu } from './Data/DataMenu'
import { MapViewer } from './map/MapViewer'
import { SidebarTrigger } from '../ui'
import { UserSettings } from '../settings'
import { Toolbar } from '../Toolbar'
import { switchLanguage } from '../../utils/utils'
import { Organization } from '../../types/dbTypes'

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