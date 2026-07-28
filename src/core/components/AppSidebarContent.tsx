'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

// Dependencies
import { SupportMenu } from "../components/support/SupportMenu"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '../components/ui/Sidebar'
import { useUserRole } from '../hooks/users/users'
import { AppConfigContext, MapContext, useMenusContext } from '../store'
import { ViewerNames } from '../types/'
import { resolveAppContent } from '../utils/appContent'

// Shadcn Components

import LanguageSwitch from './LanguageSwitch'
import { Logo } from './Logo'
import { Button } from './ui/Button'

// Custom Components

// Icons

import { Separator } from './ui/Separator'


import type { Organization, Language } from '../types/dbTypes'
import type { RoleNames } from '../types/global'





export const handleChangeViewer = (
  viewer: ViewerNames,
  setSelectedItem: React.Dispatch<React.SetStateAction<any>>,
  setSelectedSite: React.Dispatch<React.SetStateAction<any>>,
  setSelectedFile: React.Dispatch<React.SetStateAction<any>>,
  setView: React.Dispatch<React.SetStateAction<'table' | 'detail'>>,
  menusDispatch: any,
) => {
  // Reset selected item, file, & view when changing viewer
  setSelectedItem(null)
  setSelectedSite(null)
  setSelectedFile(null)
  setView('table')

  menusDispatch({
    type: 'SET_VIEWER',
    payload: { currentViewer: viewer },
  })
}

interface AppSidebarProps {
  organization: Organization
  countrySubdivisionsData?: Record<string, string>;
  minioBaseUrl?: string
}

