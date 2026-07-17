"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import React from 'react'
import {
  BuildingAssessmentConditions,
  BuildingGeometryStyle,
  BuildingProjectPhase,
  BuildingProjectType,
  BuildingEnergySource,
  BuildingOccupantType,
  BuildingManagementType,
  BuildingHeatingEnergySource,
  BuildingCoolingEnergySource,
  BuildingHotWaterEnergySource,
  BuildingElectricityServiceSize,
  BuildingElectricityServiceLocation,
} from '../../../../types/dbTypes'

import { useSites } from '../../../../hooks/sites/sites'
import { useTranslations } from 'next-intl'
import { usePermissions, useMapContext } from '../../../../store'

import { Checkbox } from '../../../ui/Checkbox'
import { Input } from '../../../ui/Input'
import { Textarea } from '../../../ui/Textarea'
import { Button } from '../../../ui/Button'
import { Badge } from '../../../ui/Badge'
import { DatePicker } from '../../../ui/DatePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/Select'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../../../ui/Command'

import FileUpload from '../details/FileUpload'

import { Plus, X } from 'lucide-react'
import { LoadingSpinner } from '../../../ui/LoadingSpinner'

export const BuildingTypeEnum = [
  'Townhouses',
  '<4 Storey MURB',
  '4+ Storey MURB',
  'Stacked Townhouses',
  'Detached',
  'Semi Detached',
] as const

