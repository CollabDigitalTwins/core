// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import React from 'react'
import {
  SiteEnergySource,
  SiteAssessmentConditions,
  SiteProjectPhase,
  SiteProjectType,
  SiteLandUse,
  
} from '../../../../types/dbTypes'
import { usePermissions, useMapContext } from '../../../../store'

// Shadcn Components
import { Checkbox, Input, Textarea, Button, Badge, DatePicker } from '../../../../components/ui/'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/Select'

// Custom components
import FileUpload from '../details/FileUpload'

// Icons
import * as LR from 'lucide-react'

interface FieldRendererProps {
  property: string
  value: any
  handleInputChange: (property: string, value: any) => void
  isTextAreaField: (property: string) => boolean
  isFileField: (property: string) => boolean
  isDateField?: (property: string) => boolean
  isEnumField?: (property: string) => boolean
  getEnumType?: (property: string) => string | null
  isNumberField?: (property: string) => boolean
  isFullWidthField?: (property: string) => boolean
}

const FieldRenderer = ({
  property,
  value,
  handleInputChange,
  isTextAreaField,
  isFileField,
  isDateField = () => false,
  isEnumField = () => false,
  isNumberField = () => false,
  getEnumType = () => null,
  isFullWidthField = () => false,
}: FieldRendererProps) => {
  
  // Permissions
  const { ability } = usePermissions()
  const { state: mapState } = useMapContext()
  const countrySubdivisionsData = mapState.map.countrySubdivisionsData ?? {}

  if (isFileField(property)) {
    return (
      <FileUpload
        value={Array.isArray(value) ? value : []}
        property={property}
        onChange={handleInputChange}
        editing={true}
        isFullWidthField={isFullWidthField(property)}
      />
    )
  }

  if (isDateField(property)) {
    return (
      <DatePicker
        date={value instanceof Date ? value : (value ? new Date(value) : undefined)}
        onSelect={date => handleInputChange(property, date)}
      />
    )
  }

  if (isEnumField(property)) {
    const enumType = getEnumType(property)

    // Return appropriate Select component based on enum type
    if (enumType === 'SiteEnergySource') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Site')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select energy source" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(SiteEnergySource).map(source => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (enumType === 'SiteAssessmentConditions') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Site')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select assessment condition" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(SiteAssessmentConditions).map(condition => (
              <SelectItem key={condition} value={condition}>
                {condition.replaceAll('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (enumType === 'SiteProjectPhase') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Site')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select project phase" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(SiteProjectPhase).map(style => (
              <SelectItem key={style} value={style}>
                {style}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (enumType === 'SiteProjectType') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Site')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select project type" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(SiteProjectType).map(type => (
              <SelectItem key={type} value={type}>
                {type.replaceAll('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (enumType === 'SiteLandUse') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Site')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select land use" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(SiteLandUse).map(use => (
              <SelectItem key={use} value={use}>
                {use.replaceAll('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    if (enumType === 'CountrySubdivisionData') {
      const resolveSubdivisionName = (code: string): string => {
        if (!code || !countrySubdivisionsData) return code
        const exact = countrySubdivisionsData[code] as any
        if (exact) return (exact?.name ?? exact) || code
        const entry = Object.entries(countrySubdivisionsData).find(([k]) => k.endsWith(`-${code}`))
        if (entry) return ((entry[1] as any)?.name ?? entry[1]) || code
        return code
      }
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Site')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select subdivision">
              {value ? resolveSubdivisionName(value) : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(countrySubdivisionsData).map(([code, sub]) => (
              <SelectItem key={code} value={code}>
                {(sub as any)?.name ?? code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
// //Here------------------------------------------------------    
  }

  if (isTextAreaField(property)) {
    return (
      <Textarea
        value={value || ''}
        onChange={e => handleInputChange(property, e.target.value)}
        disabled={!ability.can('update', 'Site')}
        rows={4}
      />
    )
  }

  if (Array.isArray(value)) {
    return (
      <>
        <div className="flex flex-row gap-2">
          <Input
            type="text"
            value=""
            onChange={() => {}}
            placeholder="Add new item"
          />
          <Button variant="outline" size="icon" disabled={!ability.can('update', 'Site')}><LR.Plus /></Button>
        </div>
        {/* Render Existing values */}
        <div className="flex flex-row gap-2">
          {(value || []).map((item: string, index: number) => (
            <Badge key={index} className="cursor-pointer inline-flex" variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
      </>
    )
  }

  if (value === 'yes' || value === 'no') {
    const bool = value === 'yes'
    return (
      <Checkbox
        checked={bool}
        onCheckedChange={checked => handleInputChange(property, checked ? 'yes' : 'no')}
        disabled={!ability.can('update', 'Site')}
      />
    )
  }

  if (typeof value === 'number' || (value === null && isNumberField(property))) {
    return (
      <Input
        type="number"
        value={value || ''}
        onChange={(e) => {
          const stringValue = e.target.value
          // If empty string, send null; otherwise convert to number
          const numValue = stringValue === '' ? null : Number(stringValue)
          handleInputChange(property, numValue)
        }}
        disabled={!ability.can('update', 'Site')}
      />
    )
  }

  // Default: text input
  return (
    <Input
      value={String(value || '')}
      onChange={e => handleInputChange(property, e.target.value)}
      disabled={!ability.can('update', 'Site')}
    />
  )
}

export default FieldRenderer
