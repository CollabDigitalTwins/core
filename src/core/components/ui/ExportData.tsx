// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Types
import {
  FileOutput,
  ChevronDown,

} from 'lucide-react'
import { useTranslations } from 'next-intl'


import { usePermissions } from '../../store'
import { toDisplayString } from '../../utils/utils'


// Shadcn Components
import { Button } from './Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './DropdownMenu'

// Icons

import type { DataTypes } from '../../types'
import type { Building, Site, DbFile } from '../../types/dbTypes'
import type { FileRow } from '../../types/files'

interface ExportDataProps {
  data: Building[] | Site[] | FileRow[] | DbFile[]
  variant?: 'secondary' | 'ghost'
  type?: DataTypes
  className?: string
}

export default function ExportData({ data, variant, type, className }: ExportDataProps) {
  // Translation
  const t = useTranslations('ExportData')
  // Permissions
  const { ability } = usePermissions()

  // Helper function to get display name for item based on type
  const getItemName = (item: Building | Site | DbFile | FileRow, type?: string) => {
    if (type === 'building' && 'propertyName' in item) return item.propertyName
    if ((type === 'site' || type === 'file') && 'name' in item) return item.name

    if ('propertyName' in item) return item.propertyName
    if ('name' in item) return item.name
    return 'item'
  }

  const handleExport = (format: string) => {
  // Convert data to the selected format
    let content = ''
    let filename = ''
    let mimeType = ''

    // Generate a timestamp for the filename to ensure uniqueness
    const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-').slice(0, 19)

    // Determine filename based on export context
    // If only 1 item, use its name; otherwise use a collection descriptor
    const filenameBase = data.length === 1
      ? `${type || 'item'}-${(getItemName(data[0], type) as string).replaceAll(/\s+/g, '-').toLowerCase()}`
      : `${type || 'item'}s-${data.length}-items`

    // CSV format
    if (format === 'csv') {
    // Extract column headers from the first item's property names
      const headers = Object.keys(data[0]).join(',')

      // Iterate through each data item, extract all values and convert to CSV-compatible format
      // Properly escape string values by wrapping in quotes to handle commas.
      // Structured values are serialized as JSON (which also contains commas, so
      // it needs the same quoting) instead of landing as '[object Object]'.
      const rows = data.map(item =>
        Object.values(item).map((value): string => {
          if (typeof value === 'string') return `"${value.replaceAll('"', '""')}"`
          const text = toDisplayString(value)
          // JSON of a structured value contains commas, so it needs quoting too
          return typeof value === 'object' && value !== null
            ? `"${text.replaceAll('"', '""')}"`
            : text
        }).join(','),
      ).join('\n')

      // Combine headers and data rows into complete CSV content
      content = `${headers}\n${rows}`

      // Set appropriate filename and MIME type for CSV
      filename = `${filenameBase}_${timestamp}.csv`
      mimeType = 'text/csv'

    // XML format
    }
    else if (format === 'xml') {
      // XML declaration and root element
      const rootElement = type ? `${type}s` : t('itemPl')
      const itemElement = type ? type : t('item')

      content = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n`

      // Process each item into XML format
      for (const item of data) {
        // Create an element for each item in the data
        content += `<${itemElement}>\n`

        // For each property in the item, create an XML element
        // - Property name becomes the tag name
        // - Property value becomes the content
        for (const [key, value] of Object.entries(item)) {
          // Properly escape special XML characters to prevent parsing issues
          const safeValue = String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll('\'', '&apos;')

          // Add the element with proper indentation for readability
          content += `<${key}>${safeValue}</${key}>\n`
        }

        // Close the item element
        content += `</${itemElement}>\n`
      }

      // Close the root element
      content += `</${rootElement}>`

      // Set appropriate filename and MIME type for XML
      filename = `${filenameBase}_${timestamp}.xml`
      mimeType = 'application/xml'
    }

    // Create a Blob object which represents the file data with proper MIME type
    const blob = new Blob([content], { type: mimeType })

    // Create a downloadable URL pointing to the Blob data
    const url = URL.createObjectURL(blob)

    // Create an invisible anchor element to trigger the download
    const a = document.createElement('a')
    a.href = url
    a.download = filename

    // Add to DOM temporarily and trigger click to start download
    document.body.append(a)
    a.click()

    // Clean up resources, remove the temporary element and revoke the object URL
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          className={`"dropdown-menu-trigger" ${className}`}
          onClick={(e) => { e.stopPropagation() }}
          disabled={type === 'building' && !ability.can('read', 'Building') || type === 'site' && !ability.can('read', 'Site') || type === 'file' && !ability.can('read', 'File')}
        >
          <FileOutput />
          <span className="">{t('exportButton')}</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            handleExport('csv')
          }}
        >
          {t('csv')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            handleExport('xml')
          }}
        >
          {t('xml')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
