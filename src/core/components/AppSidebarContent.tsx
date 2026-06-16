'use client'
import * as React from 'react'

// Dependencies
import { AppConfigContext, MapContext, useMenusContext } from '../store'
import { ViewerNames } from '../types/'

// Shadcn Components
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

import { Button } from './ui/Button'

// Custom Components
import LanguageSwitch from './LanguageSwitch'

// Icons
import * as LR from 'lucide-react'

import { Logo } from './Logo'
import { Separator } from './ui/Separator'
import { useTranslations } from 'next-intl'
import { Organization, Language } from '../types/dbTypes'
import { RoleNames } from '../types/global'
import { useSession } from 'next-auth/react'
import { useUserRole } from '../hooks/users/users'

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
}

export function AppSidebarContent({ organization, countrySubdivisionsData }: AppSidebarProps) {
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

  const allViewers: ViewerNames[] = [ViewerNames.extensions, ViewerNames.bim, ViewerNames.pointcloud, ViewerNames.sites, ViewerNames.infrastructure, ViewerNames.buildings, ViewerNames.files,];
  const appContent: ViewerNames[] = [ViewerNames.map];

  if (organization.appContent && organization.appContent.length > 0) {
    appContent.push(...organization.appContent as ViewerNames[]);
  } else {
    appContent.push(...allViewers);
  }

  const logoKey = organization?.logoKey
  const minioBaseUrl = process.env.NEXT_PUBLIC_MINIO_BUCKET_URL
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

  const { sidebarState, setOpenInfo, isMobile, openMobile } = useSidebar()

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


  return (
    <>
      <SidebarContent className='overflow-hidden'>
        <SidebarHeader className={`w-full pt-7  flex items-center justify-center ${isCollapsed ? 'items-center' : 'pl-4 items-start'}`}>
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
                                className={`${isCollapsed ? 'hidden' : 'inline'} ${
                                  active ? 'font-bold text-primary' : ''
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
                <SidebarMenuButton asChild>
                  <a 
                    href={item.url} 
                    className={`text-xs flex items-center gap-2 w-full ${isCollapsed ? 'justify-center p-2' : 'justify-start p-2'}`}
                    title={item.tooltip}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className={isCollapsed ? 'hidden' : 'inline'}>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarFooter>
    </>
  )
}