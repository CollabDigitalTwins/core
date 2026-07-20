"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from 'react'
import { useMenusContext } from '../../../../store'
import type { Building } from '../../../../types/dbTypes'
import { useTranslations } from 'next-intl'
import { usePermissions } from '../../../../store'


// Utilities
import { fuzzySearchBuildings } from './utils/fuzzySearch'
// Shadcn Components
import { DescriptionListItem } from '../../../../components/ui/DescriptionList'
import { Separator, Badge, Button, Input, Checkbox, Dialog } from '../../../../components/ui/'

import { convertISOStringtoDate } from '../utils/convertDate'
// Custom Components
import FilePreview from './FilePreview'

// Icons
import  * as LR from 'lucide-react'

// Custom Type
import type { FileRow } from '../../../../types/files'

import { mutate } from 'swr'
import { useFile } from '../../../../hooks/files/files'
import { ViewerNames } from '../../../../types/'
import { useSession } from 'next-auth/react'

interface FileDetailsProps {
  selectedFile?: FileRow
  buildings?: any[]
  editing?: boolean
  setEditing?: (editing: boolean) => void
  setActiveChanges?: (editing: boolean) => void
}

export type FileDetailsRef = {
  saveChanges: () => Promise<void>
}

export const FileDetails = React.forwardRef<FileDetailsRef, FileDetailsProps>((
  { selectedFile, buildings, editing, setEditing, setActiveChanges },
  ref,
) => {
  // Translations
  const t = useTranslations('FileDetails')

  // Permissions
  const { ability } = usePermissions()

  const headers: Partial<Record<keyof FileRow | keyof File, string>> = {
    name: t('fileName'),
    attachedTo: t('attachedTo'),
    dateUploaded: t('dateUploaded'),
    uploadedBy: t('uploadedBy'),
    fileType: t('fileType'),
    fileSize: t('fileSize'),
    position: t('position'),
  }

  const { dispatch: menusDispatch } = useMenusContext()
  const { setView } = useMenusContext()
  const { selectedItem, setSelectedItem } = useMenusContext()
  const { setSelectedFile } = useMenusContext()

  const [searchTerm, setSearchTerm] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [attachedBuilding, setAttachedBuilding] = React.useState<any>(null)
  const [editingName, setEditingName] = React.useState<any>('')

const { data: session } = useSession()

  React.useEffect(() => {
    setEditingName(selectedFile.metadata.name)
    setAttachedBuilding(
      selectedFile.metadata.attachedFilesBuildingId
        ? buildings?.find(building => building.id === selectedFile.metadata.attachedFilesBuildingId) || null
        : null,
    )
  }, [selectedFile, buildings])

  // Update handler at top level too
  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setSearchResults(fuzzySearchBuildings(buildings || [], term))
  }

  React.useEffect(() => {
    if (attachedBuilding?.id != selectedFile.metadata.attachedFilesBuildingId || editingName !== selectedFile.metadata.name) setActiveChanges(true)
    else setActiveChanges(false)
  }, [attachedBuilding, editingName])

  const [open, setOpen] = React.useState(false)

  const { updateFile } = useFile(selectedFile?.metadata?.id ?? null)

  const handleSaveChanges = async () => {
    try {
      const file = await updateFile({
        name: editingName,
        attachedFilesBuildingId: attachedBuilding ? attachedBuilding.id : null,
      } as any)
      setSelectedFile({
        // rendering data
        id: String(file.id),
        name: file.name,
        attachedTo: [
          { type: 'building', buildingId: String(file.attachedFilesBuildingId || '') },
        ],
        dateUploaded: file.uploadedAt,
        uploadedBy: session?.user?.email || 'CDT',
        fileType: file.extension?.toUpperCase() || '',
        fileSize: `${(file.sizeBytes / (1024 * 1024)).toFixed(3)} MB`,
        position: file.position,
        metadata: {
          ...file,
          url: selectedFile.metadata.url,
        },
      })
    }
    catch (error) {
      console.error(error)
      alert(`An error occurred when saving file changes: ${error.message || error}`)
    }
    finally {
      setSearchTerm('')
      setSearchResults([])
      setAttachedBuilding(null)
      setEditingName(selectedFile.metadata.name)
    }
  }

  // Expose methods to parent component
  React.useImperativeHandle(ref, () => ({
    saveChanges: handleSaveChanges,
  }), [selectedItem, setEditing, setActiveChanges, attachedBuilding, editingName])

  const handleViewBuilding = () => {
    // Find the building attachment
    const buildingAttachment = selectedFile?.attachedTo?.find(
      (item: any) => item.type === 'building',
    )
    // Type guard: only proceed if buildingAttachment is a building
    if (!buildingAttachment || buildingAttachment.type !== 'building') return

    // Find the full building object
    const matchedBuildings = buildings.filter(b => b.id == buildingAttachment.buildingId)
    if (matchedBuildings.length === 0) {
      alert('No building found')
      return
    }
    const building = matchedBuildings[0]

    setSelectedFile?.(null)
    // Set the selected building
    setSelectedItem?.(building)

    // Set the current viewer to buildings
    menusDispatch({
      type: 'SET_VIEWER',
      payload: { currentViewer: ViewerNames.buildings },
    })

    // Set the view to 'details'
    setView?.('detail')
  }

  // Capitalize the first letter of each key
  const capitalizeKey = (key: string) => {
    return key
      .replaceAll(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
  }

  // Get display label from headers or fallback to capitalizeKey
  const getDisplayLabel = (key: string) => {
    return headers[key as keyof File] || capitalizeKey(key)
  }

  // Format attachedTo display
  const formatAttachmentDisplay = (
    attachment: { type: 'building', buildingId: string } | { type: 'site', siteId: string },
    buildings?: Building[],
  ): string => {
    if (attachment.type === 'building') {
      // Find the building by buildingId
      const building = buildings?.find(
        b => String(b.id) === attachment.buildingId,
      )
      if (building) {
        // Use propertyName if available, otherwise fall back to address, then buildingId
        const displayName = building.buildingName || building.buildingAddress || attachment.buildingId
        return `Building: ${displayName}`
      }
      else {
        // Building not found, show the ID
        return `Building: ${attachment.buildingId, 'not found'}`
      }
    }
    else {
      // For sites, just show the site ID for now
      return `Site: ${attachment.siteId}`
    }
  }

  const renderFileDetails = () => {
    if (!selectedFile) return null
    const entries = Object.entries(selectedFile)

    // show only the rendering data not renering data
    const filteredEntries = entries.filter(
      ([key, value]) => key !== 'metadata' && key in headers,
    )

    // Group items into pairs for the grid layout
    const rows = []
    for (let i = 0; i < filteredEntries.length; i += 2) {
      rows.push(
        <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 py-5 md:py-6 border-b border-border w-full">
          <DescriptionListItem className="break-words" label={getDisplayLabel(filteredEntries[i][0])}>
            {
              filteredEntries[i][1] === null
              || filteredEntries[i][1] === undefined
              || filteredEntries[i][1] === 'null'
                ? (
                    <span className="italic">
                      {t('no')}
                      {' '}
                      {getDisplayLabel(filteredEntries[i][0])}
                      {' '}
                      {t('provided')}
                    </span>
                  )
                : filteredEntries[i][0] === 'position' && typeof filteredEntries[i][1] === 'object'
                  ? (
                      <span>
                        {Object.entries(filteredEntries[i][1])
                          .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
                          .join(', ')}
                      </span>
                    )
                : filteredEntries[i][0] === 'dateUploaded'
                  ? convertISOStringtoDate(filteredEntries[i][1] as string | Date)
                : (Array.isArray(filteredEntries[i][1])
                    ? (
                        <div className="flex flex-wrap gap-2">
                          {(filteredEntries[i][1] as any[]).map((item, index) => {
                            if (
                              filteredEntries[i][0] === 'attachedTo'
                              && typeof item === 'object'
                              && item !== null
                            ) {
                              return (
                                <Button
                                  key={index}
                                  variant="ghost"
                                  onClick={handleViewBuilding}
                                  className="p-0 hover:bg-transparent underline"
                                  disabled={!ability.can('update', 'File')}
                                >
                                  <LR.SquareArrowOutUpRight />
                                  {formatAttachmentDisplay(item, buildings)}
                                </Button>
                              )
                            }
                            else if (typeof item === 'object' && item !== null) {
                              return (
                                <Button
                                  key={index}
                                  variant="ghost"
                                  onClick={handleViewBuilding}
                                  className="p-0 hover:bg-transparent underline"
                                  disabled={!ability.can('update', 'File')}
                                >
                                  <LR.SquareArrowOutUpRight />
                                  {JSON.stringify(item)}
                                </Button>
                              )
                            }
                            else {
                              return (
                                <Button
                                  key={index}
                                  variant="ghost"
                                  onClick={handleViewBuilding}
                                  className="p-0 hover:bg-transparent underline"
                                  disabled={!ability.can('update', 'File')}
                                >
                                  <LR.SquareArrowOutUpRight />
                                  {item}
                                </Button>
                              )
                            }
                          })}
                        </div>
                      )
                    : (
                        String(filteredEntries[i][1])
                      ))
            }
          </DescriptionListItem>
          <Separator className="md:hidden" />
          {i + 1 < filteredEntries.length && (
            <DescriptionListItem className="break-words" label={getDisplayLabel(filteredEntries[i + 1][0])}>
              {
                filteredEntries[i + 1][1] === null
                || filteredEntries[i + 1][1] === undefined
                || filteredEntries[i + 1][1] === 'null'
                  ? (
                      <span className="italic">
                        {t('no')}
                        {' '}
                        {getDisplayLabel(filteredEntries[i + 1][0])}
                        {' '}
                        {t('provided')}
                      </span>
                    )
                  : filteredEntries[i + 1][0] === 'dateUploaded'
                    ? convertISOStringtoDate(filteredEntries[i + 1][1] as string | Date)
                  : (Array.isArray(filteredEntries[i + 1][1])
                      ? (
                          <div className="flex flex-wrap gap-2">
                            {(filteredEntries[i + 1][1] as any[]).map((item, index) => {
                              if (
                                filteredEntries[i + 1][0] === 'attachedTo'
                                && typeof item === 'object'
                                && item !== null
                              ) {
                                return (
                                  <Button
                                    key={index}
                                    variant="ghost"
                                    onClick={handleViewBuilding}
                                    className="p-0 hover:bg-transparent underline"
                                    disabled={!ability.can('update', 'File')}
                                  >
                                    <LR.SquareArrowOutUpRight />
                                    {formatAttachmentDisplay(item, buildings)}
                                  </Button>
                                )
                              }
                              else if (typeof item === 'object' && item !== null) {
                                return (
                                  <Button
                                    key={index}
                                    variant="ghost"
                                    onClick={handleViewBuilding}
                                    className="p-0 hover:bg-transparent underline"
                                    disabled={!ability.can('update', 'File')}
                                  >
                                    <LR.SquareArrowOutUpRight />
                                    {JSON.stringify(item)}
                                  </Button>
                                )
                              }
                              else {
                                return (
                                  <Button
                                    key={index}
                                    variant="ghost"
                                    onClick={handleViewBuilding}
                                    className="p-0 hover:bg-transparent underline"
                                    disabled={!ability.can('update', 'File')}
                                  >
                                    <LR.SquareArrowOutUpRight />
                                    {item}
                                  </Button>
                                )
                              }
                            })}
                          </div>
                        )
                      : (
                          String(filteredEntries[i + 1][1])
                        ))
              }
            </DescriptionListItem>
          )}
        </div>,
      )
    }
    return rows
  }

  const editFileDetails = () => {
    if (!selectedFile) return null

    const editableFields = new Set(['name', 'attachedTo', 'position'])
    const entries = Object.entries(selectedFile).filter(([key, val]) => editableFields.has(key))

    // Render the appropriate input component based on data type
    const renderInputComponent = (key: string, value: any) => {
      if (key == 'name') {
        return (
          <Input
            type="text"
            placeholder="Enter a new file name"
            value={editingName}
            onChange={e => setEditingName(e?.target.value)}
          />
        )
      }
      else if (key === 'attachedTo') {
        return (
          <div className="flex flex-col gap-2">
            {attachedBuilding == null
              ? (
                  <Input
                    type="text"
                    placeholder="Search buildings by address"
                    value={searchTerm}
                    onChange={e => handleSearch(e.target.value)}
                  />
                )
              : (
                  <div className="relative flex justify-end items-center">
                    <Input
                      type="text"
                      value={
                        'Building: '
                        + (attachedBuilding.buildingName && attachedBuilding.buildingAddress
                          ? `${attachedBuilding.buildingName}, ${attachedBuilding.buildingAddress}`
                          : attachedBuilding.buildingName || attachedBuilding.buildingAddress)
                      }
                      readOnly
                    />
                    <LR.X className="absolute right-2 cursor-pointer" onClick={() => setAttachedBuilding(null)} />
                  </div>
                )}
            {/* Dropdown panel */}
            {searchResults.length > 0 && searchTerm !== '' && (
              <div className="mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto z-20">
                {searchResults.map(building => (
                  <div
                    key={building.id}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors flex gap-2 items-center"
                    onClick={() => {
                      setAttachedBuilding(building)
                      setSearchTerm('')
                      setSearchResults([])
                    }}
                  >
                    <LR.SquareArrowOutUpRight className="w-3 h-3" />
                    { building.buildingName
                      ? building.buildingName + ', ' + building.buildingAddress
                      : 'Unnamed Property, ' + building.buildingAddress }
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      else if (Array.isArray(value)) {
        if (value === null || value === undefined) {
          return <Input value="" />
        }
        return (
          <>
            <div className="flex flex-row gap-2">
              <Input type="text" value="" onChange={() => {}} />
              <Button
                variant="outline"
                size="icon"
                disabled={!ability.can('update', 'File')}
              >
                <LR.Plus />
              </Button>
            </div>
            {/* Render Existing values */}
            <div className="flex flex-row gap-2">
              {value.map((item: any, index: number) => (
                <Badge key={index} className="inline-flex" variant="secondary">
                  {key === 'attachedTo' && typeof item === 'object' && item !== null
                    ? formatAttachmentDisplay(item, buildings)
                    : (typeof item === 'object' && item !== null
                        ? JSON.stringify(item)
                        : item)}
                </Badge>
              ))}
            </div>
          </>
        )
      }
      else if (value === 'yes' || value === 'no') {
        const bool = value === 'yes'
        return (
          <Checkbox
            checked={bool}
            onCheckedChange={() => {}}
            disabled={!ability.can('update', 'File')}
          />
        )
      }
      else if (typeof value === 'number') {
        if (value === null || value === undefined) {
          return <Input value="" />
        }
        return (
          <Input type="number" value={value} onChange={() => {}} />
        )
      }
      else {
        if (value === null || value === undefined || value === 'null') {
          return <Input value="" />
        }
        return (
          <Input value={String(value)} onChange={() => {}} />
        )
      }
    }

    // Group items into pairs for the grid layout
    const rows = []
    for (let i = 0; i < entries.length; i += 2) {
      rows.push(
        <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 py-5 md:py-6 w-full">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold text-foreground">{getDisplayLabel(entries[i][0])}</div>
            {renderInputComponent(entries[i][0], entries[i][1])}
          </div>
          <Separator className="md:hidden" />
          {i + 1 < entries.length && (
            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-foreground">{getDisplayLabel(entries[i + 1][0])}</div>
              {renderInputComponent(entries[i + 1][0], entries[i + 1][1])}
            </div>
          )}
        </div>,
      )
    }

    return rows
  }

  return (
    <div className="flex flex-col overflow-hidden p-6">
      {/* File preview */}
      <div className="p-12 m-auto w-full flex justify-center items-center relative">
        <Dialog open={open} onOpenChange={setOpen}>
          <FilePreview file={selectedFile} disableDialogFor3D={true} />
        </Dialog>
      </div>
      {/* Header */}
      <div className="flex-shrink-0 pb-2 px-6">
        <p className="text-xl text-foreground font-semibold">{t('header')}</p>
      </div>
      <div className="flex-1 px-6 overflow-auto">
        {editing
          ? editFileDetails()
          : (selectedFile
              ? renderFileDetails()
              : <div className="">{t('empty')}</div>)}
      </div>
    </div>
  )
})
FileDetails.displayName = 'FileDetails'
