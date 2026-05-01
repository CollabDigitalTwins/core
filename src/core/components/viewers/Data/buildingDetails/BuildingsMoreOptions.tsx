"use client"

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { usePermissions } from '../../../../store'

// Shadcn Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu'
import { Button } from '../../../ui/Button'
import { LoadingSpinner } from '../../../ui/LoadingSpinner'
import { toast } from 'sonner'

// Icons
import {
  MoreHorizontal,
  FileOutput,
  FileText,
  FileInput,
} from 'lucide-react'

// Types
import type { Building } from '../../../../types/dbTypes'

// Hooks
import { useBuilding, useCreateBuilding } from '../../../../hooks/buildings/buildings'

// Utils
import {
  generateBuildingSchemaCSV,
  exportBuildingsToCSV,
  parseCSVToBuildings,
  processBuildingImports,
  downloadCSV,
  generateTimestampedFilename,
} from '../utils/csvUtils'

// Template
import { buildingSchemaTemplate, getBuildingFieldNames } from './buildingSchemaTemplate'

interface BuildingMoreOptionsProps {
  buildings?: Building[]
  variant?: 'ghost' | 'outline' | 'default'
}

export default function BuildingMoreOptions({ buildings, variant }: BuildingMoreOptionsProps) {
  const t = useTranslations('BuildingMoreOptions')
  // Permissions
  const { ability } = usePermissions()

  const [isExporting, setIsExporting] = React.useState(false)
  const [isImporting, setIsImporting] = React.useState(false)

  const { data: session } = useSession()
  const { createBuilding, updateBuilding, buildings: allBuildings } = useCreateBuilding()

  const handleDownloadSchema = () => {
    try {
      const fieldNames = getBuildingFieldNames()
      const content = generateBuildingSchemaCSV(buildingSchemaTemplate, fieldNames)
      downloadCSV(content, 'buildings-schema.csv')
      toast.success(t('schemaDownloadSuccess'))
    } catch (error) {
      console.error('Error downloading schema:', error)
      toast.error(t('schemaDownloadError'))
    }
  }

  const handleExportBuildings = async () => {
    if (!buildings || buildings.length === 0) {
      toast.error(t('noDataAvailable'))
      return
    }

    setIsExporting(true)
    try {
      const content = exportBuildingsToCSV(buildings)
      const filename = generateTimestampedFilename('buildings')
      downloadCSV(content, filename)
      toast.success(`${t('exported')} ${buildings.length} ${t('exportSuccess')}`)
    } catch (error) {
      console.error('Error exporting buildings:', error)
      toast.error(t('exportError'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportBuildings = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsImporting(true)
      
      try {
        const text = await file.text()
        const buildingsToImport = parseCSVToBuildings(text)

        const { created, updated, failed } = await processBuildingImports(
          buildingsToImport,
          allBuildings,
          createBuilding,
          updateBuilding,
          session?.user?.organizationId?.toString() || ''
        )

        // Show summary toast
        const summary = []
        if (created > 0) summary.push(`${created} created`)
        if (updated > 0) summary.push(`${updated} updated`)
        if (failed > 0) summary.push(`${failed} failed`)

        if (failed === buildingsToImport.length) {
          toast.error(t('importError'))
        } else {
          toast.success(`Import complete: ${summary.join(', ')}`)
        }
      } catch (error) {
        console.error('Error importing buildings:', error)
        const errorMessage = error instanceof Error ? error.message : t('exportError')
        toast.error(errorMessage)
      } finally {
        setIsImporting(false)
      }
    }

    input.click()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant || 'outline'}
          className="dropdown-menu-trigger"
          onClick={e => e.stopPropagation()}
        >
          <MoreHorizontal />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportBuildings} disabled={isExporting || !ability.can('read', 'Building')}>
          <FileOutput />
          {isExporting ? <LoadingSpinner /> : t('exportTitle')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleImportBuildings} disabled={!ability.can('create', 'Building')}>
          <FileInput />
          {t('importTitle')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadSchema} disabled={!ability.can('read', 'Building')}>
          <FileText />
          {t('downloadSchema')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}