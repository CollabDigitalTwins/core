"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from "react";
import { usePropertyFilesColumns } from '../utils/Columns'
import { useFilesByBuildingId } from '../../../../hooks/files/files'

// Shadcn Components
import { Input } from '../../../ui/Input'
import { Button } from '../../../ui/Button'
import { DataTable } from '../../../ui/DataTable'
import { Dialog } from '../../../ui/Dialog'

// Custom Components
import FiltersDialog from '../advancedFilter/FiltersDialog'
import FilePreview from '../files/FilePreview'
import FileMoreOptions from '../files/FileMoreOptions'
import FilterFiles from './FilterFiles'
import { DbFile } from '../../../../types/dbTypes';

interface AttachedFilesProps {
  buildingId?: number
  files?: DbFile[]
  isLoading?: boolean
}

export default function AttachedFiles({ buildingId, files: propFiles, isLoading: propIsLoading }: AttachedFilesProps) {
  const propertyFilesColumns = usePropertyFilesColumns()
  // Use your existing hook to fetch files by building ID
  const { files: hookFiles, isLoading: hookIsLoading } = useFilesByBuildingId(buildingId || 0)

  const files = buildingId && hookFiles?.length > 0 ? hookFiles : propFiles
  const isLoading = buildingId ? hookIsLoading : propIsLoading

  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedFile, setSelectedFile] = React.useState<DbFile | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)
  const [selectedFileTypes, setSelectedFileTypes] = React.useState<string[]>([])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const transformedFiles = React.useMemo(() => {
    if (!files || !Array.isArray(files)) return []

    return files.map(file => ({
      id: file.id,
      name: file.name || 'Unknown File',
      type: file.type,
      mimeType: file.mimeType || 'Unknown',
      extension: file.extension || 'Unknown',
      dateUploaded: file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Unknown date',
      size: file.sizeBytes ? formatFileSize(file.sizeBytes) : 'Unknown size',
      tag: file.tag || 'General',
      url: file.assetId ? `/api/files/download/${file.assetId}` : file.url || '',
      // Keep original file object
      originalFile: file,
    }))
  }, [files])

  // Get unique file types for the filter dropdown
  const availableFileTypes = React.useMemo(() => {
    const types = transformedFiles.map(file => file.extension).filter(Boolean).filter(ext => ext !== 'Unknown')
    return [...new Set(types)]
  }, [transformedFiles])

  // Filter files based on search term and selected file types
  const filteredFiles = React.useMemo(() => {
    let filtered = transformedFiles

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
        || file.mimeType.toLowerCase().includes(searchTerm.toLowerCase())
        || file.tag.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Apply file type filter
    if (selectedFileTypes.length > 0) {
      filtered = filtered.filter(file => selectedFileTypes.includes(file.extension))
    }

    return filtered
  }, [transformedFiles, searchTerm, selectedFileTypes])

  const handleRowClick = (row: any) => {
    setSelectedFile(row.originalFile)
    setIsPreviewOpen(true)
  }

  return (
    <div className="h-auto">
      <div className="flex justify-between items-start h-14">
        <div className="flex flex-row gap-12 sm:gap-2 justify-between sm:justify-start w-full">
          <div>
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* <FiltersDialog
            filters={[]}
            filterFields={[]}
            setFilters={() => {}}
            onApplyFilters={() => {}}
            activeFilters={[]}
            setActiveFilters={() => {}}
          /> */}

          <FilterFiles
            availableTypes={availableFileTypes}
            selectedTypes={selectedFileTypes}
            onTypesChange={setSelectedFileTypes}
          />
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DataTable
          columns={propertyFilesColumns}
          data={filteredFiles}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          trailingCell={({ row }) => (
            <div onClick={e => e.stopPropagation()}>
              <FileMoreOptions
                file={row.original}
                buildingId={buildingId}
              />
            </div>
          )}
        />

        {selectedFile && isPreviewOpen && (
          <FilePreview file={{ metadata: selectedFile }} showTrigger={false} />
        )}
      </Dialog>
    </div>
  )
}