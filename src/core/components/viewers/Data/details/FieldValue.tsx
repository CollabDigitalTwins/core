// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import React from 'react'

// Shadcn Components
import { Badge } from '../../../../components/ui/Badge'

// Custom components
import FileUpload from './FileUpload'
import { useMapContext } from '../../../../store'
import { useSites } from '../../../../hooks/sites/sites'

interface FieldValueProps {
  value: any
  label: string | React.JSX.Element
  isFile?: boolean
  property?: string
  onChange?: (property: string, value: any) => void
  editing?: boolean
}

const SUBDIVISION_PROPERTIES = [
  'buildingCountrySubdivision',
  'siteCountrySubdivision',
  'infrastructureCountrySubdivision',
]

const FieldValue = ({ value, label, isFile = false, property = '', onChange = () => {}, editing = false }: FieldValueProps) => {
  const { state: mapState } = useMapContext()
  const countrySubdivisionsData = mapState.map.countrySubdivisionsData
  const { sites } = useSites()

  // Resolve the associated-site id(s) → site name(s); showing the raw id is
  // meaningless to the user.
  if (property === 'buildingParentSiteId' && value != null && value !== '') {
    const ids = Array.isArray(value) ? value : [value]
    const names = ids.map(id => sites.find(s => String(s.id) === String(id))?.siteName || String(id))
    value = names.length <= 1 ? (names[0] ?? value) : names
  }

  // Resolve subdivision code → display name (handles "CA-ON" and short "ON" formats)
  if (SUBDIVISION_PROPERTIES.includes(property) && typeof value === 'string' && value) {
    const exact = countrySubdivisionsData?.[value] as any
    if (exact) {
      value = (exact?.name ?? exact) || value
    } else if (countrySubdivisionsData) {
      const entry = Object.entries(countrySubdivisionsData).find(([k]) => k.endsWith(`-${value}`))
      if (entry) value = ((entry[1] as any)?.name ?? entry[1]) || value
    }
  }

  // Helper function to check if value is a date
    const isDateValue = (val: any): boolean => {
    // First check if property name indicates it's a date field
    if (property.toLowerCase().includes('date') || property.toLowerCase().includes('time')) {
      return true
    }

    // Check if value is actually a Date instance
    if (val instanceof Date) return true

    // For strings, only treat as date if it matches common date formats
    if (typeof val === 'string') {
      // Only check if it looks like an ISO date or timestamp format
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}/
      if (!isoDateRegex.test(val)) {
        return false
      }
      
      const date = new Date(val)
      return !isNaN(date.getTime())
    }

    return false
  }
  // Helper function to check if value is a URL
  const isUrl = (value: string): boolean => {
    // Check if it's a website property
    if (
      property.toLowerCase().includes('website')
      || property.toLowerCase().includes('url')
    ) {
      return true
    }

    // Additional check for URL pattern
    try {
      new URL(value)
      return true
    }
    catch {
      return false
    }
  }

  // Helper function to check if value is an email
  const isEmail = (value: string): boolean => {
    // Check if it's an email property
    if (property.toLowerCase().includes('email')) {
      return true
    }

    // Additional check for email pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  // Format URL with protocol if missing
  const formatUrl = (url: string): string => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    return `https://${url}`
  }

  const formatEnumValue = (value: string, property: string): string => {
    if (property === 'buildingElectricityServiceSize') {
      return value.replace('Size_', '')
    }
    return value.replaceAll('_', ' ')
  }

  if (value === null || value === undefined || value === '' || value === 'null'
    || (Array.isArray(value) && value.length === 0)) {
    return <span className="italic">---</span>
  }

  if (Array.isArray(value)) {
    if (isFile) {
      return (
        <FileUpload
          value={value}
          property={property}
          onChange={onChange}
          editing={editing}
        />
      )
    }

    return (
      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <Badge key={index} variant="default">
            {formatEnumValue(
              typeof item === 'object' && item !== null
                ? JSON.stringify(item)
                : String(item),
              property
            )}
          </Badge>
        ))}
      </div>
    )
  }

  // For yes/no values
  if (value === 'yes' || value === 'no') {
    return <span>{value === 'yes' ? 'Yes' : 'No'}</span>
  }

  // Add handling for URLs and emails
  if (typeof value === 'string') {
    // Render website links
    if (isUrl(value)) {
      const formattedUrl = formatUrl(value)
      return (
        <a
          href={formattedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          {value}
        </a>
      )
    }

    // Render email links
    if (isEmail(value)) {
      return (
        <a
          href={`mailto:${value}`}
          className="text-primary underline"
        >
          {value}
        </a>
      )
    }

    if (isDateValue(value)) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return <span>{date.toLocaleDateString()}</span>
        }
      }
      catch {
        // Fall through to default handling if date parsing fails
      }
    }
  }

  return <span>{formatEnumValue(String(value), property)}</span>
}

export default FieldValue