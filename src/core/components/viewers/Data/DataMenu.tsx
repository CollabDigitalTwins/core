'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { handleApiError } from '../../../utils/errorHandler'

// Utils
import { useViewerData } from './utils/useViewerData'
import { VIEWER_CONFIG } from './utils/viewerConfig'

import type { Building, Site, User, Infrastructure, Organization } from '../../../types/dbTypes'
import type { FilterState } from '../../../types/global'

// Custom hooks
import { useBuildings, useCreateBuilding } from '../../../hooks/buildings/buildings'
import { useCreateSite, useSites } from '../../../hooks/sites/sites'
import { useFiles } from '../../../hooks/files/files'
import { useUsers } from '../../../hooks/users/users'

// Context
import { useMenusContext } from '../../../store'
import { useBuildingsContext } from '../../../store'
import { useFilesContext } from '../../../store'

// Types
import type { FileRow } from '../../../types/files'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../ui/Breadcrumb'
import { Button, Checkbox, DataTable, Input, Separator } from '../../ui/'

import type { BuildingDetailsRef } from './buildingDetails/BuildingDetails'
import type { SiteDetailsRef } from './siteDetails/SiteDetails'
import type { InfrastructureDetailsRef } from './infrastructureDetails/InfrastructureDetails'

import BuildingDetails from './buildingDetails/BuildingDetails'
import { FileDetails } from './files/FileDetails'

// Custom Components
import DetailActions from './details/DetailActions'
import DetailHeader from './details/DetailHeader'
import FilterButtons from './FilterButtons'
import HeaderButtons from './HeaderButtons'
import MoreOptions from './MoreOptions'
import SiteDetails from './siteDetails/SiteDetails'
import UserDetails from './userDetails/UserDetails'

// Data
import { useColumns, useUserColumns } from './utils/Columns'
import { useBuildingHeaders, useInfrastructureHeaders, useSiteHeaders } from './utils/Headers'
import { DataTypes, DataTypesNames, ViewerNames } from '../../../types'
import { useSession } from 'next-auth/react'
import InfrastructureDetails from './infrastructureDetails/InfrastructureDetails'
import { useCreateInfrastructure, useInfrastructures } from '../../../hooks/infrastructures/infrastructures'

type DataMenuProps = {
  currentViewer: ViewerNames
  height?: string
  hideFrame?: boolean
  hideTitle?: boolean
  hideActions?: boolean
  organization?: Organization
}