interface FieldRendererProps {
  property: string
  value: any
  handleInputChange: (property: string, value: any) => void
  isTextAreaField: (property: string) => boolean
  isFileField: (property: string) => boolean
  isDateField?: (property: string) => boolean
  isEnumField?: (property: string) => boolean
  isNumberField?: (property: string) => boolean
  isFullWidthField?: (property: string) => boolean
  getEnumType?: (property: string) => string | null
  buildingId?: number
  setActiveChanges?: (editing: boolean) => void
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
  isFullWidthField = () => false,
  getEnumType = () => null,
  buildingId,
  setActiveChanges,
}: FieldRendererProps) => {
  const t = useTranslations('BuildingFieldRenderer')
  const { state: mapState } = useMapContext()
  const countrySubdivisionsData = mapState.map.countrySubdivisionsData ?? {}

  // Permissions
  const { ability } = usePermissions()

  const getFileTagFromProperty = (property: string): string => {
    const propertyToTagMap: Record<string, string> = {
      buildingMaintenanceRecords: 'maintenanceRecords',
      buildingSystemAssessment: 'systemAssessments',
      buildingFireSafety: 'fireSafety',
      buildingOccupancyCertificate: 'occupancyCertificate',
      buildingEnvironmentalCompliance: 'environmentalCompliance',
      buildingZoningCompliance: 'zoningCompliance',
      buildingPermitsIssued: 'permitsIssued',
      buildingCertificationsFile: 'certificationsFile',
      buildingRegionalEnergyTrends: 'regionalEnergyTrends',
      buildingEnergyCodeCompliance: 'energyCodeCompliance',
      buildingBuildingCodeCompliance: 'buildingCodeCompliance',
      buildingProximityToServices: 'proximityToServices',
      EnergyAssessmentReports: 'buildingEnergyAssessmentReports',
      AirQualityReports: 'buildingAirQualityReports',
      WaterQualityReports: 'buildingWaterQualityReports',
      DSRs: 'DSRs',
      BCAs: 'buildingBCAs',
      ContractorReports: 'buildingContractorReports',
      EngineeringAssessments: 'buildingEngineeringAssessments',
    }
    return propertyToTagMap[property] || property
  }

  // Special handling for energy source arrays
  if (property === 'buildingHeatingEnergySources') {
    const selectedValues = Array.isArray(value) ? value : []
    return (
      <div className="space-y-2">
        <Select
          value=""
          onValueChange={val => {
            if (!selectedValues.includes(val)) {
              handleInputChange(property, [...selectedValues, val])
            }
          }}
          disabled={!ability.can('update', 'Building')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select heating source(s)" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(BuildingHeatingEnergySource).filter(type => !selectedValues.includes(type)).map(type => (
              <SelectItem key={type} value={type}>{type.replaceAll('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-1">
          {selectedValues.map(type => (
            <Badge key={type} className="gap-1" variant="secondary">
              {type.replaceAll('_', ' ')}
              <Button
                variant="ghost"
                size="icon"
                className="p-0 hover:bg-transparent w-auto h-auto"
                onClick={() => {
                  const updated = selectedValues.filter(t => t !== type)
                  handleInputChange(property, updated)
                }}
                disabled={!ability.can('update', 'Building')}
              >
                <X className="!w-3 !h-3" size={8} />
              </Button>
            </Badge>
          ))}
        </div>
      </div>
    )
  }
  if (property === 'buildingCoolingEnergySources') {
    const selectedValues = Array.isArray(value) ? value : []
    return (
      <div className="space-y-2">
        <Select
          value=""
          onValueChange={val => {
            if (!selectedValues.includes(val)) {
              handleInputChange(property, [...selectedValues, val])
            }
          }}
          disabled={!ability.can('update', 'Building')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select cooling source(s)" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(BuildingCoolingEnergySource).filter(type => !selectedValues.includes(type)).map(type => (
              <SelectItem key={type} value={type}>{type.replaceAll('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-1">
          {selectedValues.map(type => (
            <Badge key={type} className="gap-1" variant="secondary">
              {type.replaceAll('_', ' ')}
              <Button
                variant="ghost"
                size="icon"
                className="p-0 hover:bg-transparent w-auto h-auto"
                onClick={() => {
                  const updated = selectedValues.filter(t => t !== type)
                  handleInputChange(property, updated)
                }}
                disabled={!ability.can('update', 'Building')}
              >
                <X className="!w-3 !h-3" size={8} />
              </Button>
            </Badge>
          ))}
        </div>
      </div>
    )
  }
  if (property === 'buildingHotWaterSystemsEnergySources') {
    const selectedValues = Array.isArray(value) ? value : []
    return (
      <div className="space-y-2">
        <Select
          value=""
          onValueChange={val => {
            if (!selectedValues.includes(val)) {
              handleInputChange(property, [...selectedValues, val])
            }
          }}
          disabled={!ability.can('update', 'Building')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select hot water source(s)" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(BuildingHotWaterEnergySource).filter(type => !selectedValues.includes(type)).map(type => (
              <SelectItem key={type} value={type}>{type.replaceAll('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-1">
          {selectedValues.map(type => (
            <Badge key={type} className="gap-1" variant="secondary">
              {type.replaceAll('_', ' ')}
              <Button
                variant="ghost"
                size="icon"
                className="p-0 hover:bg-transparent w-auto h-auto"
                onClick={() => {
                  const updated = selectedValues.filter(t => t !== type)
                  handleInputChange(property, updated)
                }}
                disabled={!ability.can('update', 'Building')}
              >
                <X className="!w-3 !h-3" size={8} />
              </Button>
            </Badge>
          ))}
        </div>
      </div>
    )
  }

  if (isFileField(property)) {
    return (
      <FileUpload
        value={Array.isArray(value) ? value : []}
        property={property}
        tag={getFileTagFromProperty(property)}
        onChange={handleInputChange}
        editing={true}
        buildingId={buildingId}
        onFileUpload={() => setActiveChanges?.(true)}
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

    // Multiselect for building type
    if (property === 'buildingType') {
      const selectedValues = Array.isArray(value) ? value : []
      return (
        <div className="space-y-2">
          <Select
            value=""
            onValueChange={(newType) => {
              if (!selectedValues.includes(newType)) {
                handleInputChange(property, [...selectedValues, newType])
              }
            }}
            disabled={!ability.can('update', 'Building')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select building type(s)" />
            </SelectTrigger>
            <SelectContent>
              {BuildingTypeEnum
                .filter(type => !selectedValues.includes(type))
                .map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1">
            {selectedValues.map(type => (
              <Badge key={type} className="gap-1" variant="secondary">
                {type}
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-0 hover:bg-transparent w-auto h-auto"
                  onClick={() => {
                    const updated = selectedValues.filter(t => t !== type)
                    handleInputChange(property, updated)
                  }}
                  disabled={!ability.can('update', 'Building')}
                >
                  <X className="!w-3 !h-3" size={8} />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )
    }

    if (enumType === 'CountrySubdivisionData') {
      // Resolve display name — handles both full ("CA-ON") and short ("ON") stored codes
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
          disabled={!ability.can('update', 'Building')}
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

    if (enumType === 'BuildingAssessmentConditions') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Building')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select assessment condition" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(BuildingAssessmentConditions).map(condition => (
              <SelectItem key={condition} value={condition}>
                {condition.replaceAll('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (enumType === 'BuildingGeometryStyle') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Building')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select geometry style" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(BuildingGeometryStyle).map(style => (
              <SelectItem key={style} value={style}>
                {style}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (enumType === 'BuildingProjectPhase') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Building')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select project phase" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(BuildingProjectPhase).map(phase => (
              <SelectItem key={phase} value={phase}>
                {phase.replaceAll('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (enumType === 'BuildingProjectType') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Building')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select project type" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(BuildingProjectType).map(type => (
              <SelectItem key={type} value={type}>
                {type.replaceAll('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (enumType === 'BuildingOccupantType') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Building')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select occupant type" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(BuildingOccupantType).map(type => (
              <SelectItem key={type} value={type}>
                {type.replaceAll('_', ' ').replace('Plus', '+')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (enumType === 'buildingAssessmentRatingCondition') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Building')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select rating condition" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(BuildingAssessmentConditions).map(type => (
              <SelectItem key={type} value={type}>
                {type.replaceAll('_', ' ').replace('Plus', '+')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (enumType === 'BuildingManagementType') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Building')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select management type" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(BuildingManagementType).map(type => (
              <SelectItem key={type} value={type}>
                {type.replaceAll('_', ' ').replace('Plus', '+')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (enumType === 'BuildingType') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Building')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select management type" />
          </SelectTrigger>
          <SelectContent>
            {BuildingTypeEnum.map(type => (
              <SelectItem key={type} value={type}>
                {type.replaceAll('_', ' ').replace('Plus', '+')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (enumType === 'BuildingElectricityServiceSize') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Building')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select management type" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(BuildingElectricityServiceSize).map(type => (
              <SelectItem key={type} value={type}>
                {type.replaceAll('_', ' ').replace('Plus', '+').replace('Size', '')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    if (enumType === 'BuildingElectricityServiceLocation') {
      return (
        <Select
          value={value || ''}
          onValueChange={val => handleInputChange(property, val)}
          disabled={!ability.can('update', 'Building')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select management type" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(BuildingElectricityServiceLocation).map(type => (
              <SelectItem key={type} value={type}>
                {type.replaceAll('_', ' ').replace('Plus', '+')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
  }



  if (property === 'buildingParentSiteId' && setActiveChanges) {
    const { sites, isLoading } = useSites()
    const [search, setSearch] = React.useState('')
    // A building has a single parent site (buildingParentSiteId is a scalar FK),
    // so this is single-select: pick one, show it once, X clears it.
    const selectedId = Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
    const filteredSites = React.useMemo(() => {
      if (!sites) return []
      const lower = search.toLowerCase()
      return sites.filter(site =>
        (site.siteName && site.siteName.toLowerCase().includes(lower))
        || (site.siteAddress && site.siteAddress.toLowerCase().includes(lower)),
      )
    }, [sites, search])
    const selectedSite = sites?.find(site => site.id === selectedId) || null

    return (
      <div className="space-y-2">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search for a site..."
            value={search}
            onValueChange={setSearch}
            disabled={isLoading}
          />
          {search.trim() !== '' && (
            <CommandList>
              {isLoading && <CommandEmpty><LoadingSpinner /></CommandEmpty>}
              {!isLoading && filteredSites.length === 0 && (
                <CommandEmpty>{t('empty')}</CommandEmpty>
              )}
              <CommandGroup>
                {filteredSites.map(site => (
                  <CommandItem
                    key={site.id}
                    value={site.id.toString()}
                    onSelect={() => {
                      handleInputChange(property, site.id)
                      setSearch('')
                    }}
                  >
                    <div>
                      <div className="font-medium">{site.siteName}</div>
                      <div className="text-xs text-muted-foreground">{site.siteAddress}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          )}
        </Command>
        {selectedSite && (
          <div className="flex flex-wrap gap-1">
            <Badge className="gap-1" variant="secondary">
              {selectedSite.siteName}
              <Button
                variant="ghost"
                size="icon"
                className="p-0 hover:bg-transparent w-auto h-auto"
                onClick={() => handleInputChange(property, null)}
                disabled={!ability.can('update', 'Building')}
              >
                <X className="!w-3 !h-3" size={8} />
              </Button>
            </Badge>
          </div>
        )}
      </div>
    )
  }

  if (isTextAreaField(property)) {
    return (
      <Textarea
        value={value || ''}
        onChange={e => handleInputChange(property, e.target.value)}
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
            disabled={!ability.can('update', 'Building')}
          />
          <Button variant="outline" size="icon" disabled={!ability.can('update', 'Building')}><Plus /></Button>
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
      />
    )
  }

  if (typeof value === 'number' || (value === null && isNumberField(property))) {
    return (
      <Input
        type="number"
        value={value === null || value === undefined ? '' : value}
        onChange={(e) => {
          const stringValue = e.target.value
          const numValue = stringValue === '' ? null : Number(stringValue)
          handleInputChange(property, numValue)
        }}
        disabled={!ability.can('update', 'Building')}
      />
    )
  }

  return (
    <Input
      value={String(value || '')}
      onChange={e => handleInputChange(property, e.target.value)}
      disabled={!ability.can('update', 'Building')}
    />
  )
}

export default FieldRenderer