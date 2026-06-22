"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from "react";
import type { Building } from '../../../../types/dbTypes'
import { mutate } from 'swr'
import { useSession } from 'next-auth/react'
import { handleApiError } from '../../../../utils/errorHandler'
import { usePermissions } from '../../../../store'

// Custom hooks
import { useBuilding, useCreateBuilding } from '../../../../hooks/buildings/buildings'
import { useFilesByBuildingId } from '../../../../hooks/files/files'

// Utilities
import { useBuildingHeaders } from '../utils/Headers'

// Shadcn Components
import { DescriptionListItem } from '../../../ui/DescriptionList'
import { Separator } from '../../../ui/Separator'
import { toast } from 'sonner'

// Custom Components
import AttachedFiles from '../details/AttachedFiles'
import TabSidebar from '../details/TabSidebar'
import FieldValue from '../details/FieldValue'
import FieldRenderer from './FieldRenderer'
import CheckboxGroup from '../details/CheckboxGroup'
import UnitsGrid from '../details/UnitsGrid'
import EnergySourcesGrid from '../details/EnergySourcesGrid'
import { useUser } from '../../../../hooks/users/users';

interface BuildingDetailsProps {
  selectedItem?: Building
  setSelectedItem?: (building: Building) => void
  editing?: boolean
  setEditing?: (editing: boolean) => void
  setActiveChanges?: (editing: boolean) => void
  buildings?: Building[]
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

// Create a ref type for the component
export type BuildingDetailsRef = {
  saveChanges: () => Promise<void>
}

const BuildingDetails = React.forwardRef<BuildingDetailsRef, BuildingDetailsProps>(({
  selectedItem,
  setSelectedItem,
  editing = false,
  setEditing,
  setActiveChanges,
  buildings,
  activeTab,
  setActiveTab = () => {},
}, ref) => {
  // Session and user data
  const { data: session, status } = useSession()
  const { user, isLoading, isError, updateUser } = useUser(session?.user?.id || '')

  // Permissions
  const { ability } = usePermissions()

  const buildingHeaders = useBuildingHeaders()

  // Generate tab keys from buildingHeaders
  const tabOptions = buildingHeaders.map(section => ({
    key: section.title.toLowerCase().replaceAll(/\s/g, '-'),
    label: section.title,
  }))

  // const [activeTab, setActiveTab] = React.useState(tabOptions[0].key);
  const [editingValues, setEditingValues] = React.useState<Partial<Building>>({})
  const [isUpdating, setIsUpdating] = React.useState(false)

  // Find current tab section
  const currentTabSection = buildingHeaders.find(
    section => section.title.toLowerCase().replaceAll(/\s/g, '-') === activeTab,
  )

  // Use the updated hook only if we have a building ID
  const { updateBuilding, building: latestBuilding, isMutating, updateError } = useBuilding(selectedItem?.id || 0)
  const { createBuilding } = useCreateBuilding()

  // Fetch attached files for the building
  const { files: attachedFiles, isLoading: filesLoading } = useFilesByBuildingId(selectedItem?.id || 0)

  // Calculate total file count
  const attachedFilesCount = Array.isArray(attachedFiles) ? attachedFiles.length : 0

  // Create a map of tag to relation property name
  const tagToRelationMap: Record<string, string> = {
    buildingCodeCompliance: 'buildingBuildingCodeCompliance',
    environmentalCompliance: 'buildingEnvironmentalCompliance',
    occupancyCertificate: 'buildingOccupancyCertificate',
    permitsIssued: 'buildingPermitsIssued',
    systemAssessments: 'buildingSystemAssessments',
    zoningCompliance: 'buildingZoningCompliance',
    certificationsFile: 'buildingCertificationsFile',
    energyCodeCompliance: 'buildingEnergyCodeCompliance',
    fireSafety: 'buildingFireSafety',
    maintenanceRecords: 'buildingMaintenanceRecords',
    proximityToServices: 'buildingProximityToServices',
    regionalEnergyTrends: 'buildingRegionalEnergyTrends',
    EnergyAssessmentReports: 'buildingEnergyAssessmentReports',
    AirQualityReports: 'buildingAirQualityReports',
    WaterQualityReports: 'buildingWaterQualityReports',
    DSRs: 'DSRs',
    BCAs: 'buildingBCAs',
    ContractorReports: 'buildingContractorReports',
    EngineeringAssessments: 'buildingEngineeringAssessments',
  }

  React.useEffect(() => {
    handleApiError(isError)
    handleApiError(updateError)
  }, [isError, updateError])

  React.useEffect(() => {
    if (latestBuilding && selectedItem?.id === latestBuilding.id && setSelectedItem) {
      // Only update if we're not currently editing to avoid overwriting user input
      if (!editing || Object.keys(editingValues).length === 0) {
        const mergedBuilding = { ...latestBuilding }
        
        // Preserve file relationships from selectedItem if they exist
        for (const relationProp of Object.values(tagToRelationMap)) {
          const existingFiles = selectedItem[relationProp as keyof Building]
          if (existingFiles && Array.isArray(existingFiles) && existingFiles.length > 0) {
            (mergedBuilding as any)[relationProp] = existingFiles
          }
        }

        setSelectedItem(mergedBuilding)
      }
    }
  }, [latestBuilding, editing, editingValues])

  // Update selectedItem with files organized by their relationships
  React.useEffect(() => {
    if (selectedItem && attachedFiles && Array.isArray(attachedFiles) && setSelectedItem) {
      const updatedBuilding = { ...selectedItem }
      let hasChanges = false

      // Initialize all file arrays as empty if they don't exist
      for (const relationProp of Object.values(tagToRelationMap)) {
        if (!updatedBuilding[relationProp as keyof Building]) {
          (updatedBuilding as any)[relationProp] = []
        }
      }

      // Group files by their tags and assign to correct relational properties
      for (const file of attachedFiles) {
        if (file.tag && tagToRelationMap[file.tag]) {
          const relationProp = tagToRelationMap[file.tag]
          const currentFiles = (updatedBuilding as any)[relationProp] || []

          // Only add if not already present (avoid duplicates)
          const fileExists = currentFiles.some((existingFile: any) =>
            existingFile.id === file.id,
          )

          if (!fileExists) {
            (updatedBuilding as any)[relationProp] = [...currentFiles, file]
            hasChanges = true
          }
        }
      }

      // Update the selected item only if there are actual changes
      if (hasChanges) {
        setSelectedItem(updatedBuilding)
      }
    }
  }, [attachedFiles, selectedItem?.id, setSelectedItem])

  // Handle input changes during editing
  const handleInputChange = (key: string, value: any) => {
    setEditingValues(prev => ({
      ...prev,
      [key]: value,
    }))
    setActiveChanges?.(true)

    if (setSelectedItem && selectedItem) {
      setSelectedItem({
        ...selectedItem,
        [key]: value
      })
    }

    // If this is a file field change, refresh the files data
    if (isFileField(key)) {
      // Refresh the files data to show newly uploaded files
      mutate(`/api/files/building/${selectedItem?.id}`)
    }
  }

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!selectedItem) return

    setIsUpdating(true)
    try {
      // Check if this is a new building creation (ID < 0)
      if (selectedItem.id < 0) {
        const buildingData = {
          ...selectedItem,
          ...editingValues,
        }

        delete buildingData.id

        const result = await createBuilding({
          buildingData,
          organizationId: user?.organizationId ? String(user.organizationId) : null,
        })

        // Update the selected building with the newly created one
        if (result && setSelectedItem) {
          setSelectedItem(result)
        }

        setEditingValues({})
        setEditing?.(false)
        setActiveChanges?.(false)
        toast.success('Building created successfully')
      }
      else {
        // This is an update to an existing building
        // Filter out file fields from building updates
        const buildingUpdates = Object.keys(editingValues).reduce((acc, key) => {
          if (!isFileField(key)) {
            acc[key] = editingValues[key]
          }
          return acc
        }, {} as Partial<Building>)

        // Check if we have file field changes
        const hasFileChanges = Object.keys(editingValues).some(key => isFileField(key))

        // Update building if there are non-file changes
        if (Object.keys(buildingUpdates).length > 0) {
          const result = await updateBuilding(buildingUpdates)
          
          // Immediately update local state with the result
          if (result && setSelectedItem && selectedItem) {
            setSelectedItem({ ...selectedItem, ...result })
          }
        }

        // Always refresh files data if there were file changes
        if (hasFileChanges) {
          await mutate(`/api/files/building/${selectedItem.id}`)
        }

        // Clear editing state
        setEditingValues({})
        setEditing?.(false)
        setActiveChanges?.(false)

        if (Object.keys(buildingUpdates).length > 0 && hasFileChanges) {
          toast.success('Building and files updated successfully')
        }
        else if (Object.keys(buildingUpdates).length > 0) {
          toast.success('Building updated successfully')
        }
        else if (hasFileChanges) {
          toast.success('Files updated successfully')
        }
      }
    }
    catch (error) {
      console.error('Save error:', error)
      if (error?.status !== 401) {
        toast.error(selectedItem.id < 0 ? 'Failed to create building' : 'Failed to update building')
      }
      
    }
    finally {
      setIsUpdating(false)
    }
  }