export function AppSidebarContent({ organization, countrySubdivisionsData, minioBaseUrl, }: AppSidebarProps) {
  // Translations
  const t = useTranslations('AppSidebar')

  const { dispatch: appConfigDispatch } = React.useContext(AppConfigContext)
  const { dispatch: mapDispatch } = React.useContext(MapContext)



  React.useEffect(() => {
    appConfigDispatch({
      type: 'SET_ORGANIZATION',
      payload: { organization },
    })
  }, [organization, appConfigDispatch])

  React.useEffect(() => {
    if (countrySubdivisionsData) {
      mapDispatch({
        type: 'SET_COUNTRY_SUBDIVISIONS',
        payload: { countrySubdivisionsData, organizationCountry: organization.country },
      })
    }
  }, [countrySubdivisionsData, mapDispatch, organization.country])

  const sidebarTitle = organization?.title ?? organization.name ?? 'CDT Platform'

  // Shared with the map popover's tool row, so a viewer hidden here is not reachable from there.
  const appContent = resolveAppContent(organization)

  const logoKey = organization?.logoKey
  const logoUrl = minioBaseUrl && logoKey
    ? `${minioBaseUrl}/org-logos/${logoKey}`
    : '/images/cdt-logo-stroke.svg'


  const { dispatch: menusDispatch, state: menusState } = useMenusContext()
  const { setSelectedItem, setSelectedSite, setSelectedFile, setView } = useMenusContext()

  const { data: session } = useSession()
  const { userRole } = useUserRole(session?.user?.id || '')
  const normalizedUserRoles = React.useMemo(
    () => new Set(userRole?.name ? [userRole.name.trim().toLowerCase()] : []),
    [userRole]
  )

  const {
    sidebarState, setOpenInfo, isMobile, openMobile, setOpenMobile,
    setBugReportOpen, setFeatureRequestOpen,
  } = useSidebar()

  const changeViewer = (viewer: ViewerNames) => {
    handleChangeViewer(viewer, setSelectedItem, setSelectedSite, setSelectedFile, setView, menusDispatch)
    setOpenInfo(false)
  }

  const handleMapClick = () => {
    changeViewer(ViewerNames.map)
  }

  interface MenuItem {
    title: string
    id: ViewerNames | string
    icon: React.ElementType
    onClick?: () => void
    accessibleTo?: RoleNames[],
    url?: string
    tooltip?: string
  }

  // Sidebar menu items
  const viewerItems: MenuItem[] = [
    {
      title: t('mapTitle'),
      id: ViewerNames.map,
      icon: LR.Map,
      onClick: handleMapClick,
    },
    {
      title: t('bimTitle'),
      id: ViewerNames.bim,
      icon: LR.Box,
      onClick: () => changeViewer(ViewerNames.bim),
    },
    {
      title: t('pointCloudTitle'),
      id: ViewerNames.pointcloud,
      icon: LR.Grip,
      onClick: () => changeViewer(ViewerNames.pointcloud),
    }
  ]

  const datasetItems: MenuItem[] = [
    {
      title: t('siteTitle'),
      id: ViewerNames.sites,
      onClick: () => changeViewer(ViewerNames.sites),
      icon: LR.BoxSelect,
    },
    {
      title: t('buildingsTitle'),
      id: ViewerNames.buildings,
      icon: LR.Building2,
      onClick: () => changeViewer(ViewerNames.buildings),
    },
    {
      title: t('filesTitle'),
      id: ViewerNames.files,
      icon: LR.GalleryVerticalEnd,
      onClick: () => changeViewer(ViewerNames.files),
    },
    // {
    //   title: t('landTitle'),
    //   id: ViewerNames.land,
    //   icon: LR.Mountain,
    //   onClick: () => changeViewer(ViewerNames.land),
    // },
    {
      title: t('infrastructureTitle'),
      id: ViewerNames.infrastructure,
      icon: LR.TrainTrack,
      onClick: () => changeViewer(ViewerNames.infrastructure),
    },

  ]

  const managementItems: MenuItem[] = [
    // {
    //   title: t('users'),
    //   id: ViewerNames.users,
    //   onClick: () => changeViewer(ViewerNames.users),
    //   icon: LR.Users,
    //   accessibleTo: [RoleNames.admin],
    // },
    {
      title: t('addExtensions'),
      id: ViewerNames.extensions,
      icon: LR.Blocks,
      onClick: () => changeViewer(ViewerNames.extensions),
    }
  ]

  // Sidebar footer items
  const serviceItems: MenuItem[] = [
    {
      title: t('support'),
      id: 'support',
      url: 'mailto:info@collabdt.org?subject=Support Request - CDT Platform',
      icon: LR.LifeBuoy,
      tooltip: t('contact')
    },
    // {
    //   title: t('feedback'),
    //   url: 'mailto:info@collabdt.org?subject=Feedback - CDT Platform',
    //   icon: LR.Send,
    // },
  ]
  const { currentViewer } = menusState.menus

  // On mobile, treat the sheet open as expanded so labels render when the drawer is visible
  const isCollapsed = isMobile ? !openMobile : sidebarState === 'collapsed'

  const buildBtnClass = (active: boolean) => [
    'text-sm flex items-center gap-2 w-full cursor-pointer transition-colors rounded-md',
    isCollapsed ? 'justify-center p-2' : 'justify-start p-2',
    active ? 'bg-primary/5 hover:bg-primary/10 border border-primary/15' : 'hover:bg-muted/50',
  ].join(' ')

  const buildIconClass = (active: boolean) => [
    'h-4 w-4 shrink-0',
    active ? 'text-primary stroke-2' : 'text-muted-foreground'
  ].join(' ')

  const canRenderItem = React.useCallback((item: MenuItem) => {
    if (item.accessibleTo == null) return true
    return item.accessibleTo.some(role => normalizedUserRoles.has(role.toLowerCase()))
  }, [normalizedUserRoles])

  const visibleDatasetItems = datasetItems
    .filter(item => !appContent || appContent.includes(item.id as ViewerNames))
    .filter(canRenderItem)

  // BugReportDialog/FeatureRequestDialog are rendered by AppSidebar, outside
  // the mobile Sheet's subtree — see the SidebarContext fields for why: this
  // component (AppSidebarContent) is itself the Sheet's children on mobile,
  // so a dialog rendered here would get unmounted along with the Sheet
  // shortly after closing it, right after it opens.
  // On mobile, also close the sidebar Sheet first so it doesn't end up behind
  // the dialog (e.g. visible in a "Capture Screenshot").
  const openBugDialog = () => {
    if (isMobile) setOpenMobile(false)
    setBugReportOpen(true)
  }
  const openFeatureDialog = () => {
    if (isMobile) setOpenMobile(false)
    setFeatureRequestOpen(true)
  }

  return (
    <>
      <SidebarContent className='overflow-hidden'>
        <SidebarHeader className={`w-full pt-7  flex items-center justify-center ${isCollapsed ? 'items-center' : 'px-2 items-start'}`}>
          <div className='flex flex-row items-center gap-3'>
            <Logo image={logoUrl} />
            {sidebarState === 'expanded'
              && <h1 className="text-sm font-bold max-w-36">{sidebarTitle}</h1>}
          </div>
        </SidebarHeader>
        {isCollapsed && <Separator className="z-30 w-2/3 mx-auto" />}

        <div className='overflow-y-auto overflow-x-hidden'>
          <SidebarGroup>
            <SidebarGroupLabel>{t('3dViewer')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {viewerItems.filter(item => !appContent || appContent.includes(item.id as ViewerNames))
                  .filter(canRenderItem)
                  .map(item => {
                    const active = item.id === currentViewer;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <Button
                            onClick={item.onClick}
                            title={isCollapsed ? item.title : undefined}
                            className={buildBtnClass(active)}
                            variant="ghost"
                          >
                            <item.icon className={buildIconClass(active)} />
                            <span className={`${isCollapsed ? 'hidden' : 'inline'} ${active ? 'font-bold text-primary' : ''}`}>{item.title}</span>
                          </Button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })
                }
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>


          {visibleDatasetItems.length > 0 && (
            <>
              {isCollapsed && <Separator className="z-30 w-2/3 mx-auto" />}

              <SidebarGroup>
                <SidebarGroupLabel>{t('data')}</SidebarGroupLabel>

                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleDatasetItems.map(item => {
                      const active = item.id === currentViewer

                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <Button
                              onClick={item.onClick}
                              title={isCollapsed ? item.title : undefined}
                              className={buildBtnClass(active)}
                              variant="ghost"
                            >
                              <item.icon className={buildIconClass(active)} />
                              <span
                                className={`${isCollapsed ? 'hidden' : 'inline'} ${active ? 'font-bold text-primary' : ''
                                  }`}
                              >
                                {item.title}
                              </span>
                            </Button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
          {isCollapsed && <Separator className="z-30 w-2/3 mx-auto" />}
          <SidebarGroup>
            <SidebarGroupLabel>{t('extensions')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.filter(canRenderItem).map(item => {
                  const active = item.id === currentViewer
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Button
                          onClick={item.onClick}
                          title={isCollapsed ? item.title : undefined}
                          className={buildBtnClass(active)}
                          variant="ghost"
                        >
                          <item.icon className={buildIconClass(active)} />
                          <span className={`${isCollapsed ? 'hidden' : 'inline'} ${active ? 'font-bold text-primary' : ''}`}>{item.title}</span>
                        </Button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
      {/* Footer Content - only show when not in BIM mode or when collapsed */}
      <SidebarFooter className={`w-full flex flex-col gap-4 ${isCollapsed ? 'items-center justify-center px-0 pb-4' : 'items-start justify-start px-2 pb-4'}`}>
        {/* Preferences */}
        {organization.languages?.length > 1 && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('preferences')}</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <LanguageSwitch showLabel={sidebarState === 'expanded'} languages={organization.languages as Language[]} />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
        {/* Services */}
        <SidebarGroup>
          <SidebarGroupLabel>{t('service')}</SidebarGroupLabel>
          <SidebarMenu>
            {serviceItems.map((item, index) => (
              <SidebarMenuItem key={index}>
                {item.id === "support" ? (
                  <SupportMenu
                    isCollapsed={isCollapsed}
                    item={item}
                    onOpenBug={openBugDialog}
                    onOpenFeature={openFeatureDialog}
                  />
                ) : (
                  <SidebarMenuButton asChild>
                    <a
                      href={item.url}
                      className={`text-xs flex items-center gap-2 w-full ${isCollapsed ? "justify-center p-2" : "justify-start p-2"
                        }`}
                      title={item.tooltip}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className={isCollapsed ? "hidden" : "inline"}>
                        {item.title}
                      </span>
                    </a>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarFooter>
    </>
  )
}