'use client'

// Dependencies
import { useTranslations } from 'next-intl'
import * as React from 'react'

// Icons
import * as LR from 'lucide-react'

// Shadcn components
import { Popover, PopoverTrigger, PopoverContent } from '../../../ui/Popover'
import { Checkbox, Button, Input } from '../../../ui/'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup } from '../../../ui/Select'

import { filterFieldOptions } from '../utils/Columns'

type FiltersProps = {
  filterFields: filterFieldOptions[]
  filters: any[]
  setFilters: React.Dispatch<React.SetStateAction<any[]>>
  onApplyFilters: (filters: any[]) => void
  organizedFields?: { title: string, fields: filterFieldOptions[] }[]
  filterSearchState: string 
  setFilterSearchState: React.Dispatch<React.SetStateAction<string>>
}

const enumValues = {
  // Building enums
  buildingCountrySubdivision: ['CA-AB', 'CA-BC', 'CA-MB', 'CA-NB', 'CA-NL', 'CA-NS', 'CA-NT', 'CA-NU', 'CA-ON', 'CA-PE', 'CA-QC', 'CA-SK', 'CA-YT'],
  buildingAssessmentCondition: ['Excellent', 'Good', 'Fair', 'Poor'],
  buildingGeometryStyle: ['Complex', 'Simple', 'Apartment'],
  buildingProjectPhase: ['Inception_Phase', 'Conceptualization_Phase', 'Criteria_Definition_Phase', 'Design_Phase', 'Coordination_Phase', 'Implementation_Phase', 'Handover_Phase', 'Operations_Phase'],
  buildingProjectType: ['Modification', 'New_Build', 'Renovation', 'Repair', 'Operation_Maintenance', 'Retrofit'],
  buildingHeatingCoolingEnergySources: ['Gas', 'Propane', 'Electric_BB', 'Oil', 'Electric', 'Natural_Gas', 'Solar', 'Wind', 'Geothermal', 'District_Heating'],
  buildingHotWaterSystemsEnergySources: ['Gas', 'Propane', 'Electric_BB', 'Oil', 'Electric', 'Natural_Gas', 'Solar', 'Wind', 'Geothermal', 'District_Heating'],
  buildingOccupantType: ['Adults', 'Families', 'Seniors', 'Seniors_55_Plus', 'Seniors_65_Plus', 'Seniors_60_Plus', 'Indigenous_Families', 'Youth', 'Adults_16_Plus', 'Adults_16_To_24', 'Singles', 'Families_Single_Parents', 'Indigenous'],
  buildingManagementType: ['Internal', 'External', 'Municipal', 'Private'],
  buildingElectricityServiceSize: [60, 100, 200],
  buildingElectricityServiceLocation: ['Overhead', 'Underhead'],
  buildingType: ['Townhouses','<4 Storey MURB','4+ Storey MURB','Stacked Townhouses','Detached','Semi Detached'],

  // Site enums
  siteCountrySubdivision: ['CA-AB', 'CA-BC', 'CA-MB', 'CA-NB', 'CA-NL', 'CA-NS', 'CA-NT', 'CA-NU', 'CA-ON', 'CA-PE', 'CA-QC', 'CA-SK', 'CA-YT'],
  siteEnergyUsage: ['Gas', 'Propane', 'Electric_BB', 'Oil', 'Electric', 'Natural_Gas', 'Solar', 'Wind', 'Geothermal', 'District_Heating'],
  siteAssessmentCondition: ['Excellent', 'Good', 'Fair', 'Poor'],
  siteProjectPhase: ['Inception_Phase', 'Conceptualization_Phase', 'Criteria_Definition_Phase', 'Design_Phase', 'Coordination_Phase', 'Implementation_Phase', 'Handover_Phase', 'Operations_Phase'],
  siteProjectType: ['Modification', 'New_Build', 'Renovation', 'Repair', 'Operation_Maintenance', 'Retrofit'],
  siteLandUse: ['Residential', 'Industry_And_Business', 'Mixed_Use', 'Special_Function_Area', 'Monument', 'Dump', 'Mining', 'Park', 'Cemetary', 'Sports_Leisure_and_Recreation', 'Open_Pit_Quarry', 'Road', 'Railway', 'Airfield', 'Shipping', 'Track', 'Square', 'Grassland', 'Agriculture', 'Forest', 'Grove', 'Heath', 'Moor', 'Marsh', 'Untilled_Land', 'River', 'Standing_Waterbody', 'Harbour', 'Sea'],
}