  // Auto-enable editing for new buildings
  React.useEffect(() => {
    // If this is a new building (negative ID), automatically start in edit mode
    if (selectedItem && selectedItem.id < 0 && setEditing) {
      setEditing(true)
      setActiveChanges?.(true)
    }
  }, [selectedItem?.id, setEditing, setActiveChanges])

  // Expose methods to parent component
  React.useImperativeHandle(ref, () => ({
    saveChanges: handleSaveChanges,
  }), [selectedItem, editingValues, updateBuilding, createBuilding, setEditing, setActiveChanges])

  // Get current value (edited value or original value)
  const getFieldValue = (property: string) => {
    return editingValues.hasOwnProperty(property)
      ? editingValues[property as keyof Building]
      : selectedItem?.[property as keyof Building]
  }

  // Check if field is a date field
  const isDateField = (property: string): boolean => {
    const dateFields = [
      'buildingAirQualityAssessmentDate',
      'buildingEstimatedStartDate', 'buildingEstimatedEndDate',
      'buildingStartDate', 'buildingCompletedDate', 'buildingPermitIssuedDate',
      'buildingAirQualityAssessmentDate', 'conditionRatingsDate',
    ]

    return dateFields.includes(property) || property?.toLowerCase().includes('date')
  }
  // Check if field is an enum field
  const isEnumField = (property: string): boolean => {
    const enumFields = [
      'buildingCountrySubdivision',
      'buildingAssessmentCondition',
      'buildingGeometryStyle',
      'buildingProjectPhase',
      'buildingProjectType',
      'buildingHeatingEnergySources',
      'buildingCoolingEnergySources',
      'buildingHotWaterSystemsEnergySources',
      'buildingOccupantType',
      'buildingType',
      'buildingAssessmentRatingCondition',
      'buildingManagementType',
      'buildingElectricityServiceSize',
      'buildingElectricityServiceLocation'
    ]

    return enumFields.includes(property)
  }