export function DataMenu({ currentViewer, height, hideTitle, hideActions, hideFrame, organization }: DataMenuProps) {
  // Translations
  const t = useTranslations('DataMenu')

  // View state
  const { view, setView } = useMenusContext()
  const { selectedItem, setSelectedItem } = useMenusContext()
  const { selectedSite, setSelectedSite } = useMenusContext()
  const { selectedInfrastructure, setSelectedInfrastructure } = useMenusContext()
  const { selectedFile, setSelectedFile } = useMenusContext()
  const { selectedUser, setSelectedUser } = useMenusContext()
  const { state: fileState } = useFilesContext()
  const { currentFile } = fileState.files

  // Search / filter state
  const [searchTerm, setSearchTerm] = React.useState('')
  const [activeFilters, setActiveFilters] = React.useState<FilterState[]>([])
  const [filters, setFilters] = React.useState([
    { id: 1, field: '', fieldType: null, operator: null, value: null, secondValue: null },
  ])

  const [dataType, setDataType] = React.useState<DataTypes>(DataTypesNames.building)
  const [editing, setEditing] = React.useState(false)
  const [activeChanges, setActiveChanges] = React.useState(false)

  // Tab headers
  const buildingHeaders = useBuildingHeaders()
  const siteHeaders = useSiteHeaders()
  const infrastructureHeaders = useInfrastructureHeaders()

  const buildingTabOptions = buildingHeaders.map(section => ({
    key: section.title.toLowerCase().replaceAll(/\s/g, '-'),
    label: section.title,
  }))
  const siteTabOptions = siteHeaders.map(section => ({
    key: section.title.toLowerCase().replaceAll(/\s/g, '-'),
    label: section.title,
  }))
  const infrastructureTabOptions = infrastructureHeaders.map(section => ({
    key: section.title.toLowerCase().replaceAll(/\s/g, '-'),
    label: section.title,
  }))

  const [activeBuildingTab, setActiveBuildingTab] = React.useState(buildingTabOptions[0]?.key || '')
  const [activeSiteTab, setActiveSiteTab] = React.useState(siteTabOptions[0]?.key || '')
  const [activeInfrastructureTab, setActiveInfrastructureTab] = React.useState(infrastructureTabOptions[0]?.key || '')

  // Reset active tab only when selected item ID changes
  const prevBuildingId = React.useRef<number | undefined>(undefined)
  const prevInfrastructureId = React.useRef<number | undefined>(undefined)

  React.useEffect(() => {
    if (currentViewer === ViewerNames.buildings && selectedItem?.id !== prevBuildingId.current) {
      setActiveBuildingTab(buildingTabOptions[0]?.key || '')
      prevBuildingId.current = selectedItem?.id
    }
    if (currentViewer === ViewerNames.infrastructure && selectedInfrastructure?.id !== prevInfrastructureId.current) {
      setActiveInfrastructureTab(infrastructureTabOptions[0]?.key || '')
      prevInfrastructureId.current = selectedInfrastructure?.id
    }
  }, [selectedItem?.id, selectedInfrastructure?.id, currentViewer])

  const [newItemName, setNewItemName] = React.useState('')

  // Compare state
  const {
    compareItems,
    setCompareItems,
    comparing,
    setComparing,
    addItemToCompare,
    removeItemFromCompare,
  } = useBuildingsContext()

  // Sync dataType with current viewer
  React.useEffect(() => {
    setDataType(DataTypesNames[currentViewer])
  }, [currentViewer])

  // Reset compare state when viewer changes
  React.useEffect(() => {
    setComparing(false)
    setCompareItems([])
  }, [currentViewer, setComparing, setCompareItems])

  // Data fetching
  const { buildings, isLoading: buildingsLoading, isError: buildingsError } = useBuildings()
  const { sites, isLoading: sitesLoading, isError: sitesError } = useSites()
  const { infrastructures, isLoading: infrastructuresLoading, isError: infrastructuresError } = useInfrastructures()
  const { files, isLoading: filesLoading, isError: filesError } = useFiles()
  const { users, isLoading: usersLoading, isError: usersError } = useUsers()

  const { createError: createSiteError } = useCreateSite()
  const { createError: createBuildingError } = useCreateBuilding()
  const { createError: createInfrastructureError } = useCreateInfrastructure()

  React.useEffect(() => {
    handleApiError(buildingsError)
    handleApiError(sitesError)
    handleApiError(filesError)
    handleApiError(infrastructuresError)
    handleApiError(usersError)
    handleApiError(createSiteError)
    handleApiError(createBuildingError)
    handleApiError(createInfrastructureError)
  }, [buildingsError, sitesError, infrastructuresError, filesError, usersError, createSiteError, createBuildingError, createInfrastructureError])

  const tableColumns = useColumns(buildings || [])
  const userColumns = useUserColumns()

  const { user } = useSession().data

  // Viewer config — resolves icon and i18n title key
  const viewerConfig = VIEWER_CONFIG[currentViewer]
  const headerTitle = t(viewerConfig.titleKey)
  const MenuIcon = viewerConfig.icon

  // Derived data, filtered data, and filter options — all per-viewer logic lives in this hook
  const { data, filteredData, filtersOptions, isLoading } = useViewerData({
    currentViewer,
    buildings,
    sites,
    infrastructures,
    files,
    users,
    loadingFlags: {
      buildings: buildingsLoading,
      sites: sitesLoading,
      infrastructures: infrastructuresLoading,
      files: filesLoading,
      users: usersLoading,
    },
    searchTerm,
    activeFilters,
    filters,
    userEmail: user?.email || '',
  })

  const openedCurrentFileIdRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (currentViewer !== ViewerNames.files || !currentFile) return
    if (openedCurrentFileIdRef.current === currentFile.id) return

    const fileRow = data.find((item): item is FileRow => String(item.id) === String(currentFile.id))
    if (!fileRow) return

    openedCurrentFileIdRef.current = currentFile.id
    setSelectedFile(fileRow)
    setView('detail')
  }, [currentViewer, currentFile, data, setSelectedFile, setView])

  // Breadcrumb title — derives the detail page label from whichever item is selected
  const breadcrumbTitle = React.useMemo(() => {
    if (selectedItem) return selectedItem.buildingName || selectedItem.buildingAddress
    if (selectedSite) return selectedSite.siteName || selectedSite.siteAddress
    if (selectedInfrastructure) return selectedInfrastructure.infrastructureName || selectedInfrastructure.infrastructureType
    if (selectedFile) return selectedFile.name
    if (selectedUser) return selectedUser.name
    if (currentViewer === ViewerNames.extensions) return 'Extension Details'
    return undefined
  }, [selectedItem, selectedSite, selectedInfrastructure, selectedFile, selectedUser, currentViewer])

  // Row click handlers — consolidated into one function

  const handleRowClick = (item: Building | Site | Infrastructure | FileRow | User) => {
    // Files and users don't participate in compare mode
    if (comparing && 'id' in item) {
      const id = String(item.id)
      const isChecked = compareItems.some(i => i.id === id)
      if (isChecked) {
        removeItemFromCompare(id)
      } else {
        addItemToCompare({ ...item, id })
      }
      return
    }

    // Navigate to detail view, setting the correct selected item per viewer
    switch (currentViewer) {
      case ViewerNames.buildings:
        setSelectedItem(item as Building)
        break
      case ViewerNames.sites:
        setSelectedSite(item as Site)
        break
      case ViewerNames.infrastructure:
        setSelectedInfrastructure(item as Infrastructure)
        break
      case ViewerNames.files:
        setSelectedFile(item as FileRow)
        break
      case ViewerNames.users:
        setSelectedUser(item as User)
        break
    }
    setView('detail')
  }

