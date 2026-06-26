'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from "react";
import { useTranslations } from 'next-intl'
import { usePermissions } from '../../../../../../store'

// Utilities
import { ToolsContext, FilesContext, MenusContext } from '../../../../../../store'
import { Tool, ToolbarToolType } from '../../../../../../types/tools'
import { ViewerNames } from '../../../../../../types/'
import { ToolbarSubmenu } from '../../../../../ToolbarSubmenu'

// Shadcn components
import { useSidebar, ItemsBadgeButton } from '../../../../../ui/'
import { DropdownMenuItem } from '../../../../../ui/DropdownMenu'
import { AddItemDialog } from '../../../../../ui/AddItemDialog'

// Icons
import * as LR from 'lucide-react'

// Adder Components
import { FileAdder } from './AddFile/FileAdder'
import { CommentInput } from '../../../../../ui/Comments/CommentInput'
import { SensorInput } from '../../../../../ui/Sensors/SensorInput'
import { DatasetAdder } from './AddDataset/DatasetAdder'
import { SiteAdder } from './AddSite/SiteAdder'
import Datasets from '../../../datasets'
import AddBuilding from '../../../../Data/buildingDetails/AddBuilding'
import { DbFile, Organization } from '../../../../../../types/dbTypes';
import { useComments } from '../../../../../../hooks/comments/comments';
import { useSensors } from '../../../../../../hooks/sensors/sensors';

interface AddToMapToolProps {
  tool: Tool
  organization?: Organization
  minioBaseUrl?: string
  martinBaseUrl?: string
  [key: string]: unknown
}