  // Get enum type for a property
  const getEnumType = (property: string): string | null => {
    const enumMappings: Record<string, string> = {
      buildingCountrySubdivision: 'CountrySubdivisionData',
      buildingAssessmentCondition: 'BuildingAssessmentConditions',
      buildingGeometryStyle: 'BuildingGeometryStyle',
      buildingProjectPhase: 'BuildingProjectPhase',
      buildingProjectType: 'BuildingProjectType',
      buildingHeatingCoolingEnergySources: 'BuildingEnergySource',
      buildingHotWaterSystemsEnergySources: 'BuildingEnergySource',
      buildingOccupantType: 'BuildingOccupantType',
      buildingType: 'BuildingTypeEnum',
      buildingAssessmentRatingCondition: 'BuildingAssessmentConditions',
      buildingManagementType: 'BuildingManagementType',
      buildingElectricityServiceSize: 'BuildingElectricityServiceSize',
      buildingElectricityServiceLocation: 'BuildingElectricityServiceLocation',
    }

    return enumMappings[property] || null
  }

  // Check if field should be full width
  const isFullWidthField = (property: string): boolean => {
    const fullWidthFields = [
      'buildingName', 'buildingAddress', 'buildingParentSiteId',
      'buildingNotes', 'buildingAdditionalInformation',
      'buildingUnitAdditionalInformation', 'buildingEnergyAdditionalInformation',
      'buildingEnvironmentalAdditionalInformation', 'buildingAssessmentDescription',
      'buildingMaintenanceRecords', 'buildingMaintenanceAdditionalInformation',
      'buildingPriorityRetrofits', 'buildingProjectDescription', 'previousUpdates',
      'buildingFundingAdditionalInformation', 'buildingStructuralVulnerabilities',
      'buildingClimateVulnerabilities', 'buildingSafetyConcerns', 'buildingFireSafety',
      'buildingSiteFireCertificate', 'buildingOccupancyCertificate',
      'buildingZoningCompliance', 'buildingEnvironmentalCompliance', 'buildingPermitsIssued',
      'buildingElectricityServiceUpgradeHistory'
    ]
    return fullWidthFields.includes(property)
  }

