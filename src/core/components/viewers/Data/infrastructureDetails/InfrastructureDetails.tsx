"use client"

// Dependencies
import * as React from 'react'
import type { Building, Infrastructure } from '../../../../types/dbTypes'
import { handleApiError } from '../../../../utils/errorHandler'

// Custom hooks
import { createInfrastructureHooks } from '../../../../hooks/infrastructures/createInfrastructureHooks'
import { useCreateInfrastructure, useInfrastructure } from '../../../../hooks/infrastructures/infrastructures'

// Utilities
import { useInfrastructureHeaders } from '../utils/Headers'

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
import { useTranslations } from 'next-intl'

type InfrastructureWithAssociatedBuildings = Infrastructure & {
  infrastructureBuildings?: Building[]
}

type InfrastructureEditingValues = Partial<Infrastructure> & {
  infrastructureBuildings?: {
    connect?: { id: number }[]
    disconnect?: { id: number }[]
  }
}

interface InfrastructureDetailsProps {
  selectedInfrastructure?: InfrastructureWithAssociatedBuildings
  setSelectedInfrastructure?: (infrastructure: InfrastructureWithAssociatedBuildings) => void
  editing?: boolean
  setEditing?: (editing: boolean) => void
  setActiveChanges?: (editing: boolean) => void
  infrastructures?: InfrastructureWithAssociatedBuildings[]
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

// Create a ref type for the component
export type InfrastructureDetailsRef = {
  saveChanges: () => Promise<void>
}

const InfrastructureDetails = React.forwardRef<InfrastructureDetailsRef, InfrastructureDetailsProps>(({
  selectedInfrastructure,
  setSelectedInfrastructure,
  editing = false,
  setEditing,
  setActiveChanges,
  infrastructures,
  activeTab,
  setActiveTab = () => {},
}, ref) => {
// Translations
  const t = useTranslations('InfrastructureDetails')

  const infrastructureHeaders = useInfrastructureHeaders()
  const associatedBuildingsCount = selectedInfrastructure?.infrastructureBuildings?.length || 0

  // Generate tab keys from infrastructureHeaders
  const tabOptions = infrastructureHeaders.map(section => ({
    key: section.title.toLowerCase().replaceAll(/\s/g, '-'),
    label: section.title,
    badge: section.title.toLowerCase().replaceAll(/\s/g, '-') === 'associated-buildings' 
    ? associatedBuildingsCount 
    : null,
  }))

  const [editingValues, setEditingValues] = React.useState<InfrastructureEditingValues>({})
  const [isUpdating, setIsUpdating] = React.useState(false)

  // Find current tab section
  const currentTabSection = infrastructureHeaders.find(
    section => section.title.toLowerCase().replaceAll(/\s/g, '-') === activeTab,
  )

  // Use the updated hook only if we have a infrastructure ID
  const { updateInfrastructure, infrastructure: latestInfrastructure, isMutating, updateError } = useInfrastructure(selectedInfrastructure?.id ?? undefined)
  const { createInfrastructure, createError } = useCreateInfrastructure()

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
    if (Object.keys(editingValues).length === 0 && !selectedInfrastructure) return

    setIsUpdating(true)
    try {
      // Check if this is a new infrastructure creation (ID < 0)
      if (selectedInfrastructure && selectedInfrastructure.id < 0) {
        // Combine the existing infrastructure data with the edited values
        const infrastructureData = {
          ...selectedInfrastructure,
          ...editingValues,
        }

        // Remove the temporary ID since the database will assign a real one
        delete infrastructureData.id

        // Call the create API
        const result = await createInfrastructure(infrastructureData)
        
        // Update the selected infrastructure with the newly created one
        if (result && setSelectedInfrastructure) {
          setSelectedInfrastructure(result)
        }

        setEditingValues({})
        setEditing?.(false)
        setActiveChanges?.(false)
        toast.success(t('toastSuccessCreate'))
      }
      else {
        // This is an update to an existing infrastructure
        await updateInfrastructure(editingValues)
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

  // Update selectedInfrastructure to grab the latest infrastructure data
  React.useEffect(() => {
    if (latestInfrastructure && selectedInfrastructure?.id === latestInfrastructure.id) {
      setSelectedInfrastructure({
        ...latestInfrastructure
      })
    }
  }, [latestInfrastructure])

  // Expose methods to parent component
  React.useImperativeHandle(ref, () => ({
    saveChanges: handleSaveChanges,
  }), [selectedInfrastructure, editingValues, updateInfrastructure, setEditing, setActiveChanges])

  // Get current value (edited value or original value)
  const getFieldValue = (property: string) => {
    return editingValues.hasOwnProperty(property)
      ? editingValues[property as keyof Infrastructure]
      : selectedInfrastructure?.[property as keyof Infrastructure]
  }

  // Check if field is a date field
  const isDateField = (property: string): boolean => {
    const dateFields = [
      'infrastructureYearBuilt', 'infrastructureAssessmentDate', 'infrastructureEstimatedStartDate',
      'infrastructureEstimatedEndDate', 'infrastructureStartDate', 'infrastructureCompletedDate',
      'infrastructurePermitIssuedDate', '',
    ]

    return dateFields.includes(property) || property.toLowerCase().includes('date')
  }

  const isNumberField = (property: string): boolean => {
    const numberFields = [
      'infrastructureAnnualConsumption',
      'infrastructureEnergyDemand',
      'infrastructureSourceEui',
      'infrastructureEui',
      'infrastructureSolarPotential',
      'infrastructureTotalGhgEmissions',
      'infrastructureIntensityGhgEmissions',
      'infrastructureWaterUseData',
      'infrastructureSubsidies',
      'infrastructureProgramLoan',
      'infrastructureTotalContribution',
      'infrastructureValueOfFundingFlowed',
      'infrastructureTotalArea',
      'infrastructureTotalBuiltArea',
      'infrastructureTotalAvailableArea',
      'infrastructureYearBuilt',
      'infrastructureProjectNumber',
      'infrastructurePermitNumber',
      'infrastructureAssessedValue',
    ]

    return numberFields.includes(property)
  }

  // Check if field is an enum field
  const isEnumField = (property: string): boolean => {
    const enumFields = [
      'infrastructureEnergyUsage',
      'infrastructureAssessmentCondition',
      'infrastructureProjectPhase',
      'infrastructureProjectType',
      'infrastructureLandUse',
    ]

    return enumFields.includes(property)
  }

  // Get enum type for a property
  const getEnumType = (property: string): string | null => {
    const enumMappings: Record<string, string> = {
      infrastructureEnergyUsage: 'InfrastructureEnergySource',
      infrastructureAssessmentCondition: 'InfrastructureAssessmentConditions',
      infrastructureProjectPhase: 'InfrastructureProjectPhase',
      infrastructureProjectType: 'InfrastructureProjectType',
      infrastructureLandUse: 'InfrastructureLandUse',
    }

    return enumMappings[property] || null
  }

  // Check if field should be full width
  const isFullWidthField = (property: string): boolean => {
    const fullWidthFields = [
      'infrastructureName', 'infrastructureAddress',
      'infrastructureNotes', 'infrastructureAdditionalInformation', 'infrastructureEnergyAdditionalInformation',
      'infrastructureEnvironmentalAdditionalInformation', 'infrastructureAssessmentDescription',
      'infrastructureMaintenanceRecords', 'infrastructureMaintenanceAdditionalInformation',
      'infrastructurePriorityRetrofits', 'infrastructureProjectDescription', 'infrastructurePreviousUpdates',
      'infrastructureFundingAdditionalInformation', 'infrastructureClimateVulnerabilities', 'infrastructureSafetyConcerns', 'infrastructureFireSafety', 'infrastructureOccupancyCertificate', 'infrastructureZoningCompliance', 'infrastructureEnvironmentalCompliance', 'infrastructureBuildingPermit',
    ]
    return fullWidthFields.includes(property)
  }

  // Check if field should use textarea input
  const isTextAreaField = (property: string): boolean => {
    const textAreaFields = [
      'infrastructureNotes', 'infrastructureEnergyAdditionalInformation', 'infrastructureEnvironmentalAdditionalInformation',
      'infrastructureAssessmentDescription', 'infrastructureMaintenanceAdditionalInformation',
      'infrastructurePriorityRetrofits', 'infrastructureProjectDescription', 'previousUpdates',
      'infrastructureFundingAdditionalInformation', 'infrastructureClimateVulnerabilities', 'infrastructureSafetyConcerns',
    ]
    return textAreaFields.includes(property)
  }

  // Check if field is a file upload field
  const isFileField = (property: string): boolean => {
    const fileFields = [
      'infrastructureZoningCompliance', 'infrastructureEnergyCodeCompliance', 'infrastructureCertificationCertificates',
      'infrastructureEnvironmentalCompliance', 'infrastructureMaintenanceRecords', 'infrastructureBuildingPermit', 'infrastructureFireSafety', 'infrastructureInsuranceClaims', 'infrastructureEnvironmentalCompliance', 'infrastructureZoningCompliance', 'infrastructureBuildingPermit',
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
    if (!selectedInfrastructure || !currentTabSection) return null

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
    // If this is a new infrastructure (negative ID), automatically start in edit mode
    if (selectedInfrastructure && selectedInfrastructure.id < 0 && setEditing) {
      setEditing(true)
      setActiveChanges?.(true)
    }
  }, [selectedInfrastructure, setEditing, setActiveChanges])

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
                selectedInfrastructure && renderTabContent()
              )}
        </div>
      </div>
    </div>
  )
})

InfrastructureDetails.displayName = 'InfrastructureDetails'

export default InfrastructureDetails