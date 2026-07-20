// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as LR from 'lucide-react'
import React from 'react'


// Shadcn Components
import { Checkbox, Input, Textarea, Button, Badge, DatePicker } from '../../../../components/ui/'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/Select'
import { usePermissions } from '../../../../store'

// Custom components
import FileUpload from '../details/FileUpload'

// Icons

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
        disabled={!ability.can('update', 'Infrastructure')}
      />
    )
  }

  if (isEnumField(property)) {
    const enumType = getEnumType(property)

    // Return appropriate Select component based on enum type
    // if (enumType === 'InfrastructureEnergySource') {
    //   return (
    //     <Select
    //       value={value || ''}
    //       onValueChange={val => handleInputChange(property, val)}
    //     >
    //       <SelectTrigger>
    //         <SelectValue placeholder="Select energy source" />
    //       </SelectTrigger>
    //       <SelectContent>
    //         {Object.values(InfrastructureEnergySource).map(source => (
    //           <SelectItem key={source} value={source}>
    //             {source}
    //           </SelectItem>
    //         ))}
    //       </SelectContent>
    //     </Select>
    //   )
    // }

    // if (enumType === 'InfrastructureAssessmentConditions') {
    //   return (
    //     <Select
    //       value={value || ''}
    //       onValueChange={val => handleInputChange(property, val)}
    //     >
    //       <SelectTrigger>
    //         <SelectValue placeholder="Select assessment condition" />
    //       </SelectTrigger>
    //       <SelectContent>
    //         {Object.values(InfrastructureAssessmentConditions).map(condition => (
    //           <SelectItem key={condition} value={condition}>
    //             {condition.replaceAll('_', ' ')}
    //           </SelectItem>
    //         ))}
    //       </SelectContent>
    //     </Select>
    //   )
    // }

    // if (enumType === 'InfrastructureProjectPhase') {
    //   return (
    //     <Select
    //       value={value || ''}
    //       onValueChange={val => handleInputChange(property, val)}
    //     >
    //       <SelectTrigger>
    //         <SelectValue placeholder="Select project phase" />
    //       </SelectTrigger>
    //       <SelectContent>
    //         {Object.values(InfrastructureProjectPhase).map(style => (
    //           <SelectItem key={style} value={style}>
    //             {style}
    //           </SelectItem>
    //         ))}
    //       </SelectContent>
    //     </Select>
    //   )
    // }

    // if (enumType === 'InfrastructureProjectType') {
    //   return (
    //     <Select
    //       value={value || ''}
    //       onValueChange={val => handleInputChange(property, val)}
    //     >
    //       <SelectTrigger>
    //         <SelectValue placeholder="Select project type" />
    //       </SelectTrigger>
    //       <SelectContent>
    //         {Object.values(InfrastructureProjectType).map(type => (
    //           <SelectItem key={type} value={type}>
    //             {type.replaceAll('_', ' ')}
    //           </SelectItem>
    //         ))}
    //       </SelectContent>
    //     </Select>
    //   )
    // }

    // if (enumType === 'InfrastructureLandUse') {
    //   return (
    //     <Select
    //       value={value || ''}
    //       onValueChange={val => handleInputChange(property, val)}
    //     >
    //       <SelectTrigger>
    //         <SelectValue placeholder="Select land use" />
    //       </SelectTrigger>
    //       <SelectContent>
    //         {Object.values(InfrastructureLandUse).map(use => (
    //           <SelectItem key={use} value={use}>
    //             {use.replaceAll('_', ' ')}
    //           </SelectItem>
    //         ))}
    //       </SelectContent>
    //     </Select>
    //   )
    // }
  }

  if (isTextAreaField(property)) {
    return (
      <Textarea
        value={value || ''}
        onChange={e => handleInputChange(property, e.target.value)}
        rows={4}
        disabled={!ability.can('update', 'Infrastructure')}
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
            disabled={!ability.can('update', 'Infrastructure')}
          />
          <Button
            variant="outline"
            size="icon"
            disabled={!ability.can('update', 'Infrastructure')}
          ><LR.Plus /></Button>
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
        disabled={!ability.can('update', 'Infrastructure')}
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
        disabled={!ability.can('update', 'Infrastructure')}
      />
    )
  }

  // Default: text input
  return (
    <Input
      value={String(value || '')}
      onChange={e => handleInputChange(property, e.target.value)}
      disabled={!ability.can('update', 'Infrastructure')}
    />
  )
}

export default FieldRenderer