  // Check if field should use textarea input
  const isTextAreaField = (property: string): boolean => {
    const textAreaFields = [
      'buildingNotes', 'buildingAdditionalInformation', 'buildingUnitAdditionalInformation',
      'buildingEnergyAdditionalInformation', 'buildingEnvironmentalAdditionalInformation',
      'buildingAssessmentDescription', 'buildingMaintenanceAdditionalInformation',
      'buildingPriorityRetrofits', 'buildingProjectDescription', 'previousUpdates',
      'buildingFundingAdditionalInformation', 'buildingStructuralVulnerabilities',
      'buildingClimateVulnerabilities', 'buildingSafetyConcerns', 'buildingElectricityServiceUpgradeHistory',
    ]
    return textAreaFields.includes(property)
  }

  // Check if field is a file upload field
  const isFileField = (property: string): boolean => {
    const fileFields = [
      'buildingMaintenanceRecords', 'buildingSystemAssessment', 'buildingFireSafety',
      'buildingSiteFireCertificate', 'buildingOccupancyCertificate', 'buildingEnvironmentalCompliance',
      'buildingZoningCompliance', 'buildingPermitsIssued', 'buildingCertificationsFile',
      'buildingRegionalEnergyTrends', 'buildingEnergyCodeCompliance',
      'buildingOccupancyCertificate', 'occupancyData', 'buildingUnitsMarketRentNum',
      'buildingUnitsMarketRentSqft', 'buildingEnergyAssessmentReports', 'buildingAirQualityReports',
      'buildingWaterQualityReports', 'buildingDSRs', 'buildingBCAs', 'buildingContractorReports',
      'buildingEngineeringAssessments',
    ]
    return fileFields.includes(property)
  }

  // Check if field is a part of the 4-column layout for checkboxes
  const isCheckboxGroupField = (property: string): boolean => {
    const checkboxGroupFields = [
      'buildingParkingAvailable', 'buildingElevatorAvailable',
      'buildingDryerAvailable', 'buildingWasherAvailable', 'buildingCommonSpace', 'buildingHeatingIncluded',
      'buildingHydroIncluded', 'buildingWaterIncluded', 'buildingUtilitiesIncluded',
      'buildingUnitsModified', 'buildingUnitsMarketRent', 'buildingUnitsSubsidized',
      'buildingUnitsRoom', 'buildingUnitsB', 'buildingUnits1B', 'buildingUnits2B',
      'buildingUnits3B', 'buildingUnits4B', 'buildingUnits5B', 'buildingUnits6B', 'buildingUnitsBelowMarketRent',
      'buildingUnitsRentGearedToIncome'
    ]
    return checkboxGroupFields.includes(property)
  }

  const isNumberField = (property: string): boolean => {
    const numberFields = [
      'buildingNorthing', 'buildingTotalSqft', 'buildingFloors', 'buildingUnits',
      'buildingGrossFloorArea', 'buildingNetFloorArea', 'buildingLotSize',
      'buildingUnitsModifiedNum', 'buildingUnitsMarketRentNum', 'buildingUnitsSubsidizedNum',
      'buildingUnitsRoomNum', 'buildingUnitsBNum', 'buildingUnits1BNum',
      'buildingUnits2BNum', 'buildingUnits3BNum', 'buildingUnits4BNum',
      'buildingUnits5BNum', 'buildingUnits6BNum', 'buildingUnitsMarketRentSqft',
      'buildingUnitsBSqft', 'buildingUnits1BSqft', 'buildingUnits2BSqft',
      'buildingUnits3BSqft', 'buildingUnits4BSqft', 'buildingUnits5BSqft', 'buildingUnits6BSqft',
      'buildingUnitsTotal', 'buildingAirQuality', 'buildingAnnualConsumption', 'buildingAssessedValue',
      'buildingOrthogonalHeight', 'buildingOsmId', 'buildingSourceEui', 'buildingWardNumber', 'buildingCensusTract', 
      'buildingIntensityGhgEmissions', 'buildingPermitNumber', 'buildingProgramLoan','buildingProjectNumber',
      'buildingRentalMarketSurveyZone', 'buildingSiteEui', 'buildingSolarPotential', 'buildingSubsidies', 
      'buildingTotalContribution', 'buildingTotalGhgEmissions', 'buildingTotalRentableArea', 'buildingValueOfFundingFlowed', 
      'buildingWaterUseIntensity', 'buildingParentSiteId', 'buildingAssessmentRatingCondition', 'buildingStoreyNum',
      'buildingElectricityServicePanelSize', 'buildingElectricityServiceSize', 'buildingElectricityServiceSize',
      'buildingElectricityServicePanelSize', 'buildingUnitsBelowMarketRentNum', 'buildingUnitsBelowMarketRentSqft',
      'buildingUnitsRentGearedToIncomeNum', 'buildingUnitsRentGearedToIncomeSqft',
      // Energy sources grid metrics/years
      'buildingHeatingMetric', 'buildingHeatingInstallationYear',
      'buildingCoolingMetric', 'buildingCoolingInstallationYear',
      'buildingHotWaterSystemsMetric', 'buildingHotWaterSystemsInstallationYear'
    ]

    return numberFields.includes(property)
  }

