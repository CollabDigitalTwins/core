"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from 'react'
import type { Site, Building } from '../../../../types/dbTypes'
import { handleApiError } from '../../../../utils/errorHandler'
import { useTranslations } from 'next-intl'

// Custom hooks
import { useSite, useCreateSite } from '../../../../hooks/sites/sites'

// Utilities
import { useSiteHeaders } from '../utils/Headers'

// Shadcn Components
import { DescriptionListItem } from '../../../../components/ui/DescriptionList'
import { Separator } from '../../../../components/ui/Separator'
import { toast } from 'sonner'

// Custom Components
import AttachedFiles from '../details/AttachedFiles'
import TabSidebar from '../details/TabSidebar'
import FieldValue from '../details/FieldValue'
import FieldRenderer from './FieldRenderer'
import CheckboxGroup from '../details/CheckboxGroup'
import AssociatedBuildingsTable from './AssociatedBuildings'


type SiteWithAssociatedBuildings = Site & {
  siteBuildings?: Building[]
}

type SiteEditingValues = Partial<Site> & {
  siteBuildings?: {
    connect?: { id: number }[]
    disconnect?: { id: number }[]
  }
}

interface SiteDetailsProps {
  selectedSite?: SiteWithAssociatedBuildings
  setSelectedSite?: (site: SiteWithAssociatedBuildings) => void
  editing?: boolean
  setEditing?: (editing: boolean) => void
  setActiveChanges?: (editing: boolean) => void
  sites?: SiteWithAssociatedBuildings[]
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

// Create a ref type for the component
export type SiteDetailsRef = {
  saveChanges: () => Promise<void>
}

const SiteDetails = React.forwardRef<SiteDetailsRef, SiteDetailsProps>(({
  selectedSite,
  setSelectedSite,
  editing = false,
  setEditing,
  setActiveChanges,
  sites,
  activeTab,
  setActiveTab = () => {},
}, ref) => {
// Translations
  const t = useTranslations('SiteDetails')

  const siteHeaders = useSiteHeaders()
  const associatedBuildingsCount = selectedSite?.siteBuildings?.length || 0

  // Generate tab keys from siteHeaders
  const tabOptions = siteHeaders.map(section => ({
    key: section.title.toLowerCase().replaceAll(/\s/g, '-'),
    label: section.title,
    badge: section.title.toLowerCase().replaceAll(/\s/g, '-') === 'associated-buildings' 
    ? associatedBuildingsCount 
    : null,
  }))

  const [editingValues, setEditingValues] = React.useState<SiteEditingValues>({})
  const [isUpdating, setIsUpdating] = React.useState(false)

  // Find current tab section
  const currentTabSection = siteHeaders.find(
    section => section.title.toLowerCase().replaceAll(/\s/g, '-') === activeTab,
  )

  // Use the updated hook only if we have a site ID
  const { updateSite, site: latestSite, isMutating, updateError } = useSite(selectedSite?.id ? String(selectedSite.id) : '')
  const { createSite, createError } = useCreateSite()

  React.useEffect(() => {
    handleApiError(createError)
    handleApiError(updateError)
  }, [createError, updateError])

  // Handle input changes during editing
  const handleInputChange = (key: string, value: any) => {
    setEditingValues(prev => ({
      ...prev,
      [key]: value,
    }))
    setActiveChanges?.(true)
  }

  // Handle save changes - called directly by parent
  const handleSaveChanges = async () => {
    if (Object.keys(editingValues).length === 0 && !selectedSite) return

    setIsUpdating(true)
    try {
      // Check if this is a new site creation (ID < 0)
      if (selectedSite && selectedSite.id < 0) {
        // Combine the existing site data with the edited values
        const siteData = {
          ...selectedSite,
          ...editingValues,
        }

        // Remove the temporary ID since the database will assign a real one
        delete siteData.id

        // Call the create API
        const result = await createSite(siteData)
        
        // Update the selected site with the newly created one
        if (result && setSelectedSite) {
          setSelectedSite(result)
        }

        setEditingValues({})
        setEditing?.(false)
        setActiveChanges?.(false)
        toast.success(t('toastSuccessCreate'))
      }
      else {
        // This is an update to an existing site
        await updateSite(editingValues)
        setEditingValues({})
        setEditing?.(false)
        setActiveChanges?.(false)
        toast.success(t('toastSuccessUpdate'))
      }
    }
    catch (error) {
      if (error?.status !== 401) {
        toast.error(t('toastErrorUpdate'))
      }
    }
    finally {
      setIsUpdating(false)
    }
  }

  // Update selectedSite to grab the latest site data
  React.useEffect(() => {
    if (latestSite && selectedSite?.id === latestSite.id) {
      setSelectedSite({
        ...latestSite,
        siteBuildings: selectedSite.siteBuildings || latestSite.siteBuildings || []
      })
    }
  }, [latestSite])

  // Expose methods to parent component
  React.useImperativeHandle(ref, () => ({
    saveChanges: handleSaveChanges,
  }), [selectedSite, editingValues, updateSite, setEditing, setActiveChanges])

  // Get current value (edited value or original value)
  const getFieldValue = (property: string) => {
    return editingValues.hasOwnProperty(property)
      ? editingValues[property as keyof Site]
      : selectedSite?.[property as keyof Site]
  }

  // Check if field is a date field
  const isDateField = (property: string): boolean => {
    const dateFields = [
      'siteYearBuilt', 'siteAssessmentDate', 'siteEstimatedStartDate',
      'siteEstimatedEndDate', 'siteStartDate', 'siteCompletedDate',
      'sitePermitIssuedDate', '',
    ]

    return dateFields.includes(property) || property.toLowerCase().includes('date')
  }

  const isNumberField = (property: string): boolean => {
    const numberFields = [
      'siteAnnualConsumption',
      'siteEnergyDemand',
      'siteSourceEui',
      'siteEui',
      'siteSolarPotential',
      'siteTotalGhgEmissions',
      'siteIntensityGhgEmissions',
      'siteWaterUseData',
      'siteSubsidies',
      'siteProgramLoan',
      'siteTotalContribution',
      'siteValueOfFundingFlowed',
      'siteTotalArea',
      'siteTotalBuiltArea',
      'siteTotalAvailableArea',
      'siteYearBuilt',
      'siteProjectNumber',
      'sitePermitNumber',
      'siteAssessedValue',
    ]

    return numberFields.includes(property)
  }

  // Check if field is an enum field
  const isEnumField = (property: string): boolean => {
    const enumFields = [
      'siteCountrySubdivision',
      'siteEnergyUsage',
      'siteAssessmentCondition',
      'siteProjectPhase',
      'siteProjectType',
      'siteLandUse',
    ]

    return enumFields.includes(property)
  }

  // Get enum type for a property
  const getEnumType = (property: string): string | null => {
    const enumMappings: Record<string, string> = {
      siteEnergyUsage: 'SiteEnergySource',
      siteAssessmentCondition: 'SiteAssessmentConditions',
      siteProjectPhase: 'SiteProjectPhase',
      siteProjectType: 'SiteProjectType',
      siteLandUse: 'SiteLandUse',
      siteCountrySubdivision: 'CountrySubdivisionData',
    }

    return enumMappings[property] || null
  }

  // Check if field should be full width
  const isFullWidthField = (property: string): boolean => {
    const fullWidthFields = [
      'siteName', 'siteAddress',
      'siteNotes', 'siteAdditionalInformation', 'siteEnergyAdditionalInformation',
      'siteEnvironmentalAdditionalInformation', 'siteAssessmentDescription',
      'siteMaintenanceRecords', 'siteMaintenanceAdditionalInformation',
      'sitePriorityRetrofits', 'siteProjectDescription', 'sitePreviousUpdates',
      'siteFundingAdditionalInformation', 'siteClimateVulnerabilities', 'siteSafetyConcerns', 'siteFireSafety', 'siteOccupancyCertificate', 'siteZoningCompliance', 'siteEnvironmentalCompliance', 'siteBuildingPermit',
    ]
    return fullWidthFields.includes(property)
  }

  // Check if field should use textarea input
  const isTextAreaField = (property: string): boolean => {
    const textAreaFields = [
      'siteNotes', 'siteEnergyAdditionalInformation', 'siteEnvironmentalAdditionalInformation',
      'siteAssessmentDescription', 'siteMaintenanceAdditionalInformation',
      'sitePriorityRetrofits', 'siteProjectDescription', 'previousUpdates',
      'siteFundingAdditionalInformation', 'siteClimateVulnerabilities', 'siteSafetyConcerns',
    ]
    return textAreaFields.includes(property)
  }

  // Check if field is a file upload field
  const isFileField = (property: string): boolean => {
    const fileFields = [
      'siteZoningCompliance', 'siteEnergyCodeCompliance', 'siteCertificationCertificates',
      'siteEnvironmentalCompliance', 'siteMaintenanceRecords', 'siteBuildingPermit', 'siteFireSafety', 'siteInsuranceClaims', 'siteEnvironmentalCompliance', 'siteZoningCompliance', 'siteBuildingPermit',
    ]
    return fileFields.includes(property)
  }

  // Check if field is a part of the 4-column layout for checkboxes
  const isCheckboxGroupField = (property: string): boolean => {
    const checkboxGroupFields = []
    return checkboxGroupFields.includes(property)
  }

  // Render the content for the current tab
  const renderTabContent = () => {
    if (!selectedSite || !currentTabSection) return null

    // Special handling for the Associated Buildings tab
    if (activeTab === 'associated-buildings') {
      return (
        <div className="flex flex-col gap-6 pt-3">
          <Separator />
          <AssociatedBuildingsTable
            buildings={selectedSite.siteBuildings || []}
            onRowClick={(building) => {
            // TODO: handle row click
            }}
            onAttachBuilding={(building) => {
            // Check if building is already attached
              const updatedBuildings = [...(selectedSite.siteBuildings || [])]
              if (!updatedBuildings.some(b => b.id === building.id)) {
              // Update the editingValues to include the connect operation
                setEditingValues(prev => ({
                  ...prev,
                  siteBuildings: {
                    connect: [
                      ...(prev.siteBuildings?.connect || []),
                      { id: building.id },
                    ],
                    disconnect: prev.siteBuildings?.disconnect || [],
                  },
                }))
                // Trigger active changes state
                setActiveChanges?.(true)
              }
            }}
            editing={editing}
            setEditing={setEditing}
            siteId={selectedSite.id}
            siteName={selectedSite.siteName}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-6 pt-3">
        {currentTabSection.subsections.map((subsection, subIdx) => {
          // Skip checkbox fields that are handled in groups
          const nonCheckboxFields = subsection.fields.filter(
            (field, idx) => !isCheckboxGroupField(field.property)
              || (isCheckboxGroupField(field.property) && subsection.fields.findIndex(
                f => f.property === field.property,
              ) % 4 === 0),
          )

          return (
            <div key={subIdx} className="">
              {/* Render separator for subsection titles (except for first) */}
              {subIdx > 0 && subsection.title && subsection.title !== '' && subsection.title !== 'null'
                && <Separator className="mb-6" />}

              <h3 className="font-semibold text-base mb-3 text-foreground">{subsection.title}</h3>

              <div className="grid grid-cols-1">
                {nonCheckboxFields.map((field, idx) => {
                  const value = getFieldValue(field.property)

                  // Check if this is the start of a checkbox group
                  if (isCheckboxGroupField(field.property)
                    && subsection.fields.findIndex(f => f.property === field.property) % 4 === 0) {
                    const checkboxFields = subsection.fields.slice(
                      subsection.fields.findIndex(f => f.property === field.property),
                      subsection.fields.findIndex(f => f.property === field.property) + 4,
                    )
                    return (
                      <CheckboxGroup
                        key={idx}
                        fields={checkboxFields}
                        getFieldValue={getFieldValue}
                        handleInputChange={handleInputChange}
                        editing={editing}
                      />
                    )
                  }

                  // Skip fields that are part of checkbox groups but not at the start position
                  if (isCheckboxGroupField(field.property)) return null

                  // Handle full width fields
                  if (isFullWidthField(field.property)) {
                    return (
                      <div key={idx} className={`py-3 w-full ${!editing && 'border-b border-border'}`}>
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

                  // Handle regular fields (in pairs)
                  if (idx % 2 === 0) {
                    // Start a new row for every pair of fields
                    const nextField = idx + 1 < nonCheckboxFields.length ? nonCheckboxFields[idx + 1] : null
                    const nextValue = nextField ? getFieldValue(nextField.property) : null

                    return (
                      <div key={idx} className={`grid grid-cols-1 md:grid-cols-2 gap-3 py-3 w-full ${!editing && 'border-b border-border'}`}>
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

                        {/* Second field (if exists) */}
                        {nextField && (
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
                  // Skip odd indices as they're handled with the previous even index
                  return null
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  React.useEffect(() => {
    // If this is a new site (negative ID), automatically start in edit mode
    if (selectedSite && selectedSite.id < 0 && setEditing) {
      setEditing(true)
      setActiveChanges?.(true)
    }
  }, [selectedSite, setEditing, setActiveChanges])

  return (
    <div className="flex flex-row gap-2 p-6 h-full overflow-hidden">
      {/* Sidebar */}
      <TabSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabOptions={tabOptions}
        associatedBuildingsCount={associatedBuildingsCount}
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
                <AttachedFiles />
              )
            : (
                selectedSite && renderTabContent()
              )}
        </div>
      </div>
    </div>
  )
})

SiteDetails.displayName = 'SiteDetails'

export default SiteDetails