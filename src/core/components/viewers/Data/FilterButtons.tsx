"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button, Input, Checkbox, Badge } from '../../../components/ui/'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/DropdownMenu'
import { useBuildings } from '../../../hooks/buildings/buildings'
import { useInfrastructures } from '../../../hooks/infrastructures/infrastructures'
import { useSites } from '../../../hooks/sites/sites'
import { usePermissions } from '../../../store'

// Shadcn Components

// Icons

// Custom Components
import FiltersDialog from './advancedFilter/FiltersDialog'
import FilterFiles from './details/FilterFiles'
import { getUniqueColumnValues } from './utils/filterHelper'

import type { filterFieldOptions } from './utils/Columns'

interface FilterButtonsProps {
  currentViewer: string
  filters: any[]
  activeFilters: any[]
  filterFields: filterFieldOptions[]
  data: any[]
  setFilters: React.Dispatch<React.SetStateAction<any[]>>
  setActiveFilters: React.Dispatch<React.SetStateAction<any[]>>
}

interface FilterOption {
  value: string
  label: string
  checked: boolean
}

type SortState = false | 'asc' | 'desc'

const FilterButtons = ({ currentViewer, filters, activeFilters, filterFields, data, setFilters, setActiveFilters }: FilterButtonsProps) => {
  // Translations
  const t = useTranslations('FilterButtons')

  // Permissions
  const { ability } = usePermissions()

  const { sites } = useSites()
  const { buildings } = useBuildings()
  const { infrastructures } = useInfrastructures()

  // Filter options state
  const [municipalityOptions, setMunicipalityOptions] = React.useState<FilterOption[]>([])
  const [countrySubdivisionOptions, setCountrySubdivisionOptions] = React.useState<FilterOption[]>([])
  const [buildingOptions, setBuildingOptions] = React.useState<FilterOption[]>([])
  const [siteOptions, setSiteOptions] = React.useState<FilterOption[]>([])
  const [infrastructureOptions, setInfrastructureOptions] = React.useState<FilterOption[]>([])

  // Search terms for each filter
  const [municipalitySearch, setMunicipalitySearch] = React.useState('')
  const [countrySubdivisionSearch, setCountrySubdivisionSearch] = React.useState('')
  const [buildingSearch, setBuildingSearch] = React.useState('')
  const [siteSearch, setSiteSearch] = React.useState('')
  const [infrastructureSearch, setInfrastructureSearch] = React.useState('')

  // Sort state for each filter: false (unsorted), 'asc', 'desc'
  const [municipalitySort, setMunicipalitySort] = React.useState<SortState>(false)
  const [countrySubdivisionSort, setCountrySubdivisionSort] = React.useState<SortState>(false)
  const [buildingSort, setBuildingSort] = React.useState<SortState>(false)
  const [siteSort, setSiteSort] = React.useState<SortState>(false)
  const [infrastructureSort, setInfrastructureSort] = React.useState<SortState>(false)

  // Dialog open state
  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false)

  // Dropdown open states
  const [municipalityDropdownOpen, setMunicipalityDropdownOpen] = React.useState(false)
  const [countrySubdivisionDropdownOpen, setCountrySubdivisionDropdownOpen] = React.useState(false)
  const [buildingDropdownOpen, setBuildingDropdownOpen] = React.useState(false)
  const [siteDropdownOpen, setSiteDropdownOpen] = React.useState(false)
  const [infrastructureDropdownOpen, setInfrastructureDropdownOpen] = React.useState(false)

  // File type filter state
  const [selectedFileTypes, setSelectedFileTypes] = React.useState<string[]>([])

  // Get the correct field names based on current viewer
  const getFieldNames = () => {
    switch (currentViewer) {
      case 'buildings': {
        return {
          municipality: 'buildingMunicipality',
          countrySubdivision: 'buildingCountrySubdivision',
          site: 'buildingParentSiteId',
        }
      }
      case 'sites': {
        return {
          municipality: 'siteMunicipality',
          countrySubdivision: 'siteCountrySubdivision',
          site: null, // Sites don't filter by site
        }
      }
      case 'infrastructure': {
        return {
          municipality: 'infrastructureMunicipality',
          countrySubdivision: 'infrastructureCountrySubdivision',
          site: 'infrastructureParentSiteId',
        }
      }
      case 'files': {
        return {
          municipality: null,
          countrySubdivision: null,
          building: 'building',
          site: 'site',
          infrastructure: 'infrastructure',
        }
      }
    // No default
    }
    return {
      municipality: null,
      countrySubdivision: null,
      building: null,
      site: null,
      infrastructure: null,
    }
  }

  const getBuildingName = (buildingId: number) => {
    const building = buildings?.find(b => b.id === buildingId)
    return building?.buildingName || building?.buildingAddress || String(buildingId)
  }

  const getSiteName = (siteId: number) => {
    const site = sites?.find(s => s.id === siteId)
    return site?.siteName || String(siteId)
  }

  const getInfrastructureName = (infrastructureId: number) => {
    const infrastructure = infrastructures?.find(i => i.id === infrastructureId)
    return infrastructure?.infrastructureName || String(infrastructureId)
  }

  // Generate filter options with unique values from data
  const generateFilterOptions = () => {
    const fieldNames = getFieldNames()

    if (!data || data.length === 0) {
      return
    }

    // Municipality options
    if (fieldNames.municipality) {
      const uniqueValues = getUniqueColumnValues(data, fieldNames.municipality)
      const validValues = uniqueValues.filter(value => value !== null && value !== undefined && value !== '')

      const options = validValues.map(value => ({
        value: String(value),
        label: String(value),
        checked: false,
      }))

      setMunicipalityOptions((prev) => {
        const newOptions = options.map((option) => {
          const existingOption = prev.find(p => p.value === option.value)
          return existingOption ? { ...option, checked: existingOption.checked } : option
        })
        return newOptions
      })
    }

    // Province options
    if (fieldNames.countrySubdivision) {
      const uniqueValues = getUniqueColumnValues(data, fieldNames.countrySubdivision)
      const validValues = uniqueValues.filter(value => value !== null && value !== undefined && value !== '')

      const options = validValues.map(value => ({
        value: String(value),
        label: String(value),
        checked: false,
      }))

      setCountrySubdivisionOptions((prev) => {
        const newOptions = options.map((option) => {
          const existingOption = prev.find(p => p.value === option.value)
          return existingOption ? { ...option, checked: existingOption.checked } : option
        })
        return newOptions
      })
    }

    // Building options
    if (fieldNames.building) {
      const uniqueValues = getUniqueColumnValues(data, fieldNames.building)
      const validValues = uniqueValues.filter(value => value !== null && value !== undefined && value !== '')

      const options = validValues.map(value => ({
        value: String(value),
        label: getBuildingName(Number(value)),
        checked: false,
      }))

      setBuildingOptions((prev) => {
        const newOptions = options.map((option) => {
          const existingOption = prev.find(p => p.value === option.value)
          return existingOption ? { ...option, checked: existingOption.checked } : option
        })
        return newOptions
      })
    }

    // Site options
    if (fieldNames.site) {
      const uniqueValues = getUniqueColumnValues(data, fieldNames.site)
      const validValues = uniqueValues.filter(value => value !== null && value !== undefined && value !== '')

      const options = validValues.map(value => ({
        value: String(value),
        label: getSiteName(Number(value)),
        checked: false,
      }))

      setSiteOptions((prev) => {
        const newOptions = options.map((option) => {
          const existingOption = prev.find(p => p.value === option.value)
          return existingOption ? { ...option, checked: existingOption.checked } : option
        })
        return newOptions
      })
    }

    // Infrastructure options
    if (fieldNames.infrastructure) {
      const uniqueValues = getUniqueColumnValues(data, fieldNames.infrastructure)
      const validValues = uniqueValues.filter(value => value !== null && value !== undefined && value !== '')

      const options = validValues.map(value => ({
        value: String(value),
        label: getInfrastructureName(Number(value)),
        checked: false,
      }))

      setInfrastructureOptions((prev) => {
        const newOptions = options.map((option) => {
          const existingOption = prev.find(p => p.value === option.value)
          return existingOption ? { ...option, checked: existingOption.checked } : option
        })
        return newOptions
      })
    }

  }

  // Reset filters when viewer changes
  React.useEffect(() => {
    // Clear all filter states when switching viewers
    setMunicipalityOptions([])
    setCountrySubdivisionOptions([])
    setBuildingOptions([])
    setSiteOptions([])
    setInfrastructureOptions([])
    setActiveFilters([])

    // Clear search terms
    setMunicipalitySearch('')
    setCountrySubdivisionSearch('')
    setBuildingSearch('')
    setSiteSearch('')
    setInfrastructureSearch('')

    // Close any open dropdowns
    setMunicipalityDropdownOpen(false)
    setCountrySubdivisionDropdownOpen(false)
    setBuildingDropdownOpen(false)
    setSiteDropdownOpen(false)
    setInfrastructureDropdownOpen(false)

    // Reset sort state
    setMunicipalitySort(false)
    setCountrySubdivisionSort(false)
    setBuildingSort(false)
    setSiteSort(false)
    setInfrastructureSort(false)

    // Reset file type filter
    setSelectedFileTypes([])
  }, [currentViewer])

  // Generate filter options when data changes
  React.useEffect(() => {
    generateFilterOptions()
  }, [data])

  // Update checked state based on active filters
  React.useEffect(() => {
    if (activeFilters && activeFilters.length > 0) {
      const fieldNames = getFieldNames()

      // Find municipality filter
      if (fieldNames.municipality) {
        const municipalityFilter = activeFilters.find(filter => filter.field === fieldNames.municipality)
        if (municipalityFilter && municipalityFilter.value && Array.isArray(municipalityFilter.value)) {
          setMunicipalityOptions(prev =>
            prev.map(opt => ({
              ...opt,
              checked: municipalityFilter.value.includes(opt.value),
            })),
          )
        }
      }

      // Find countrySubdivision filter
      if (fieldNames.countrySubdivision) {
        const provinceFilter = activeFilters.find(filter => filter.field === fieldNames.countrySubdivision)
        if (provinceFilter && provinceFilter.value && Array.isArray(provinceFilter.value)) {
          setCountrySubdivisionOptions(prev =>
            prev.map(opt => ({
              ...opt,
              checked: provinceFilter.value.includes(opt.value),
            })),
          )
        }
      }

      // Find building filter
      if (fieldNames.building) {
        const buildingFilter = activeFilters.find(filter => filter.field === fieldNames.building)
        if (buildingFilter && buildingFilter.value && Array.isArray(buildingFilter.value)) {
          setBuildingOptions(prev =>
            prev.map(opt => ({
              ...opt,
              checked: buildingFilter.value.includes(opt.value),
            })),
          )
        }
      }

      // Find site filter
      if (fieldNames.site) {
        const siteFilter = activeFilters.find(filter => filter.field === fieldNames.site)
        if (siteFilter && siteFilter.value && Array.isArray(siteFilter.value)) {
          setSiteOptions(prev =>
            prev.map(opt => ({
              ...opt,
              checked: siteFilter.value.includes(opt.value),
            })),
          )
        }
      }

        // Find infrastructure filter
        if (fieldNames.infrastructure) {
          const infrastructureFilter = activeFilters.find(filter => filter.field === fieldNames.infrastructure)
          if (infrastructureFilter && infrastructureFilter.value && Array.isArray(infrastructureFilter.value)) {
            setInfrastructureOptions(prev =>
              prev.map(opt => ({
                ...opt,
                checked: infrastructureFilter.value.includes(opt.value),
              })),
            )
          }
    }
  }
  }, [activeFilters, currentViewer])

  // Update activeFilters when selectedFileTypes changes
  React.useEffect(() => {
    if (currentViewer !== 'files') return

    if (selectedFileTypes.length === 0) {
      // Remove file type filter if no types are selected
      setActiveFilters(prev => prev.filter(filter => filter.field !== 'fileType'))
    } else {
      // Check if filter already exists
      const existingFilterIndex = activeFilters.findIndex(filter => filter.field === 'fileType')

      if (existingFilterIndex === -1) {
        // Add new filter
        setActiveFilters(prev => [
          ...prev,
          {
            id: Date.now(),
            field: 'fileType',
            fieldType: 'string',
            operator: 'inList',
            value: selectedFileTypes,
            secondValue: null,
          },
        ])
      } else {
        // Update existing filter
        setActiveFilters(prev => {
          const updatedFilters = [...prev]
          updatedFilters[existingFilterIndex] = {
            ...updatedFilters[existingFilterIndex],
            value: selectedFileTypes,
            operator: 'inList',
          }
          return updatedFilters
        })
      }
    }
  }, [selectedFileTypes, currentViewer])

  // Update active filters when options are selected
  const updateFilters = (filterType: string, options: FilterOption[]) => {
    const selectedValues = options.filter(opt => opt.checked).map(opt => opt.value)

    if (selectedValues.length === 0) {
      // Remove this filter if no values are selected
      setActiveFilters(activeFilters.filter(filter => filter.field !== filterType))
      return
    }

    // Check if filter already exists
    const existingFilterIndex = activeFilters.findIndex(filter => filter.field === filterType)

    if (existingFilterIndex === -1) {
      // Add new filter
      setActiveFilters([
        ...activeFilters,
        {
          id: Date.now(),
          field: filterType,
          fieldType: 'string',
          operator: 'inList',
          value: selectedValues,
          secondValue: null,
        },
      ])
    }
    else {
      // Update existing filter
      const updatedFilters = [...activeFilters]
      updatedFilters[existingFilterIndex] = {
        ...updatedFilters[existingFilterIndex],
        value: selectedValues,
        operator: 'inList',
      }
      setActiveFilters(updatedFilters)
    }
  }

  // Handle checkbox toggle
  const handleCheckboxChange = (
    option: FilterOption,
    options: FilterOption[],
    setOptions: React.Dispatch<React.SetStateAction<FilterOption[]>>,
    filterType: string,
  ) => {
    const updatedOptions = options.map(opt =>
      opt.value === option.value ? { ...opt, checked: !opt.checked } : opt,
    )

    setOptions(updatedOptions)
    updateFilters(filterType, updatedOptions)
  }

  // Handle apply filters
  const handleApplyFilters = () => {
    setActiveFilters(filters)
    setFilterDialogOpen(false)
  }

  // Filter dropdown creation function
  const createFilterDropdown = (
    title: string,
    options: FilterOption[],
    searchTerm: string,
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>,
    isOpen: boolean,
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>,
    fieldId: string,
    sortState: SortState,
    setSortState: React.Dispatch<React.SetStateAction<SortState>>,
  ) => {
    // Filter options based on search term
    let filteredOptions = options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    // Sort options based on sortState
    if (sortState === 'asc') {
      filteredOptions = [...filteredOptions].sort((a, b) => a.label.localeCompare(b.label))
    } else if (sortState === 'desc') {
      filteredOptions = [...filteredOptions].sort((a, b) => b.label.localeCompare(a.label))
    }

    const selectedCount = options.filter(opt => opt.checked).length
    const buttonText = title
    const hasOptions = options.length > 0

    // Cycle sort state: false -> 'asc' -> 'desc' -> false
    const handleSortClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      setSortState(prev =>
        prev === false ? 'asc' : prev === 'asc' ? 'desc' : false
      )
    }

    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger
          asChild
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
        >
          <Button variant="outline" className="border-dashed max-sm:hidden">
            {selectedCount > 0
              ? <Badge>{selectedCount}</Badge>
              : <LR.Filter className="" />}
            {buttonText}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[300px] p-0" align="start">
          <div className="flex flex-col gap-3">
            <div className="flex flex-row gap-2 items-center">
              <LR.Search size={16} className=" text-muted-foreground absolute left-3" />
              <Input
                placeholder={`${t('searchPlaceholder')} ${title}s`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onClick={e => e.stopPropagation()}
                className="rounded-bl-none pl-9 focus-visible:ring-offset-0 focus-visible:ring-0"
              />
              {/* Sort button */}
              <Button
              variant='ghost'
                className="hover:bg-transparent p-0 mr-2"
                onClick={handleSortClick}
              >
                {sortState === false && <LR.ArrowUpDown />}
                {sortState === 'desc' && <LR.ArrowDown className="text-black" />}
                {sortState === 'asc' && <LR.ArrowUp className="text-black" />}
              </Button>
            </div>

            <div className="max-h-[200px] overflow-y-auto space-y-2 px-3 pb-2">
              {hasOptions
                ? (filteredOptions.length > 0
                    ? (filteredOptions.map(option => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${fieldId}-${option.value}`}
                            checked={option.checked}
                            onCheckedChange={() => handleCheckboxChange(
                              option,
                              options,
                              fieldId.includes('Municipality') || fieldId === 'siteMunicipality' || fieldId === 'buildingMunicipality'
                                ? setMunicipalityOptions
                                : (fieldId.includes('CountrySubdivision') || fieldId === 'siteCountrySubdivision' || fieldId === 'buildingCountrySubdivision'
                                    ? setCountrySubdivisionOptions
                                    : (fieldId === 'building'
                                        ? setBuildingOptions
                                        : setSiteOptions)),
                              fieldId,
                            )}
                          />
                          <label
                            htmlFor={`${fieldId}-${option.value}`}
                            className="text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {option.label}
                          </label>
                        </div>
                        ))
                      )
                    : (
                        <p className="text-sm text-muted-foreground">
                          {t('no')}
                          {title.toLowerCase()}
                          {t('noMatch')}
                          .
                        </p>
                      )
                  )
                : (
                    <p className="text-sm text-muted-foreground">
                      {t('no')}
                      {" "}
                      {title.toLowerCase()}
                      {t('noAvail')}
                    </p>
                  )}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Get current field names for this viewer
  const fieldNames = getFieldNames()

  // Create filter buttons conditionally based on available fields
  const municipalityButton = fieldNames.municipality
    ? createFilterDropdown(
        `${t('municipality')}`,
        municipalityOptions,
        municipalitySearch,
        setMunicipalitySearch,
        municipalityDropdownOpen,
        setMunicipalityDropdownOpen,
        fieldNames.municipality,
        municipalitySort,
        setMunicipalitySort,
      )
    : null

  const countrySubdivisionButton = fieldNames.countrySubdivision
    ? createFilterDropdown(
        'Subdivision',
        countrySubdivisionOptions,
        countrySubdivisionSearch,
        setCountrySubdivisionSearch,
        countrySubdivisionDropdownOpen,
        setCountrySubdivisionDropdownOpen,
        fieldNames.countrySubdivision,
        countrySubdivisionSort,
        setCountrySubdivisionSort,
      )
    : null

  const buildingButton = fieldNames.building
    ? createFilterDropdown(
        'Building',
        buildingOptions,
        buildingSearch,
        setBuildingSearch,
        buildingDropdownOpen,
        setBuildingDropdownOpen,
        fieldNames.building,
        buildingSort,
        setBuildingSort,
      )
    : null

  const siteButton = fieldNames.site
    ? createFilterDropdown(
        'Site',
        siteOptions,
        siteSearch,
        setSiteSearch,
        siteDropdownOpen,
        setSiteDropdownOpen,
        fieldNames.site,
        siteSort,
        setSiteSort,
      )
    : null

  const infrastructureButton = fieldNames.infrastructure
    ? createFilterDropdown(
        'Infrastructure',
        infrastructureOptions,
        infrastructureSearch,
        setInfrastructureSearch,
        infrastructureDropdownOpen,
        setInfrastructureDropdownOpen,
        fieldNames.infrastructure,
        infrastructureSort,
        setInfrastructureSort,
      )
    : null

  // Get unique file types for the filter dropdown
  const fileTypes = React.useMemo(() => {
    if (!data || data.length === 0) return []
    const types = data.map(file => file.fileType).filter(Boolean).filter(type => type !== 'Unknown' && type !== '')
    return [...new Set(types)]
  }, [data])

    if (currentViewer === 'buildings') {
    return (
      <>
        {/* Mobile View */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="border-dashed sm:hidden"
              onClick={e => e.stopPropagation()}
            >
              <LR.ListFilter />
              <span className="sr-only">{t('srFilters')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {municipalityButton && (
              <DropdownMenuItem
                onSelect={e => e.preventDefault()}
              >
                {municipalityButton}
              </DropdownMenuItem>
            )}
            {countrySubdivisionButton && (
              <DropdownMenuItem
                onSelect={e => e.preventDefault()}
              >
                {countrySubdivisionButton}
              </DropdownMenuItem>
            )}
            {siteButton && (
              <DropdownMenuItem
                onSelect={e => e.preventDefault()}
              >
                {siteButton}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={e => e.preventDefault()} // Prevent conflict with row click, which closes both menus
            >
              <FiltersDialog
                filters={filters}
                filterFields={filterFields}
                activeFilters={activeFilters}
                setFilters={setFilters}
                onApplyFilters={handleApplyFilters}
                setActiveFilters={setActiveFilters}
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {municipalityButton}
        {countrySubdivisionButton}
        {siteButton}
        {/* Advanced Filters Dialog */}
        <div className="max-sm:hidden">
          <FiltersDialog
            filters={filters}
            filterFields={filterFields}
            activeFilters={activeFilters}
            setFilters={setFilters}
            onApplyFilters={handleApplyFilters}
            setActiveFilters={setActiveFilters}
          />
        </div>
      </>
    )
  }

  if (currentViewer === 'sites') {
    return (
      <>
        {/* Mobile View */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="border-dashed sm:hidden"
              onClick={e => e.stopPropagation()}
            >
              <LR.ListFilter />
              <span className="sr-only">{t('srFilters')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {municipalityButton && (
              <DropdownMenuItem
                onSelect={e => e.preventDefault()}
              >
                {municipalityButton}
              </DropdownMenuItem>
            )}
            {countrySubdivisionButton && (
              <DropdownMenuItem
                onSelect={e => e.preventDefault()}
              >
                {countrySubdivisionButton}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={e => e.preventDefault()} // Prevent conflict with row click, which closes both menus
            >
              <FiltersDialog
                filters={filters}
                filterFields={filterFields}
                activeFilters={activeFilters}
                setFilters={setFilters}
                onApplyFilters={handleApplyFilters}
                setActiveFilters={setActiveFilters}
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* desktop view */}
        {municipalityButton}
        {countrySubdivisionButton}
        {/* Advanced Filters Dialog */}
        <div className="max-sm:hidden">
          <FiltersDialog
            filters={filters}
            isBuilding={false}
            filterFields={filterFields}
            activeFilters={activeFilters}
            setFilters={setFilters}
            onApplyFilters={handleApplyFilters}
            setActiveFilters={setActiveFilters}
          />
        </div>
      </>
    )
  }

  if (currentViewer === 'infrastructure') {
    return (
      <>
        {/* Mobile View */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="border-dashed sm:hidden"
              onClick={e => e.stopPropagation()}
            >
              <LR.ListFilter />
              <span className="sr-only">{t('srFilters')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {infrastructureButton && (
              <DropdownMenuItem
                onSelect={e => e.preventDefault()}
              >
                {infrastructureButton}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={e => e.preventDefault()} // Prevent conflict with row click, which closes both menus
            >
              <FiltersDialog
                filters={filters}
                filterFields={filterFields}
                activeFilters={activeFilters}
                setFilters={setFilters}
                onApplyFilters={handleApplyFilters}
                setActiveFilters={setActiveFilters}
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {infrastructureButton}
        {municipalityButton}
        {countrySubdivisionButton}
        {siteButton}
        {/* Advanced Filters Dialog */}
        {/* <div className="max-sm:hidden">
          <FiltersDialog
            filters={filters}
            filterFields={filterFields}
            activeFilters={activeFilters}
            setFilters={setFilters}
            onApplyFilters={handleApplyFilters}
            setActiveFilters={setActiveFilters}
          />
        </div> */}
      </>
    )
  }

  if (currentViewer === 'files') {
    return (
      <>
        {/* Mobile View */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="border-dashed sm:hidden"
              onClick={e => e.stopPropagation()}
            >
              <LR.ListFilter />
              <span className="sr-only">{t('srFilters')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {siteButton && (
              <DropdownMenuItem
                onSelect={e => e.preventDefault()}
              >
                {siteButton}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={e => e.preventDefault()}
            >
              {buildingButton}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={e => e.preventDefault()}
            >
              <FilterFiles
                availableTypes={fileTypes}
                selectedTypes={selectedFileTypes}
                onTypesChange={setSelectedFileTypes}
              />
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={e => e.preventDefault()} // Prevent conflict with row click, which closes both menus
            >
              <FiltersDialog
                filters={filters}
                filterFields={filterFields}
                activeFilters={activeFilters}
                setFilters={setFilters}
                onApplyFilters={handleApplyFilters}
                setActiveFilters={setActiveFilters}
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {siteButton}
        {buildingButton}
        <FilterFiles
          availableTypes={fileTypes}
          selectedTypes={selectedFileTypes}
          onTypesChange={setSelectedFileTypes}
        />
        {/* Advanced Filters Dialog */}
        {/* <div className="max-sm:hidden">
          <FiltersDialog
            filters={filters}
            filterFields={filterFields}
            activeFilters={activeFilters}
            setFilters={setFilters}
            onApplyFilters={handleApplyFilters}
            setActiveFilters={setActiveFilters}
          />
        </div> */}
      </>
    )
  }
}

export default FilterButtons