  // Render the content for the current tab
  const renderTabContent = () => {
    if (!selectedItem || !currentTabSection) return null

    return (
      <div className="flex flex-col gap-6 pt-3">
        {currentTabSection.subsections.map((subsection, subIdx) => {
          // Handle special layout for Units Available
          if (subsection.specialLayout === 'unitsGrid') {
            return (
              <div key={subIdx} className="">
                {subIdx > 0 && <Separator className="mb-6" />}
                <h3 className="font-semibold text-base mb-3 text-foreground">{subsection.title}</h3>
                <UnitsGrid
                  subsection={subsection}
                  getFieldValue={getFieldValue}
                  handleInputChange={handleInputChange}
                  editing={editing}
                />
              </div>
            )
          }
          // Handle special layout for Energy Sources Grid
          if (subsection.specialLayout === 'energySourcesGrid') {
            return (
              <div key={subIdx} className="">
                {subIdx > 0 && <Separator className="mb-6" />}
                <h3 className="font-semibold text-base mb-3 text-foreground">{subsection.title}</h3>
                <EnergySourcesGrid
                  subsection={subsection}
                  getFieldValue={getFieldValue}
                  handleInputChange={handleInputChange}
                  editing={editing}
                />
              </div>
            )
          }

          // Skip checkbox fields that are handled in groups
          const processedFields = new Set<number>()
          const fieldsToRender = subsection.fields.filter((field, idx) => {
            if (processedFields.has(idx)) return false

            if (isCheckboxGroupField(field.property)) {
              // Only include the first field of each checkbox group
              const groupStartIndex = subsection.fields.findIndex(f => f.property === field.property)
              if (groupStartIndex % 5 === 3 && groupStartIndex === idx) {
                // Mark the next 4 fields as processed
                for (let i = 1; i < 5 && idx + i < subsection.fields.length; i++) {
                  processedFields.add(idx + i)
                }
                return true
              }
              return false
            }

            return true
          })

          return (
            <div key={subIdx} className="">
              {/* Render separator for subsection titles (except for first) */}
              {subIdx > 0 && subsection.title && subsection.title !== '' && subsection.title !== 'null'
                && <Separator className="mb-6" />}

              <h3 className="font-semibold text-base mb-3 text-foreground">{subsection.title}</h3>

              <div className="grid grid-cols-1 [&>*:last-child]:border-b-0">
                {fieldsToRender.map((field, renderIdx) => {
                  const originalIdx = subsection.fields.findIndex(f => f.property === field.property)
                  const value = getFieldValue(field.property)

                  // Check if this is the start of a checkbox group
                  if (isCheckboxGroupField(field.property)) {
                    const checkboxFields = subsection.fields.slice(originalIdx, originalIdx + 5)
                    return (
                      <CheckboxGroup
                        key={renderIdx}
                        fields={checkboxFields}
                        getFieldValue={getFieldValue}
                        handleInputChange={handleInputChange}
                        editing={editing}
                      />
                    )
                  }

                  // Handle full width fields
                  if (isFullWidthField(field.property)) {
                    return (
                      <div key={renderIdx} className={`py-3 w-full ${!editing && 'border-b border-border'}`}>
                        {editing
                          ? (
                              <div className="flex flex-col gap-2">
                                <div className="text-sm font-medium text-foreground">{field.label}</div>
                                <FieldRenderer
                                  property={field.property}
                                  value={value}
                                  handleInputChange={handleInputChange}
                                  isTextAreaField={isTextAreaField}
                                  isFileField={isFileField}
                                  isDateField={isDateField}
                                  isEnumField={isEnumField}
                                  getEnumType={getEnumType}
                                  isNumberField={isNumberField}
                                  isFullWidthField={isFullWidthField}
                                  buildingId={selectedItem?.id}
                                  setActiveChanges={setActiveChanges}
                                />
                              </div>
                            )
                          : (
                              <DescriptionListItem className="break-words" label={field.label}>
                                <FieldValue
                                  value={value}
                                  label={field.label}
                                  isFile={isFileField(field.property)}
                                  property={field.property}
                                  onChange={handleInputChange}
                                  editing={editing}
                                />
                              </DescriptionListItem>
                            )}
                      </div>
                    )
                  }

                  // Skip full-width fields for pairing logic
                  if (isFullWidthField(field.property)) {
                    return null
                  }

                  // Handle regular fields (in pairs)
                  if (renderIdx % 2 === 0) {
                    // Start a new row for every pair of fields
                    const nextField = fieldsToRender[renderIdx + 1]
                    const nextValue = nextField && !isFullWidthField(nextField.property) ? getFieldValue(nextField.property) : null

                    return (
                      <div key={renderIdx} className={`grid grid-cols-1 md:grid-cols-2 gap-3 py-3 w-full ${!editing && 'border-b border-border'} `}>
                        {/* First field */}
                        {editing
                          ? (
                              <div className="flex flex-col gap-2">
                                <div className="text-sm font-medium text-foreground">{field.label}</div>
                                <FieldRenderer
                                  property={field.property}
                                  value={value}
                                  handleInputChange={handleInputChange}
                                  isTextAreaField={isTextAreaField}
                                  isFileField={isFileField}
                                  isDateField={isDateField}
                                  isEnumField={isEnumField}
                                  getEnumType={getEnumType}
                                  isNumberField={isNumberField}
                                  isFullWidthField={isFullWidthField}
                                  buildingId={selectedItem?.id}
                                  setActiveChanges={setActiveChanges}
                                />
                              </div>
                            )
                          : (
                              <DescriptionListItem className="break-words" label={field.label}>
                                <FieldValue
                                  value={value}
                                  label={field.label}
                                  isFile={isFileField(field.property)}
                                  property={field.property}
                                  onChange={handleInputChange}
                                  editing={editing}
                                />
                              </DescriptionListItem>
                            )}

                        <Separator className="md:hidden" />

                        {/* Second field (if exists and not full width) */}
                        {nextField && !isFullWidthField(nextField.property) && (
                          <>
                            {editing
                              ? (
                                  <div className="flex flex-col gap-2">
                                    <div className="text-sm font-semibold text-foreground">
                                      {nextField.label}
                                    </div>
                                    <FieldRenderer
                                      property={nextField.property}
                                      value={nextValue}
                                      handleInputChange={handleInputChange}
                                      isTextAreaField={isTextAreaField}
                                      isFileField={isFileField}
                                      isDateField={isDateField}
                                      isEnumField={isEnumField}
                                      getEnumType={getEnumType}
                                      isNumberField={isNumberField}
                                      isFullWidthField={isFullWidthField}
                                      buildingId={selectedItem?.id}
                                      setActiveChanges={setActiveChanges}
                                    />
                                  </div>
                                )
                              : (
                                  <DescriptionListItem
                                    className="break-words"
                                    label={nextField.label}
                                  >
                                    <FieldValue
                                      value={nextValue}
                                      label={nextField.label}
                                      isFile={isFileField(nextField.property)}
                                      property={nextField.property}
                                      onChange={handleInputChange}
                                      editing={editing}
                                    />
                                  </DescriptionListItem>
                                )}
                          </>
                        )}
                      </div>
                    )
                  }
                  // Skip odd indices for non-full-width fields as they're handled with the previous even index
                  return null
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-row gap-2 p-6 h-full overflow-hidden">
      {/* Sidebar */}
      <TabSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabOptions={tabOptions}
        attachedFilesCount={attachedFilesCount}
      />

      <Separator orientation="vertical" />

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 pb-2 px-6">
          <p className="text-xl text-foreground font-semibold">{currentTabSection?.title}</p>
        </div>
        <div className="flex-1 px-6 overflow-auto">
          {activeTab === 'attached-files'
            ? (
                <AttachedFiles
                  buildingId={selectedItem?.id}
                  files={attachedFiles}
                  isLoading={filesLoading}
                />
              )
            : (
                selectedItem && renderTabContent()
              )}
        </div>
      </div>
    </div>
  )
})

BuildingDetails.displayName = 'BuildingDetails'

export default BuildingDetails