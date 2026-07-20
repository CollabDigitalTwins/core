'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from "react";
import { useTranslations } from 'next-intl'

// Shadcn Components
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Badge } from '../../../ui/Badge'
import { Button } from '../../../ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '../../../ui/Dialog'
import { Separator } from '../../../ui/Separator'
import { Input } from '../../../ui/Input'

// Utils
import { useBuildingHeaders, useSiteHeaders } from '../utils/Headers'
import { filterFieldOptions } from '../utils/Columns'

// Icons
import {
  Plus,
  Filter,
} from 'lucide-react'

// Custom Components
import Filters from './Filters'

type FiltersDialogProps = {
  // Make filterFields optional
  filterFields?: filterFieldOptions[]
  filters: any[]
  activeFilters: any[]
  setFilters: React.Dispatch<React.SetStateAction<any[]>>
  setActiveFilters: React.Dispatch<React.SetStateAction<any[]>>
  onApplyFilters: (filters: any[]) => void
  data?: any[]
  isBuilding?: boolean // Flag to determine if we're filtering buildings or sites
}

const FiltersDialog = ({
  filters,
  filterFields: providedFilterFields,
  activeFilters,
  setFilters,
  onApplyFilters,
  setActiveFilters,
  data = [],
  isBuilding = true, // Default to building if not specified
}: FiltersDialogProps) => {
  // Translations
  const t = useTranslations('FiltersDialog')

  const buildingHeaders = useBuildingHeaders()
  const siteHeaders = useSiteHeaders()

  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false)
  const [filterSearch, setFilterSearch] = React.useState('')

  // Helper function to detect if data is buildings or sites
  const detectDataType = (data) => {
    if (!data || data.length === 0) return isBuilding // Use provided value if no data

    // Check the first item for building-specific properties
    const firstItem = data[0]
    if (firstItem?.buildingName !== undefined
      || firstItem?.buildingAddress !== undefined
      || firstItem?.buildingType !== undefined) {
      return true // It's a building
    }

    // Check for site-specific properties
    if (firstItem?.siteName !== undefined
      || firstItem?.siteAddress !== undefined
      || firstItem?.siteType !== undefined) {
      return false // It's a site
    }

    return isBuilding // Default to provided value if uncertain
  }

  // Use detected data type
  const dataIsBuilding = React.useMemo(() => detectDataType(data), [data, isBuilding])

  // Helper to extract fields from headers
  const extractFieldsFromHeaders = (headers) => {
    const organizedFields = []
    const duplicateLabelCheck = {} // Track duplicate labels

    // Common terms that often need context
    const commonLabels = [
      'Additional Information',
      'Notes',
      'Description',
      'Comments',
      'Details',
      'Status',
      'Type',
      'Date',
      'Name',
      'ID',
    ]

    // Define enum field mappings
    const enumFieldMappings = {
      // Building enum fields
      buildingCountrySubdivision: 'enum',
      buildingAssessmentCondition: 'enum',
      buildingGeometryStyle: 'enum',
      buildingProjectPhase: 'enum',
      buildingProjectType: 'enum',
      buildingHeatingCoolingEnergySources: 'enum',
      buildingHotWaterSystemsEnergySources: 'enum',
      buildingOccupantType: 'enum',
      buildingManagementType: 'enum',
      buildingType: 'enum',
      buildingElectricityServiceSize: 'enum',
      buildingElectricityServiceLocation: 'enum',

      // Site enum fields
      siteCountrySubdivision: 'enum',
      siteEnergyUsage: 'enum',
      siteAssessmentCondition: 'enum',
      siteProjectPhase: 'enum',
      siteProjectType: 'enum',
      siteLandUse: 'enum',
    }

    for (const section of headers) {
      // Create a group for each major section
      const sectionGroup = {
        title: section.title,
        fields: [],
      }

      for (const subsection of section.subsections) {
        for (const field of subsection.fields) {
          // Skip complex objects and arrays
          if (!field || !field.property
            || field.property === 'associatedBuildings'
            || field.property === 'siteBuildings'
            || Array.isArray(field.property)) {
            continue
          }

          // Track duplicate labels
          if (field.label) {
            duplicateLabelCheck[field.label] = (duplicateLabelCheck[field.label] || 0) + 1
          }

          // Create label with context if needed
          let displayLabel = field.label || field.property

          // Convert React nodes to strings
          if (typeof displayLabel === 'object' && displayLabel?.props?.children) {
            // Extract text from React fragments
            displayLabel = Array.isArray(displayLabel.props.children)
              ? displayLabel.props.children
                  .map(child => typeof child === 'string' ? child : child?.props?.children || '')
                  .join('')
                  .trim()
              : displayLabel.props.children
          }

          // Check if it's a common term or already found as duplicate
          const needsContext
            = commonLabels.some((term) => {
              const labelText = typeof displayLabel === 'string'
                ? displayLabel
                : (typeof displayLabel?.props?.children === 'string'
                    ? displayLabel.props.children
                    : '')
              return labelText.includes(term)
            })
            || duplicateLabelCheck[displayLabel] > 1

          if (needsContext) {
            displayLabel = `${displayLabel} (${section.title})`
          }

          // Determine field type
          let fieldType = 'string'
          if (enumFieldMappings[field.property]) {
            fieldType = 'enum'
          }
          else if (typeof field.property === 'string') {
            if (field.property.toLowerCase().includes('date')) {
              fieldType = 'date'
            }
            else if (/num|year|cost|value|area|total|sqft|height|elevation|expenses|consumption|emissions|intensity/i.test(field.property)) {
              fieldType = 'number'
            }
            else if (/is[A-Z]|has[A-Z]|can[A-Z]/.test(field.property)) {
              fieldType = 'boolean'
            }
          }

          sectionGroup.fields.push({
            id: field.property,
            label: displayLabel,
            type: fieldType,
            sectionTitle: section.title,
            subsectionTitle: subsection.title,
          })
        }
      }

      if (sectionGroup.fields.length > 0) {
        organizedFields.push(sectionGroup)
      }
    }

    return organizedFields
  }

  const organizedFields = React.useMemo(() => {
    return extractFieldsFromHeaders(dataIsBuilding ? buildingHeaders : siteHeaders)
  }, [dataIsBuilding])

  // Extract all fields from organized sections
  const headersFields = React.useMemo(() => {
    const fields = []
    for (const section of organizedFields) {
      for (const field of section.fields) {
        fields.push(field)
      }
    }
    return fields
  }, [organizedFields])

  // Determine which fields to use
  const allFilterFields = React.useMemo(() => {
    if (providedFilterFields && providedFilterFields.length > 0) {
      return providedFilterFields
    }
    return headersFields
  }, [providedFilterFields, headersFields])

  // Apply search to filter fields
  const filteredFields = React.useMemo(() => {
    if (!filterSearch) return allFilterFields

    // Checks for field and field.label
    return allFilterFields.filter((field) => {
      // Check if field exists and has a label property
      if (!field || typeof field.label !== 'string') return false

      return field.label.toLowerCase().includes((filterSearch || '').toLowerCase())
    })
  }, [allFilterFields, filterSearch])

  // Clear filters function
  const clearFilters = () => {
    setFilters([{
      id: 1,
      field: '',
      fieldType: null,
      operator: null,
      value: null,
      secondValue: null,
    }])
    setActiveFilters([])
  }

  // New filter row
  const addFilter = () => {
    setFilters([
      ...filters,
      {
        id: Date.now(),
        field: '',
        fieldType: null,
        operator: null,
        value: null,
        secondValue: null,
      },
    ])
  }

  // Handle apply filters
  const handleApplyFilters = () => {
    console.log('Applying filters', filters)
    const validFilters = filters.filter(f => f.field && f.operator && f.value !== null)
    console.log('Valid filters:', validFilters)
    setActiveFilters(validFilters)
    setFilterDialogOpen(false)

    // Call the onApplyFilters prop with the valid filters
    if (onApplyFilters) {
      onApplyFilters(validFilters)
    }
  }

  return (
    <>
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        {/* Advanced Filters Button */}
        <DialogTrigger asChild>
          <Button variant="outline" className="border-dashed">
            {activeFilters.length > 0
              ? (
                  <>
                    <Badge>
                      {activeFilters.length}
                    </Badge>
                    {t('advanced')}
                  </>
                )
              : (
                  <>
                    <Filter />
                    {t('advanced')}
                  </>
                )}
          </Button>
        </DialogTrigger>

        <DialogContent className="w-[65%] max-w-[900px]">
          <DialogHeader className="pb-5">
            <DialogTitle>{t('header')}</DialogTitle>
            <VisuallyHidden>
              <DialogDescription>{t('description')}</DialogDescription>
            </VisuallyHidden>
          </DialogHeader>

          {/* Filters */}
          <Filters
            filters={filters}
            filterFields={filteredFields}
            organizedFields={organizedFields}
            setFilters={setFilters}
            onApplyFilters={handleApplyFilters}
            filterSearchState={filterSearch}
            setFilterSearchState={setFilterSearch}
          />

          <Separator />

          <DialogFooter>
            <div className="w-full flex justify-between">
              <Button
                variant="outline"
                onClick={addFilter}
              >
                <Plus />
                {t('add')}
              </Button>
              <div>
                <Button onClick={clearFilters} className="mr-2">
                  {t('clear')}
                </Button>
                <Button
                  onClick={handleApplyFilters}
                  disabled={!filters.some(f => f.field && f.operator && f.value !== null && f.value !== '')}
                >
                  {t('apply')}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default FiltersDialog