const handleBackToTable = () => {
    setView('table')
    setSelectedItem(null)
    setSelectedSite(null)
    setSelectedInfrastructure(null)
    setSelectedFile(null)
    setSelectedUser(null)
    setEditing(false)
    setActiveChanges(false)
  }

  // Refs for imperative save on child detail components

  const buildingDetailsRef = React.useRef<BuildingDetailsRef>(null)
  const siteDetailsRef = React.useRef<SiteDetailsRef>(null)
  const infrastructureDetailsRef = React.useRef<InfrastructureDetailsRef>(null)
  const fileDetailsRef = React.useRef(null)
  const userDetailsRef = React.useRef(null)

  // Save / create handlers — consolidated into one function

  const handleSaveChanges = async () => {
    switch (currentViewer) {
      case ViewerNames.buildings:
        await buildingDetailsRef.current?.saveChanges()
        break
      case ViewerNames.sites:
        await siteDetailsRef.current?.saveChanges()
        break
      case ViewerNames.infrastructure:
        await infrastructureDetailsRef.current?.saveChanges()
        break
      case ViewerNames.files:
        await fileDetailsRef.current?.saveChanges()
        break
      case ViewerNames.users:
        await userDetailsRef.current?.saveChanges()
        break
    }
  }

  /**
   * Handles creation of a new entity (id < 0).
   * Calls saveChanges on the appropriate ref, then shows a toast.
   * Pass successKey as undefined for viewers that show their own success toast (e.g. buildings).
   */
  const handleCreate = async (
    ref: React.RefObject<{ saveChanges: () => Promise<void> }>,
    toastKeys: { successKey?: string; errorKey: string },
  ) => {
    try {
      await ref.current?.saveChanges()
      setActiveChanges(false)
      if (toastKeys.successKey) toast.success(t(toastKeys.successKey))
    } catch (error) {
      if (error?.status !== 401) toast.error(t(toastKeys.errorKey))
    }
  }

  // Dispatches to the right ref + toast keys based on which new item is selected
  const handleCreateNewItem = async () => {
    if (selectedSite && selectedSite.id < 0) {
      await handleCreate(siteDetailsRef, {
        successKey: 'toastSuccessCreateSite',
        errorKey: 'toastFailCreateSite',
      })
    } else if (selectedItem && selectedItem.id < 0) {
      await handleCreate(buildingDetailsRef, {
        // Building details shows its own success toast
        errorKey: 'toastFailCreateBuilding',
      })
    } else if (selectedInfrastructure && selectedInfrastructure.id < 0) {
      await handleCreate(infrastructureDetailsRef, {
        successKey: 'toastSuccessCreateInfrastructure',
        errorKey: 'toastFailCreateInfrastructure',
      })
    } else {
      // Users and existing items — standard save
      await handleSaveChanges()
    }
  }

  // Derived UI helpers

  const isNewItem = !!(
    (selectedSite && selectedSite.id < 0)
    || (selectedItem && selectedItem.id < 0)
    || (selectedInfrastructure && selectedInfrastructure.id < 0)
  )

  // Render

  return (
    <div className={`${hideFrame ? '' : 'sm:p-2'} overflow-hidden ${hideFrame ? '' : 'bg-[#fafafa]'} ${height ? height : 'h-full'}`}>
      <div className={`${hideFrame ? '' : 'bg-background rounded-xl shadow'} h-full min-h-0`}>
        <div className="flex flex-col h-full min-h-0">

          {/* Breadcrumb Navigation */}
          <div className="">
            <div className="flex flex-row gap-2 justify-start items-center px-3 py-4 relative">
              <Breadcrumb className="px-3">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    {view === 'table'
                      ? <BreadcrumbPage>{headerTitle}</BreadcrumbPage>
                      : (
                        <BreadcrumbLink onClick={handleBackToTable} className="cursor-pointer">
                          {headerTitle}
                        </BreadcrumbLink>
                      )}
                  </BreadcrumbItem>

                  {view === 'detail' && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{breadcrumbTitle}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Header content based on view */}
            {view === 'table' ? (
              <>
                {/* Title Row */}
                {!hideTitle && (
                  <div className="flex flex-row justify-between items-center px-6 py-6">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <MenuIcon className="h-8 w-8" />
                        <h1 className="text-2xl text-foreground">{headerTitle}</h1>
                      </div>
                      {comparing && (
                        <h2 className="text-sm text-muted-foreground font-normal">
                          Choose up to 3 {headerTitle.toLowerCase()} to compare.
                        </h2>
                      )}
                    </div>
                  </div>
                )}

                {/* Search & Filter & Actions Row */}
                <div className={`flex ${hideTitle ? 'justify-between' : 'justify-end'} items-center px-6 py-4 gap-4`}>
                  <div className={hideTitle ? 'w-64' : 'w-96'}>
                    <Input
                      placeholder={`${t('searchPlaceholder')} ${headerTitle}...`}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <FilterButtons
                      currentViewer={currentViewer}
                      filters={filters}
                      activeFilters={activeFilters}
                      filterFields={filtersOptions}
                      data={data}
                      setFilters={setFilters}
                      setActiveFilters={setActiveFilters}
                    />
                    <HeaderButtons
                      headerTitle={headerTitle}
                      currentViewer={currentViewer}
                      compareItems={compareItems}
                      setCompareItems={setCompareItems}
                      comparing={comparing}
                      setComparing={setComparing}
                      newItemName={newItemName}
                      setNewItemName={setNewItemName}
                      filteredData={
                        currentViewer === ViewerNames.buildings
                        || currentViewer === ViewerNames.sites
                        || currentViewer === ViewerNames.infrastructure
                          ? filteredData
                          : undefined
                      }
                      users={currentViewer === ViewerNames.users ? users : undefined}
                    />
                  </div>
                </div>

                <Separator />
              </>
            ) : (
              // Detail View Header
              <div className="flex justify-between items-center px-6 py-6">
                <DetailHeader
                  selectedItem={selectedItem}
                  selectedSite={selectedSite}
                  selectedInfrastructure={selectedInfrastructure}
                  selectedFile={selectedFile}
                  selectedUser={selectedUser}
                  countryCode={organization?.country}
                />

                <DetailActions
                  editing={editing}
                  activeChanges={activeChanges}
                  currentViewer={currentViewer}
                  selectedItem={selectedItem}
                  selectedSite={selectedSite}
                  selectedInfrastructure={selectedInfrastructure}
                  selectedFile={selectedFile}
                  selectedUser={selectedUser}
                  activeBuildingTab={activeBuildingTab}
                  activeSiteTab={activeSiteTab}
                  onSave={async () => {
                    await handleCreateNewItem()
                    setEditing(false)
                  }}
                  onEdit={() => {
                    setEditing(true)
                    if (isNewItem) setActiveChanges(true)
                  }}
                  onCancel={() => {
                    setEditing(false)
                    if (isNewItem) handleBackToTable()
                  }}
                  onDeleteUser={() => {
                    setSelectedUser(null)
                    setView('table')
                  }}
                  setView={setView}
                />
              </div>
            )}

            {/* Detail view separator */}
            {view === 'detail' && <Separator />}
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-hidden">
            {view === 'table' ? (
              <div className="h-full flex flex-col md:p-6 overflow-auto">
                <DataTable
                  columns={currentViewer === ViewerNames.users ? userColumns : tableColumns}
                  data={filteredData}
                  onRowClick={handleRowClick}
                  currentViewer={currentViewer}
                  isLoading={isLoading}
                  leadingCell={comparing
                    ? ({ dataset }) => {
                      const item = dataset
                      const isChecked = compareItems.some(i => i?.id === String(item?.id))
                      const maxReached = compareItems.length >= 3 && !isChecked

                      return (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="transition-opacity duration-200 hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isChecked) {
                              removeItemFromCompare?.(String(item.id))
                            } else {
                              addItemToCompare?.({ ...item, id: String(item.id) })
                            }
                          }}
                        >
                          <Checkbox
                            checked={isChecked}
                            disabled={maxReached}
                            className={`opacity-70 hover:opacity-100 data-[state=checked]:opacity-100 ${maxReached && '!cursor-default'}`}
                          />
                        </Button>
                      )
                    }
                    : undefined}
                  trailingCell={({ row }) => (
                    <div onClick={e => e.stopPropagation()}>
                      <MoreOptions
                        row={row.original}
                        dataType={dataType}
                        hideViewOnMap={currentViewer === ViewerNames.users}
                        setView={setView}
                        onDeleteUser={() => setSelectedUser(null)}
                      />
                    </div>
                  )}
                />
              </div>
            ) : (
              <div className="h-full overflow-auto">
                {selectedFile
                  ? (
                    <FileDetails
                      selectedFile={selectedFile}
                      buildings={buildings || []}
                      editing={editing}
                      setEditing={setEditing}
                      setActiveChanges={setActiveChanges}
                      ref={fileDetailsRef}
                    />
                  )
                  : currentViewer === ViewerNames.buildings
                    ? (
                      <BuildingDetails
                        selectedItem={selectedItem}
                        setSelectedItem={setSelectedItem}
                        editing={editing}
                        setEditing={setEditing}
                        setActiveChanges={setActiveChanges}
                        buildings={buildings || []}
                        ref={buildingDetailsRef}
                        activeTab={activeBuildingTab}
                        setActiveTab={setActiveBuildingTab}
                      />
                    )
                    : currentViewer === ViewerNames.sites
                      ? (
                        <SiteDetails
                          selectedSite={selectedSite}
                          setSelectedSite={setSelectedSite}
                          editing={editing}
                          setEditing={setEditing}
                          setActiveChanges={setActiveChanges}
                          sites={sites || []}
                          ref={siteDetailsRef}
                          activeTab={activeSiteTab}
                          setActiveTab={setActiveSiteTab}
                        />
                      )
                      : currentViewer === ViewerNames.infrastructure
                        ? (
                          <InfrastructureDetails
                            selectedInfrastructure={selectedInfrastructure}
                            setSelectedInfrastructure={setSelectedInfrastructure}
                            editing={editing}
                            setEditing={setEditing}
                            setActiveChanges={setActiveChanges}
                            infrastructures={infrastructures || []}
                            ref={infrastructureDetailsRef}
                            activeTab={activeInfrastructureTab}
                            setActiveTab={setActiveInfrastructureTab}
                          />
                        )
                        : currentViewer === ViewerNames.users
                          ? (
                            <UserDetails
                              selectedUser={selectedUser}
                              setSelectedUser={setSelectedUser}
                              editing={editing}
                              setEditing={setEditing}
                              setActiveChanges={setActiveChanges}
                              users={users || []}
                              ref={userDetailsRef}
                              hideTitle={hideTitle}
                            />
                          )
                          : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}