export default function AddToMap({ tool, organization, minioBaseUrl, martinBaseUrl }: AddToMapToolProps) {
  // Translation
  const t = useTranslations('AddToMap')

  // Permissions
  const { ability } = usePermissions()

  const [datasetOpen, setDatasetOpen] = React.useState<boolean>()

  const { dispatch: toolsDispatch, state: toolsState }
    = React.useContext(ToolsContext)
  const [addingMode, setAddingMode] = React.useState<ToolbarToolType | null>(null)
  const { state: fileState } = React.useContext(FilesContext)
  const { files } = fileState.files
  const mapFiles: DbFile[] = files.filter(file => file.type == 'map-file')

  const {comments} = useComments()
  const {sensors} = useSensors()

  const [newBuildingFields, setNewBuildingFields] = React.useState({})
  const [buildingDialogOpen, setBuildingDialogOpen] = React.useState(false)

  const { currentToolId } = toolsState?.tools || {}

  // Allow other UI (e.g. CommentsSection) to trigger AddToMap modes
  React.useEffect(() => {
      const isAddToMapMode = (id: any): id is ToolbarToolType => {
      return (
        id === 'map-add-file'
        || id === 'map-add-comment'
        || id === 'map-add-building'
        || id === 'map-add-dataset'
        || id === 'map-add-site'
        || id === 'map-add-sensor'
      )
    }

    if (isAddToMapMode(currentToolId)) {
      setAddingMode(currentToolId)
    }
    else {
      setAddingMode(null)
    }
  }, [currentToolId])

  const handleToolClick = (newTool: ToolbarToolType) => {
    setAddingMode(newTool)
    toolsDispatch({
      type: 'SET-TOOL',
      payload: { currentToolId: newTool },
    })
  }

  const clearTool = () => {
    setAddingMode(null)
    toolsDispatch({ type: 'CLEAR-TOOLS' })
  }

  const { dispatch: menusDispatch, state: menusState } = React.useContext(MenusContext)
    const { setOpenInfo } = useSidebar()

    const handleCommentsMenu = () => {
      setOpenInfo(true)
      menusDispatch({ type: 'SET_SIDEBAR_SELECTED_TAB', payload: { selectedTab: 'communication' } })
    }

    const handleSensorsMenu = () => {
      setOpenInfo(true)
      menusDispatch({ type: 'SET_SIDEBAR_SELECTED_TAB', payload: { selectedTab: 'sensors' } })
    }

    const { currentViewer } = menusState.menus

  const handleOpenFileTab = () => {
    setOpenInfo(true)
    menusDispatch({ type: 'SET_SIDEBAR_SELECTED_TAB', payload: { selectedTab: 'file' } })
  }

  return (
    <>
      <ToolbarSubmenu tool={tool}>
        <div className="flex items-center justify-between w-full relative gap-2">
          <DropdownMenuItem
            className="w-full"
            onClick={() => handleToolClick('map-add-file')}
            disabled={!ability.can('create', 'File')}
          >
            <LR.FilePlus />
            <span>{t('file')}</span>
          </DropdownMenuItem>
          <ItemsBadgeButton
            count={mapFiles.length}
            onClick={handleOpenFileTab}
          />

        </div>

        <div className="flex items-center justify-between w-full relative gap-2">
          <DropdownMenuItem
            className="w-full"
            onClick={() => {
              handleToolClick('map-add-comment')
            }}
            disabled={!ability.can('create', 'Comment')}
          >
            <LR.MessageCircle />
            <span>{t('comment')}</span>
          </DropdownMenuItem>
          <ItemsBadgeButton
            count={comments.filter((comment) => currentViewer === comment.viewer).length}
            onClick={handleCommentsMenu}
          />
        </div>

        <div className="flex items-center justify-between w-full relative gap-2">
          <DropdownMenuItem
            className="w-full"
            onClick={() => {
              handleToolClick('map-add-dataset')
            }}
            disabled={!ability.can('create', 'File')}
          >
            <LR.Database />
            <span>{t('dataset')}</span>
          </DropdownMenuItem>
        </div>

        <DropdownMenuItem
          onClick={() => {
            handleToolClick('map-add-site')
          }}
          disabled={!ability.can('create', 'Site')}
        >
          <LR.BoxSelect />
          <span>{t('site')}</span>
        </DropdownMenuItem>

        <div className="flex items-center justify-between w-full relative gap-2">
          <DropdownMenuItem
            className="w-full"
            onClick={() => {
              handleToolClick('map-add-sensor')
            }}
            disabled={!ability.can('create', 'Sensor')}
          >
            <LR.Radio />
            <span>{t('sensor')}</span>
          </DropdownMenuItem>
          {sensors.length > 0 && (
            <ItemsBadgeButton
              count={sensors.filter((sensor) => currentViewer === sensor.viewer).length}
              onClick={handleSensorsMenu}
            />
          )}
        </div>

        <DropdownMenuItem
          onClick={() => setBuildingDialogOpen(true)}
          disabled={!ability.can('create', 'Building')}
        >
          <LR.Building2 />
          <span>{t('building')}</span>
        </DropdownMenuItem>

      </ToolbarSubmenu>

      {/* File — manages its own dialog and state */}
      {addingMode === 'map-add-file' && (
        <FileAdder isOpen={addingMode === 'map-add-file'} onClose={clearTool} />
      )}

      {/* Comment */}
      <CommentInput
        viewer={ViewerNames.map}
        layout="dialog"
        isOpen={addingMode === 'map-add-comment'}
        onCancel={clearTool}
      />

      {/* Sensor */}
      <SensorInput
        viewer={ViewerNames.map}
        layout="dialog"
        isOpen={addingMode === 'map-add-sensor'}
        onCancel={clearTool}
      />

      {/* Site */}
      <SiteAdder
        isOpen={addingMode === 'map-add-site'}
        onCancel={clearTool}
      />

      {/* Dataset */}
      <AddItemDialog
        open={addingMode === 'map-add-dataset'}
        onOpenChange={open => !open && clearTool()}
        title={t('addDatasetTitle')}
        icon={LR.Database}
        contentClassName="max-w-xl"
      >
        <DatasetAdder />
      </AddItemDialog>

      {/* Building */}
      <AddBuilding
        newBuildingFields={newBuildingFields}
        setNewBuildingFields={setNewBuildingFields}
        open={buildingDialogOpen}
        onOpenChange={setBuildingDialogOpen}
      />

      <Datasets
        isOpen={datasetOpen}
        setIsOpenAction={setDatasetOpen}
        organization={organization}
        minioBaseUrl={minioBaseUrl}
        martinBaseUrl={martinBaseUrl}
      />
    </>
  )
}