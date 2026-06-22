'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePermissions } from '../../../../store'

import type { Building, Infrastructure, Site, User } from '../../../../types/dbTypes'
import type { FileRow } from '../../../../types/files'
import { DataTypesNames, ViewerNames } from '../../../../types'

import { Button } from '../../../../components/ui/Button'
import FileUpload from './FileUpload'
import MoreOptions from '../MoreOptions'

// Types

interface DetailActionsProps {
  // Edit state
  editing: boolean
  activeChanges: boolean
  currentViewer: ViewerNames
  // Selected items
  selectedItem?: Building | null
  selectedSite?: Site | null
  selectedInfrastructure?: Infrastructure | null
  selectedFile?: FileRow | null
  selectedUser?: Partial<User> | null
  // Active tabs — needed to show FileUpload instead of edit button on attached-files tab
  activeBuildingTab: string
  activeSiteTab: string
  // Callbacks
  onSave: () => void
  onEdit: () => void
  onCancel: () => void
  onDeleteUser: () => void
  setView: React.Dispatch<React.SetStateAction<'table' | 'detail'>>
}

// Helpers

function isNewItem(
  selectedItem: Building | null | undefined,
  selectedSite: Site | null | undefined,
  selectedInfrastructure: Infrastructure | null | undefined,
  selectedUser: Partial<User> | null | undefined,
): boolean {
  return !!(
    (selectedSite && selectedSite.id < 0)
    || (selectedItem && selectedItem.id < 0)
    || (selectedInfrastructure && selectedInfrastructure.id < 0)
    || (selectedUser && selectedUser.id < 0)
  )
}

// Component

export default function DetailActions({
  editing,
  activeChanges,
  currentViewer,
  selectedItem,
  selectedSite,
  selectedInfrastructure,
  selectedFile,
  selectedUser,
  activeBuildingTab,
  activeSiteTab,
  onSave,
  onEdit,
  onCancel,
  onDeleteUser,
  setView,
}: DetailActionsProps) {
  const t = useTranslations('DataMenu')
  const { ability } = usePermissions()

  const newItem = isNewItem(selectedItem, selectedSite, selectedInfrastructure, selectedUser)
  const isOnAttachedFilesTab = activeBuildingTab === 'attached-files' || activeSiteTab === 'attached-files'

  // Save button label — resolves to create or save depending on item state
  const saveLabel = () => {
    if (selectedSite && selectedSite.id < 0) return t('createSiteButton')
    if (selectedItem && selectedItem.id < 0) return t('createBuildingButton')
    if (selectedInfrastructure && selectedInfrastructure.id < 0) return t('createInfrastructureButton')
    if (selectedUser && selectedUser.id < 0) return t('createUserButton')
    return t('saveChangesButton')
  }

  const editLabel = newItem ? t('addDetailsButton') : t('editDetailsButton')

  const editDisabled = !!(
    (selectedUser && !ability.can('update', 'Role'))
    || (selectedItem && !ability.can('update', 'Building'))
    || (selectedSite && !ability.can('update', 'Site'))
    || (currentViewer === ViewerNames.files && !ability.can('update', 'File'))
    || (selectedInfrastructure && !ability.can('update', 'Infrastructure'))
  )

  return (
    <div className="flex gap-3">
      {/* Left slot: Cancel (editing) or MoreOptions (not editing) */}
      {editing
        ? (
          <Button variant="outline" onClick={onCancel}>
            {t('cancelButton')}
          </Button>
        )
        : selectedItem
          ? (
            <MoreOptions
              row={selectedItem}
              dataType={DataTypesNames.building}
              variant="outline"
            />
          )
          : selectedSite
            ? (
              <MoreOptions
                row={selectedSite}
                dataType={DataTypesNames.site}
                variant="outline"
                setView={setView}
              />
            )
            : selectedFile
              ? (
                <MoreOptions
                  row={selectedFile}
                  dataType={DataTypesNames.file}
                  variant="outline"
                />
              )
              : selectedUser && selectedUser.id > 0
                ? (
                  <MoreOptions
                    row={selectedUser}
                    dataType={DataTypesNames.user}
                    variant="outline"
                    hideViewOnMap
                    setView={setView}
                    onDeleteUser={onDeleteUser}
                  />
                )
                : null}

      {/* Right slot: Save | Edit | FileUpload depending on state */}
      {editing && !isOnAttachedFilesTab
        ? (
          <Button
            onClick={onSave}
            disabled={!activeChanges || !!(selectedUser && !ability.can('update', 'Role'))}
          >
            <LR.Save />
            {saveLabel()}
          </Button>
        )
        : !editing && !isOnAttachedFilesTab
          ? (
            <Button onClick={onEdit} disabled={editDisabled}>
              <LR.Pencil />
              {editLabel}
            </Button>
          )
          : activeBuildingTab === 'attached-files' && currentViewer === ViewerNames.buildings && !editing
            ? (
              <FileUpload
                tag="attached-files"
                buildingId={selectedItem?.id}
                buttonOnly
                onFileUpload={() => {}}
              />
            )
            : null}
    </div>
  )
}