// Helper function to check if a field is an enum and get its values
const getEnumValues = (fieldId: string) => {
  return enumValues[fieldId] || null
}

// Helper function to determine if a field is an enum
const isEnumField = (fieldId: string) => {
  return enumValues[fieldId] !== undefined
}

const Filters = ({ filters, filterFields, setFilters, onApplyFilters, organizedFields, setFilterSearchState, filterSearchState }: FiltersProps) => {

  // Remove a filter row
  const removeFilter = (id: string) => {
    setFilters(filters.filter(filter => filter.id !== id))
    // Clean up search state for removed filter
    setFilterSearchState('')
  }

  // Translations
  const t = useTranslations('Filters')

  // Field types and their operators
  const fieldTypes = {
    boolean: {
      operators: [
        { value: 'isTrue', label: t('isTrue') },
        { value: 'isFalse', label: t('isFalse') },
      ],
    },
    string: {
      operators: [
        { value: 'contains', label: t('contains') },
        { value: 'equals', label: t('equals') },
        { value: 'startsWith', label: t('startsWith') },
        { value: 'endsWith', label: t('endsWith') },
      ],
    },
    enum: {
      operators: [
        { value: 'equals', label: t('equals') },
        { value: 'inList', label: t('inList') },
      ],
    },
    number: {
      operators: [
        { value: 'equals', label: t('equals') },
        { value: 'greaterThan', label: t('greaterThan') },
        { value: 'lessThan', label: t('lessThan') },
        { value: 'between', label: t('between') },
      ],
    },
    date: {
      operators: [
        { value: 'equals', label: t('isOn') },
        { value: 'before', label: t('isBefore') },
        { value: 'after', label: t('isAfter') },
        { value: 'between', label: t('isBetween') },
      ],
    },
  }

  // Update a filter's field and reset operator
  const updateFilterField = (id, fieldId) => {
    const field = filterFields.find(f => f.id === fieldId)
    if (!field) {
      console.warn('Field not found:', fieldId)
      return
    }

    setFilters(filters.map((filter) => {
      if (filter.id === id) {
        if (!fieldTypes[field.type]) {
          console.warn(`Unknown field type: ${field.type}`)
          return filter
        }

        const defaultOperator = fieldTypes[field.type].operators[0].value
        return {
          ...filter,
          field: fieldId,
          fieldType: field.type,
          operator: defaultOperator,
          value: null,
          secondValue: null,
        }
      }
      return filter
    }))
  }

  // Update a filter's operator
  const updateFilterOperator = (id, operator) => {
    setFilters(filters.map((filter) => {
      if (filter.id === id) {
        return { ...filter, operator, value: null, secondValue: null }
      }
      return filter
    }))
  }

  // Update a filter's value
  const updateFilterValue = (id, value, isSecond = false) => {
    setFilters(filters.map((filter) => {
      if (filter.id === id) {
        if (isSecond) {
          return { ...filter, secondValue: value }
        }
        return { ...filter, value }
      }
      return filter
    }))
  }

  // Render value input based on field type and operator
  const renderValueInput = (filter) => {
    const { fieldType, operator, value, secondValue, field } = filter

    if (fieldType === 'boolean') {
      return null
    }

    const needsSecondInput = operator === 'between'

    switch (fieldType) {
      case 'string':
        return (
          <div className="flex flex-1 items-center w-full md:w-1/2">
            <Input
              className="flex-1"
              value={value || ''}
              onChange={e => updateFilterValue(filter.id, e.target.value)}
              placeholder={t('valuePlaceholder')}
            />
          </div>
        )

      case 'enum':
        if (operator === 'inList') {
          const currentValue = value == null ? [] : value
          const enumOptions = getEnumValues(field) || []

          return (
            <div className="flex flex-1 items-center w-full ">
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Input
                    className={'cursor-pointer ' + (currentValue.length === 0 ? 'text-gray-500' : '')}
                    value={currentValue && currentValue.length > 0
                      ? (currentValue as string[]).join(', ')
                      : 'Select values'}
                  />
                </PopoverTrigger>
                <PopoverContent>
                  <div className="w-full max-h-60 overflow-y-auto mb-2">
                    <div>
                      <Checkbox
                        onCheckedChange={(checked) => {
                          updateFilterValue(filter.id, checked ? enumOptions : [])
                        }}
                        className="mr-2 border-wht"
                      />
                      {t('select')}
                    </div>
                    {enumOptions.map(opt => (
                      <div
                        key={opt}
                        className="flex items-center space-x-2 py-1"
                      >
                        <Checkbox
                          className="mr-2 border-wht"
                          checked={(value || []).includes(opt)}
                          onCheckedChange={(checked) => {
                            const current = Array.isArray(value) ? value : []
                            const next = checked
                              ? [...current, opt]
                              : current.filter(v => v !== opt)
                            updateFilterValue(filter.id, next)
                          }}
                        />
                        {opt}
                      </div>
                    ))}
                  </div>

                  <Button onClick={() => { updateFilterValue(filter.id, []) }} className="w-full mt-2">
                    {t('clear')}
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          )
        }

        const enumOptions = getEnumValues(field) || []
        return (
          <div className="flex flex-1 items-center w-full md:w-1/2">
            <Select
              value={value || ''}
              onValueChange={selectedValue => updateFilterValue(filter.id, selectedValue)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectValuePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {enumOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'number':
        return (
          <div className="flex flex-1 items-center gap-3 w-full">
            <Input
              type="number"
              value={value || ''}
              onChange={e => updateFilterValue(filter.id, e.target.value ? Number(e.target.value) : '')}
              placeholder={t('valuePlaceholder')}
            />

            {needsSecondInput && (
              <>
                <Input
                  type="number"
                  value={secondValue || ''}
                  onChange={e => updateFilterValue(filter.id, e.target.value ? Number(e.target.value) : '', true)}
                  placeholder={t('valuePlaceholder')}
                />
              </>
            )}
          </div>
        )

      case 'date':
        return (
          <div className="flex flex-1 items-center gap-3 w-full">
            <Input
              type="date"
              value={value || ''}
              onChange={e => updateFilterValue(filter.id, e.target.value)}
              placeholder={t('valuePlaceholder')}
            />

            {needsSecondInput && (
              <>
                <Input
                  type="date"
                  value={secondValue || ''}
                  onChange={e => updateFilterValue(filter.id, e.target.value, true)}
                  placeholder={t('valuePlaceholder')}
                />
              </>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex flex-col gap-3 max-h-[65vh] overflow-auto p-0.5">
      {filters.map((filter, index) => {
        const fieldType = filter.fieldType
        const operators = fieldTypes[fieldType]?.operators || []

        // Get the search state for this specific filter
        const filterSearch = filterSearchState[filter.id] || ''
        const setFilterSearch = (value: string) => {
          setFilterSearchState(value)
        }

        return (
          <div
            key={filter.id}
            className="flex flex-col md:flex-row items-center gap-3"
          >
            <div className="flex flex-col md:flex-row items-center gap-3 w-full">

              {/* Field selector */}
              <Select
                value={filter.field}
                onValueChange={(value) => {
                  updateFilterField(filter.id, value)
                }}
              >
                <SelectTrigger className="md:w-1/4">
                  <SelectValue placeholder={t('selectField')} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <div className="sticky -top-1 bg-background z-10">
                    <div className="relative mb-2">
                      <Input
                        placeholder={t('searchFields')}
                        className="focus-visible:ring-offset-0 focus-visible:ring-0"
                        value={filterSearch}
                        onChange={(e) => {
                          e.stopPropagation()
                          setFilterSearch(e.target.value)
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation()
                          if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault()
                          }
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  {organizedFields?.map((section) => {
                    const filteredSectionFields = section.fields.filter(field =>
                      !filterSearch
                      || (
                        field
                        && typeof field.label === 'string'
                        && field.label.toLowerCase().includes(filterSearch.toLowerCase())
                      ),
                    )
                    if (filteredSectionFields.length === 0) return null

                    return (
                      <SelectGroup key={section.title}>
                        <SelectLabel className="text-xs font-bold pt-2">{section.title}</SelectLabel>
                        {filteredSectionFields.map(field => (
                          <SelectItem
                            key={field.id}
                            value={field.id}
                            className="cursor-pointer"
                          >
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )
                  })}
                </SelectContent>
              </Select>

              {/* Operator selector */}
              <Select
                value={filter.operator}
                onValueChange={value => updateFilterOperator(filter.id, value)}
              >
                <SelectTrigger className="md:w-1/4" disabled={!filter.field}>
                  <SelectValue placeholder={t('selectOperator')} />
                </SelectTrigger>
                <SelectContent>
                  {operators.map(op => (
                    <SelectItem key={op.value} value={op.value} className="cursor-pointer">
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value input(s) */}
              {renderValueInput(filter)}
            </div>

            {/* Remove button */}
            {filters.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFilter(filter.id)}
              >
                <LR.CircleMinus className="!size-6 text-muted-foreground" />
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default Filters