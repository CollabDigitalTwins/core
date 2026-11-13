"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button, Input, Checkbox, Badge } from '../../../components/ui/'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../../components/ui/DropdownMenu'
import { useBuildings } from '../../../hooks/buildings/buildings'
import { useInfrastructures } from '../../../hooks/infrastructures/infrastructures'
import { useSites } from '../../../hooks/sites/sites'
import { usePermissions } from '../../../store'
import { buildingDisplayName } from '../../../utils/buildingDisplayName'

import FiltersDialog from './advancedFilter/FiltersDialog'
import FilterFiles from './details/FilterFiles'
import { getFilterFieldNames } from './utils/filterFieldNames'
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
  collapsed?: boolean
}

interface FilterOption {
  value: string
  label: string
  checked: boolean
}

type SortState = false | 'asc' | 'desc'

const FilterButtons = ({ currentViewer, filters, activeFilters, filterFields, data, setFilters, setActiveFilters, collapsed }: FilterButtonsProps) => {
  const t = useTranslations('FilterButtons')

  const { ability } = usePermissions()

  const { sites } = useSites()
  const { buildings } = useBuildings()
  const { infrastructures } = useInfrastructures()

  const [municipalityOptions, setMunicipalityOptions] = React.useState<FilterOption[]>([])
  const [countrySubdivisionOptions, setCountrySubdivisionOptions] = React.useState<FilterOption[]>([])
  const [buildingOptions, setBuildingOptions] = React.useState<FilterOption[]>([])
  const [siteOptions, setSiteOptions] = React.useState<FilterOption[]>([])
  const [infrastructureOptions, setInfrastructureOptions] = React.useState<FilterOption[]>([])

  const [municipalitySearch, setMunicipalitySearch] = React.useState('')
  const [countrySubdivisionSearch, setCountrySubdivisionSearch] = React.useState('')
  const [buildingSearch, setBuildingSearch] = React.useState('')
  const [siteSearch, setSiteSearch] = React.useState('')
  const [infrastructureSearch, setInfrastructureSearch] = React.useState('')

  const [municipalitySort, setMunicipalitySort] = React.useState<SortState>(false)
  const [countrySubdivisionSort, setCountrySubdivisionSort] = React.useState<SortState>(false)
  const [buildingSort, setBuildingSort] = React.useState<SortState>(false)
  const [siteSort, setSiteSort] = React.useState<SortState>(false)
  const [infrastructureSort, setInfrastructureSort] = React.useState<SortState>(false)

  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false)

  const [municipalityDropdownOpen, setMunicipalityDropdownOpen] = React.useState(false)
  const [countrySubdivisionDropdownOpen, setCountrySubdivisionDropdownOpen] = React.useState(false)
  const [buildingDropdownOpen, setBuildingDropdownOpen] = React.useState(false)
  const [siteDropdownOpen, setSiteDropdownOpen] = React.useState(false)
  const [infrastructureDropdownOpen, setInfrastructureDropdownOpen] = React.useState(false)

  const fieldNames = getFilterFieldNames(currentViewer)

  const selectedValuesOf = (field: string | undefined): string[] => {
    const filter = activeFilters.find(f => f.field === field)
    return Array.isArray(filter?.value) ? filter.value : []
  }

  const selectedFileTypes = selectedValuesOf('fileType')

  const getBuildingName = (buildingId: number) =>
    buildingDisplayName(buildings?.find(b => b.id === buildingId)) ?? String(buildingId)

  const getSiteName = (siteId: number) => {
    const site = sites?.find(s => s.id === siteId)
    return site?.siteName || String(siteId)
  }

  const getInfrastructureName = (infrastructureId: number) => {
    const infrastructure = infrastructures?.find(i => i.id === infrastructureId)
    return infrastructure?.infrastructureName || String(infrastructureId)
  }

  const generateFilterOptions = () => {

    if (!data || data.length === 0) {
      return
    }

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

  const previousViewer = React.useRef(currentViewer)

  React.useEffect(() => {
    if (previousViewer.current === currentViewer) return
    previousViewer.current = currentViewer

    setMunicipalityOptions([])
    setCountrySubdivisionOptions([])
    setBuildingOptions([])
    setSiteOptions([])
    setInfrastructureOptions([])
    setActiveFilters([])

    setMunicipalitySearch('')
    setCountrySubdivisionSearch('')
    setBuildingSearch('')
    setSiteSearch('')
    setInfrastructureSearch('')

    setMunicipalityDropdownOpen(false)
    setCountrySubdivisionDropdownOpen(false)
    setBuildingDropdownOpen(false)
    setSiteDropdownOpen(false)
    setInfrastructureDropdownOpen(false)

    setMunicipalitySort(false)
    setCountrySubdivisionSort(false)
    setBuildingSort(false)
    setSiteSort(false)
    setInfrastructureSort(false)
  }, [currentViewer])

  React.useEffect(() => {
    generateFilterOptions()
  }, [data])

  React.useEffect(() => {
    const checkSelected = (field: string | undefined) => (prev: FilterOption[]) => {
      const selected = selectedValuesOf(field)
      return prev.map(opt => ({ ...opt, checked: selected.includes(opt.value) }))
    }

    setMunicipalityOptions(checkSelected(fieldNames.municipality))
    setCountrySubdivisionOptions(checkSelected(fieldNames.countrySubdivision))
    setBuildingOptions(checkSelected(fieldNames.building))
    setSiteOptions(checkSelected(fieldNames.site))
    setInfrastructureOptions(checkSelected(fieldNames.infrastructure))
  }, [activeFilters, currentViewer])

  const updateFilters = (filterType: string, options: FilterOption[]) => {
    applySelection(filterType, options.filter(opt => opt.checked).map(opt => opt.value))
  }

  const applySelection = (filterType: string, selectedValues: string[]) => {
    if (selectedValues.length === 0) {
      setActiveFilters(activeFilters.filter(filter => filter.field !== filterType))
      return
    }

    const existingFilterIndex = activeFilters.findIndex(filter => filter.field === filterType)

    if (existingFilterIndex === -1) {
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
      const updatedFilters = [...activeFilters]
      updatedFilters[existingFilterIndex] = {
        ...updatedFilters[existingFilterIndex],
        value: selectedValues,
        operator: 'inList',
      }
      setActiveFilters(updatedFilters)
    }
  }

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

  const handleApplyFilters = () => {
    setActiveFilters(filters)
    setFilterDialogOpen(false)
  }

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
    let filteredOptions = options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    if (sortState === 'asc') {
      filteredOptions = [...filteredOptions].sort((a, b) => a.label.localeCompare(b.label))
    } else if (sortState === 'desc') {
      filteredOptions = [...filteredOptions].sort((a, b) => b.label.localeCompare(a.label))
    }

    const selectedCount = options.filter(opt => opt.checked).length
    const buttonText = title
    const hasOptions = options.length > 0

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
          <Button variant="outline" className="border-dashed">
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

  const fileTypes = React.useMemo(() => {
    if (!data || data.length === 0) return []
    const types = data.map(file => file.fileType).filter(Boolean).filter(type => type !== 'Unknown' && type !== '')
    return [...new Set(types)]
  }, [data])

  const filtersDialog = (
    <FiltersDialog
      filters={filters}
      isBuilding={currentViewer !== 'sites'}
      filterFields={filterFields}
      activeFilters={activeFilters}
      setFilters={setFilters}
      onApplyFilters={handleApplyFilters}
      setActiveFilters={setActiveFilters}
    />
  )

  switch (currentViewer) {
    case 'buildings': {
      return (
        <>
          {municipalityButton}
          {countrySubdivisionButton}
          {siteButton}
          {filtersDialog}
        </>
      )
    }
    case 'sites': {
      return (
        <>
          {municipalityButton}
          {countrySubdivisionButton}
          {filtersDialog}
        </>
      )
    }
    case 'infrastructure': {
      return (
        <>
          {infrastructureButton}
          {municipalityButton}
          {countrySubdivisionButton}
          {siteButton}
          {collapsed && filtersDialog}
        </>
      )
    }
    case 'files': {
      return (
        <>
          {siteButton}
          {buildingButton}
          <FilterFiles
            availableTypes={fileTypes}
            selectedTypes={selectedFileTypes}
            onTypesChange={types => applySelection('fileType', types)}
          />
          {collapsed && filtersDialog}
        </>
      )
    }
  }
  return null
}

export default FilterButtons