// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'

import React from 'react'
import { Building, Site } from '../../../../types/dbTypes'

type BuildingWithRelations = Building & {
  buildingOccupancyCertificate: File[]
  occupancyData: File[]
  buildingZoningCompliance: File[]
  buildingUnitsMarketRentNum: File[]
  buildingUnitsMarketRentSqft: File[]
  buildingPermitsIssued: File[]
  buildingRegionalEnergyTrends: File[]
  buildingEnergyCodeCompliance: File[]
  buildingCertificationsFile: File[]
  buildingWaterUseIntensity: File[]
  buildingEnvironmentalCompliance: File[]
  buildingAssessmentRatingCondition: File[]
  buildingMaintenanceRecords: File[]
  conditionRatingsDate: File[]
  buildingSystemAssessment: File[]
  buildingFireSafety: File[]
  buildingSiteFireCertificate: File[]
  buildingEnergyAssessmentReports: File[]
  buildingAirQualityReports: File[]
  buildingWaterQualityReports: File[]
  DSRs: File[]
  buildingBCAs: File[]
  buildingContractorReports: File[]
  buildingEngineeringAssessments: File[]
}

type SiteWithRelations = Site & {
  siteEnergyCodeCompliance: File[]
  siteCertificationCertificates: File[]
  siteEnvironmentalCompliance: File[]
  siteMaintenanceRecords: File[]
  siteFireSafety: File[]
  siteFireCert: File[]
  siteZoningCompliance: File[]
  siteBuildingPermit: File[]
  siteInsuranceClaims: File[]
  siteBuildingPermitsIssued: File[]
  siteBuildings: Building[]
}

type BuildingFieldDefinition = {
  label: React.ReactNode // UI Header
  property: keyof BuildingWithRelations
}
type SiteFieldDefinition = {
  label: React.ReactNode // UI Header
  property: keyof SiteWithRelations
}

type BuildingSubSection = {
  title: string // Subheader
  fields: BuildingFieldDefinition[]
  specialLayout?: string
  columns?: { header: string | React.ReactNode, propertyPrefix: string }[]
  rows?: { label: string, baseProperty: string }[]
}
type SiteSubSection = {
  title: string // Subheader
  fields: SiteFieldDefinition[]
}

type BuildingTabSection = {
  title: string // Tab
  subsections: BuildingSubSection[]
}
type SiteTabSection = {
  title: string // Tab
  subsections: SiteSubSection[]
}

export const useBuildingHeaders = () => {
  // Translations
  const t = useTranslations('headers')

  return [
    {
      title: t('buildingInformation'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('buildingName'), property: 'buildingName' },
            { label: t('buildingAddress'), property: 'buildingAddress' },
            { label: t('buildingCountrySubdivision'), property: 'buildingCountrySubdivision' },
            { label: t('buildingMunicipality'), property: 'buildingMunicipality' },
            { label: t('buildingCity'), property: 'buildingCity' },
            { label: t('buildingPostalCode'), property: 'buildingPostalCode' },
            { label: t('buildingCounty'), property: 'buildingCounty' },
            { label: t('buildingWardName'), property: 'buildingWardName' },
            { label: t('buildingWardNumber'), property: 'buildingWardNumber' },
            { label: t('buildingParentSiteId'), property: 'buildingParentSiteId' },
          ],
        },
        {
          title: t('features'),
          fields: [
            { label: t('buildingType'), property: 'buildingType' },
            { label: t('buildingGeometryStyle'), property: 'buildingGeometryStyle' },
            { label: t('buildingStoreyNum'), property: 'buildingStoreyNum' },
            {
              label: <>
                {t('buildingTotalSqft')}
                {" "}
                <span className="italic !text-xs !font-light">m²</span>
              </>,
              property: 'buildingTotalSqft',
            },
            { label: t('buildingMaterials'), property: 'buildingMaterials' },
            { label: t('buildingYearBuilt'), property: 'buildingYearBuilt' },
            { label: t('buildingZoning'), property: 'buildingZoning' },
            { label: t('buildingZoningCompliance'), property: 'buildingZoningCompliance' },
            { label: t('buildingParkingAvailable'), property: 'buildingParkingAvailable' },
            { label: t('buildingElevatorAvailable'), property: 'buildingElevatorAvailable' },
            { label: t('buildingDryerAvailable'), property: 'buildingDryerAvailable' },
            { label: t('buildingWasherAvailable'), property: 'buildingWasherAvailable' },
            { label: t('buildingCommonSpace'), property: 'buildingCommonSpace' },
            { label: t('buildingNotes'), property: 'buildingNotes' },
          ],
        },
        {
          title: t('contactInformation'),
          fields: [
            { label: t('buildingOwnership'), property: 'buildingOwnership' },
            { label: t('buildingProviderName'), property: 'buildingProviderName' },
            { label: t('buildingProviderType'), property: 'buildingProviderType' },
            { label: t('buildingProviderWebsite'), property: 'buildingProviderWebsite' },
            { label: t('buildingProviderContactName'), property: 'buildingProviderContactName' },
            { label: t('buildingProviderContactPhone'), property: 'buildingProviderContactPhone' },
            { label: t('buildingProviderContactEmail'), property: 'buildingProviderContactEmail' },
            { label: t('buildingWebsite'), property: 'buildingWebsite' },
          ],
        },
        {
          title:  t('managementInfo'),
          fields: [
            { label: t('managementName'), property: 'buildingManagementName' },
            { label: t('managementType'), property: 'buildingManagementType' },
            { label: t('managementWebsite'), property: 'buildingManagementWebsite' },
            { label: t('managementContactName'), property: 'buildingManagementContactName' },
            { label: t('managementPhoneNumber'), property: 'buildingManagementPhoneNumber' },          ],
        },
        {
          title: t('occupants'),
          fields: [
            { label: t('buildingOccupantType'), property: 'buildingOccupantType' },
            { label: t('buildingOccupancyCertificate'), property: 'buildingOccupancyCertificate' },
            { label: t('buildingRentalMarketSurveyZone'), property: 'buildingRentalMarketSurveyZone' },
            { label: t('buildingCensusTract'), property: 'buildingCensusTract' },
          ],
        },
        {
          title: t('coordinates'),
          fields: [
            { label: t('buildingLatitude'), property: 'buildingLatitude' },
            { label: t('buildingLongitude'), property: 'buildingLongitude' },
            { label: t('buildingElevation'), property: 'buildingElevation' },
            { label: t('buildingNorthing'), property: 'buildingNorthing' },
            { label: t('buildingEasting'), property: 'buildingEasting' },
            { label: t('buildingEPSG'), property: 'buildingEPSG' },
            { label: t('buildingOrthogonalHeight'), property: 'buildingOrthogonalHeight' },
            { label: t('buildingOsmId'), property: 'buildingOsmId' },
            { label: t('buildingAdditionalInformation'), property: 'buildingAdditionalInformation' },
          ],
        },
      ],
    },
    {
      title: t('buildingUnits'),
      subsections: [
        {
          title: t('units'),
          fields: [
            { label: t('buildingType'), property: 'buildingType' },
            { label: t('buildingUnitsTotal'), property: 'buildingUnitsTotal' },
            {
              label: <>
                {t('buildingTotalSqft')}
                {" "}
                <span className="italic !text-xs !font-light">m²</span>
              </>,
              property: 'buildingTotalSqft',
            },
            {
              label: <>
                {t('buildingTotalRentableArea')}
                {" "}
                <span className="italic !text-xs !font-light">m²</span>
              </>,
              property: 'buildingTotalRentableArea',
            },
            { label: t('buildingHeatingIncluded'), property: 'buildingHeatingIncluded' },
            { label: t('buildingHydroIncluded'), property: 'buildingHydroIncluded' },
            { label: t('buildingWaterIncluded'), property: 'buildingWaterIncluded' },
            { label: t('buildingUtilitiesIncluded'), property: 'buildingUtilitiesIncluded' },
          ],
        },
        {
          title: t('unitsAvailable'),
          specialLayout: 'unitsGrid',
          columns: [
            { header: t('unitType'), propertyPrefix: '' },
            { header: t('totalNumberOfUnits'), propertyPrefix: 'Num' },
            {
              header: <>
                {t('unit')}
                <span className="italic !text-xs !font-light"></span>
              </>,
              propertyPrefix: 'Sqft',
            },

          ],
          rows: [
            { label: t('accessibleUnits'), baseProperty: 'buildingUnitsModified' },
            { label: t('subsidizedUnits'), baseProperty: 'buildingUnitsSubsidized' },
            { label: t('marketRentalUnits'), baseProperty: 'buildingUnitsMarketRent' },
            { label: t('belowMarketRent'), baseProperty: 'buildingUnitsBelowMarketRent' },
            { label: t('rentGearedToIncome'), baseProperty: 'buildingUnitsRentGearedToIncome' },
            { label: t('roomUnits'), baseProperty: 'buildingUnitsRoom' },
            { label: t('bachelorUnits'), baseProperty: 'buildingUnitsB' },
            { label: t('oneBedroomUnits'), baseProperty: 'buildingUnits1B' },
            { label: t('twoBedroomUnits'), baseProperty: 'buildingUnits2B' },
            { label: t('threeBedroomUnits'), baseProperty: 'buildingUnits3B' },
            { label: t('fourBedroomUnits'), baseProperty: 'buildingUnits4B' },
            { label: t('fiveBedroomUnits'), baseProperty: 'buildingUnits5B' },
            { label: t('sixBedroomUnits'), baseProperty: 'buildingUnits6B' },
          ],
          fields: [
            { label: t('buildingUnitsModified'), property: 'buildingUnitsModified' },
            { label: t('buildingUnitsModifiedNum'), property: 'buildingUnitsModifiedNum' },
            { label: t('buildingUnitsModifiedSqft'), property: 'buildingUnitsModifiedSqft' },
            { label: t('buildingUnitsMarketRent'), property: 'buildingUnitsMarketRent' },
            { label: t('buildingUnitsMarketRentNum'), property: 'buildingUnitsMarketRentNum' },
            { label: t('buildingUnitsMarketRentSqft'), property: 'buildingUnitsMarketRentSqft' },
            { label: t('buildingUnitsSubsidized'), property: 'buildingUnitsSubsidized' },
            { label: t('buildingUnitsSubsidizedNum'), property: 'buildingUnitsSubsidizedNum' },
            { label: t('buildingUnitsSubsidizedSqft'), property: 'buildingUnitsSubsidizedSqft' },
            { label: t('belowMarketRent'), property: 'buildingUnitsBelowMarketRent' },
            { label: t('belowMarketRentNum'), property: 'buildingUnitsBelowMarketRentNum' },
            { label: t('belowMarketRentsqft'), property: 'buildingUnitsBelowMarketRentSqft' },
            { label: t('rentGearedToIncome'), property: 'buildingUnitsRentGearedToIncome' },
            { label: t('rentGearedToIncomeNum'), property: 'buildingUnitsRentGearedToIncomeNum' },
            { label: t('rentGearedToIncomesqft'), property: 'buildingUnitsRentGearedToIncomeSqft' },
            { label: t('buildingUnitsRoom'), property: 'buildingUnitsRoom' },
            { label: t('buildingUnitsRoomNum'), property: 'buildingUnitsRoomNum' },
            { label: t('buildingUnitsRoomSqft'), property: 'buildingUnitsRoomSqft' },
            { label: t('buildingUnitsB'), property: 'buildingUnitsB' },
            { label: t('buildingUnitsBNum'), property: 'buildingUnitsBNum' },
            { label: t('buildingUnitsBSqft'), property: 'buildingUnitsBSqft' },
            { label: t('buildingUnits1B'), property: 'buildingUnits1B' },
            { label: t('buildingUnits1BNum'), property: 'buildingUnits1BNum' },
            { label: t('buildingUnits1BSqft'), property: 'buildingUnits1BSqft' },
            { label: t('buildingUnits2B'), property: 'buildingUnits2B' },
            { label: t('buildingUnits2BNum'), property: 'buildingUnits2BNum' },
            { label: t('buildingUnits2BSqft'), property: 'buildingUnits2BSqft' },
            { label: t('buildingUnits3B'), property: 'buildingUnits3B' },
            { label: t('buildingUnits3BNum'), property: 'buildingUnits3BNum' },
            { label: t('buildingUnits3BSqft'), property: 'buildingUnits3BSqft' },
            { label: t('buildingUnits4B'), property: 'buildingUnits4B' },
            { label: t('buildingUnits4BNum'), property: 'buildingUnits4BNum' },
            { label: t('buildingUnits4BSqft'), property: 'buildingUnits4BSqft' },
            { label: t('buildingUnits5B'), property: 'buildingUnits5B' },
            { label: t('buildingUnits5BNum'), property: 'buildingUnits5BNum' },
            { label: t('buildingUnits5BSqft'), property: 'buildingUnits5BSqft' },
            { label: t('buildingUnits6B'), property: 'buildingUnits6B' },
            { label: t('buildingUnits6BNum'), property: 'buildingUnits6BNum' },
            { label: t('buildingUnits6BSqft'), property: 'buildingUnits6BSqft' },
          ],
        },
        {
          title: '',
          fields: [
            { label: t('buildingUnitAdditionalInformation'), property: 'buildingUnitAdditionalInformation' },
          ],
        },
      ],
    },
    {
      title: t('buildingProjects'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('buildingProjectName'), property: 'buildingProjectName' },
            { label: t('buildingProjectNumber'), property: 'buildingProjectNumber' },
            { label: t('buildingProjectType'), property: 'buildingProjectType' },
            { label: t('buildingProjectPhase'), property: 'buildingProjectPhase' },
            { label: t('buildingEstimatedStartDate'), property: 'buildingEstimatedStartDate' },
            { label: t('buildingEstimatedEndDate'), property: 'buildingEstimatedEndDate' },
            { label: t('buildingStartDate'), property: 'buildingStartDate' },
            { label: t('buildingCompletedDate'), property: 'buildingCompletedDate' },
            { label: t('buildingPriorityRetrofits'), property: 'buildingPriorityRetrofits' },
            { label: t('buildingProjectDescription'), property: 'buildingProjectDescription' },
            { label: t('previousUpdates'), property: 'previousUpdates' },
          ],
        },
        {
          title: t('permits'),
          fields: [
            { label: t('buildingBuilderName'), property: 'buildingBuilderName' },
            { label: t('buildingPermitsIssued'), property: 'buildingPermitsIssued' },
            { label: t('buildingPermitNumber'), property: 'buildingPermitNumber' },
            { label: t('buildingPermitIssuedDate'), property: 'buildingPermitIssuedDate' },
          ],
        },
        {
          title: t('funding'),
          fields: [
            {
              label: <>
                {t('buildingEstimatedTotalCost')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
              </>,
              property: 'buildingEstimatedTotalCost',
            },
            {
              label: <>
                {t('buildingEstimatedConstructionCost')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
              </>,
              property: 'buildingEstimatedConstructionCost',
            },
            { label: t('buildingRetrofitFundingNeeds'), property: 'buildingRetrofitFundingNeeds' },
            {
              label: <>
                {t('buildingFederalContribution')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
              </>,
              property: 'buildingFederalContribution',
            },
          ],
        },
      ],
    },
    {
      title: t('energyData'),
      subsections: [
        {
          title: t('energySourcesAndMetrics'),
          specialLayout: 'energySourcesGrid',
          columns: [
            { header: t('sourceHeader'), propertyPrefix: 'EnergySources' },
            { header: t('metricHeader'), propertyPrefix: 'Metric' },
            { header: t('installationYearHeader'), propertyPrefix: 'InstallationYear' },
          ],
          rows: [
            { label: t('heatingSource'), baseProperty: 'buildingHeating' },
            { label: t('coolingSource'), baseProperty: 'buildingCooling' },
            { label: t('hotWaterSource'), baseProperty: 'buildingHotWaterSystems' },
          ],
          fields: [
            { label: t('heatingSource'), property: 'buildingHeatingEnergySources' },
            { label: t('heatingMetric'), property: 'buildingHeatingMetric' },
            { label: t('heatingInstallationYear'), property: 'buildingHeatingInstallationYear' },
            { label: t('coolingSource'), property: 'buildingCoolingEnergySources' },
            { label: t('coolingMetric'), property: 'buildingCoolingMetric' },
            { label: t('coolingInstallationYear'), property: 'buildingCoolingInstallationYear' },
            { label: t('hotWaterSource'), property: 'buildingHotWaterSystemsEnergySources' },
            { label: t('hotWaterMetric'), property: 'buildingHotWaterSystemsMetric' },
            { label: t('hotWaterInstallationYear'), property: 'buildingHotWaterSystemsInstallationYear' },
          ],
        },
        {
          title: t('energyMetrics'),
          fields: [
            {
              label: (
                <>
                  {t('buildingAnnualConsumption')}
                  <span className="italic !text-xs !font-light"> kWh</span>
                </>
              ),
              property: 'buildingAnnualConsumption',
            },
            {
              label: (
                <>
                  {t('buildingSiteEui')}
                  <span className="italic !text-xs !font-light"> kBtu/ft²/year</span>
                </>
              ),
              property: 'buildingSiteEui',
            },
            {
              label: (
                <>
                  {t('buildingSourceEui')}
                  <span className="italic !text-xs !font-light"> kBtu/ft²/year</span>
                </>
              ),
              property: 'buildingSourceEui',
            },
            {
              label: (
                <>
                  {t('buildingSolarPotential')}
                  <span className="italic !text-xs !font-light"> kWh/kWp</span>
                </>
              ),
              property: 'buildingSolarPotential',
            },
            { label: t('buildingHvacEfficiency'), property: 'buildingHvacEfficiency' },
            { label: t('buildingRegionalEnergyTrends'), property: 'buildingRegionalEnergyTrends' },
          ],
        },
        {
          title: t('electricalPanel'),
          fields: [
            { label: t('serviceSize'), property: 'buildingElectricityServiceSize' },
            { label: t('serviceLocation'), property: 'buildingElectricityServiceLocation' },
            { label: t('panelSize'), property: 'buildingElectricityServicePanelSize' },
            { label: t('utilityConnection'), property: 'buildingElectricityServiceUtilityConnection' },
            { label: t('upgradeHistory'), property: 'buildingElectricityServiceUpgradeHistory' },
          ],
        },
        {
          title: t('reports'),
          fields: [
            { label: t('buildingEnergyCodeCompliance'), property: 'buildingEnergyCodeCompliance' },
            { label: t('assessmentReports'), property: 'buildingEnergyAssessmentReports' },
          ],
        },
        {
          fields: [
            { label: t('buildingEnergyAdditionalInformation'), property: 'buildingEnergyAdditionalInformation' },
          ],
        },
      ],
    },
    {
      title: t('environmentalData'),
      subsections: [
        {
          title: t('general'),
          fields: [
            {
            label: <>
              {t('buildingTotalGhgEmissions')}
              {" "}
              <span className="italic !text-xs !font-light">CO2e</span>
                   </>,
            property: 'buildingTotalGhgEmissions',
            },
            { label: t('buildingIntensityGhgEmissions'), property: 'buildingIntensityGhgEmissions' },
            { label: t('buildingCertifications'), property: 'buildingCertifications' },
            { label: t('buildingCertificationsFile'), property: 'buildingCertificationsFile' },
            {
              label: <>
                {t('buildingWaterUseIntensity')}
                {" "}
                <span className="italic !text-xs !font-light">gal/ft²/yr</span>
                    </>,
              property: 'buildingWaterUseIntensity',
            },
            { label: t('buildingEnvironmentalCompliance'), property: 'buildingEnvironmentalCompliance' },
            { label: t('buildingAirQuality'), property: 'buildingAirQuality' },
            { label: t('buildingAirQualityAssessmentDate'), property: 'buildingAirQualityAssessmentDate' },
            { label: t('airQualityReports'), property: 'buildingAirQualityReports' },
            { label: t('waterQualityReports'), property: 'buildingWaterQualityReports' },
            { label: t('buildingEnvironmentalAdditionalInformation'), property: 'buildingEnvironmentalAdditionalInformation' },
          ],
        },
      ],
    },
    {
      title: t('maintenanceData'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('buildingAssessmentRatingCondition'), property: 'buildingAssessmentRatingCondition' },
            { label: t('conditionRatingsDate'), property: 'conditionRatingsDate' },
            { label: t('buildingAssessmentDescription'), property: 'buildingAssessmentDescription' },
            { label: t('buildingMaintenanceRecords'), property: 'buildingMaintenanceRecords' },
            { label: t('buildingSystemAssessment'), property: 'buildingSystemAssessment' },
            { label: t('BCA'), property: 'buildingBCAs' },
            { label: t('contractReports'), property: 'buildingContractorReports' },
            { label: t('engineerAssessments'), property: 'buildingEngineeringAssessments' },
            { label: t('buildingMaintenanceAdditionalInformation'), property: 'buildingMaintenanceAdditionalInformation' },
          ],
        },
      ],
    },
    {
      title: t('financialData'),
      subsections: [
        {
          title: t('general'),
          fields: [
            {
              label: <>
                {t('buildingAssessedValue')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
                    </>,
              property: 'buildingAssessedValue',
            },
            {
              label: <>
                {t('buildingLifecycleExpenses')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
                    </>,
              property: 'buildingLifecycleExpenses',
            },
            {
              label: <>
                {t('buildingOperatingExpenses')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
                    </>,
              property: 'buildingOperatingExpenses',
            },
          ],
        },
        {
          title: t('funding'),
          fields: [
            { label: t('buildingFundingSources'), property: 'buildingFundingSources' },
            { label: t('buildingGrants'), property: 'buildingGrants' },
            { label: t('buildingSubsidies'), property: 'buildingSubsidies' },
            { label: t('buildingProponentOrganization'), property: 'buildingProponentOrganization' },
            { label: t('buildingProgramLoan'), property: 'buildingProgramLoan' },
            { label: t('buildingProponentType'), property: 'buildingProponentType' },
            { label: t('buildingProgramName'), property: 'buildingProgramName' },
            {
              label: <>
                {t('buildingTotalContribution')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
                    </>,
              property: 'buildingTotalContribution',
            },
            {
              label: <>
                {t('buildingValueOfFundingFlowed')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
                    </>,
              property: 'buildingValueOfFundingFlowed',
            },
            { label: t('buildingFundingAdditionalInformation'), property: 'buildingFundingAdditionalInformation' },
          ],
        },
      ],
    },
    {
      title: t('riskConsiderations'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('buildingStructuralVulnerabilities'), property: 'buildingStructuralVulnerabilities' },
            { label: t('buildingClimateVulnerabilities'), property: 'buildingClimateVulnerabilities' },
            { label: t('buildingSafetyConcerns'), property: 'buildingSafetyConcerns' },
            { label: t('buildingFireSafety'), property: 'buildingFireSafety' },
          ],
        },
      ],
    },
    {
      title: t('regulatoryCompliance'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('buildingOccupancyCertificate'), property: 'buildingOccupancyCertificate' },
            { label: t('buildingFireSafety'), property: 'buildingFireSafety' },
            { label: t('buildingEnvironmentalCompliance'), property: 'buildingEnvironmentalCompliance' },
            { label: t('buildingZoningCompliance'), property: 'buildingZoningCompliance' },
            { label: t('buildingPermitsIssued'), property: 'buildingPermitsIssued' },
          ],
        },
      ],
    },
  ]
}

export const useSiteHeaders = () => {
  // Translations
  const t = useTranslations('headers')

  return [
    {
      title: t('siteInformation'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('siteName'), property: 'siteName' },
            { label: t('siteAddress'), property: 'siteAddress' },
            { label: t('siteCountrySubdivision'), property: 'siteCountrySubdivision' },
            { label: t('siteMunicipality'), property: 'siteMunicipality' },
            { label: t('siteCity'), property: 'siteCity' },
            { label: t('sitePostalCode'), property: 'sitePostalCode' },
            { label: t('siteCounty'), property: 'siteCounty' },
            { label: t('siteWard'), property: 'siteWard' },
            { label: t('siteLandUse'), property: 'siteLandUse' },
            { label: t('siteLandUseSubtype'), property: 'siteLandUseSubtype' },

            {label: <>
                 {t('siteTotalArea')}
                {" "}
                <span className="italic !text-xs !font-light">m²</span>
              </>,
              property: 'siteTotalArea'  
            },
            {label: <>
                 {t('siteTotalBuiltArea')}
                {" "}
                <span className="italic !text-xs !font-light">m²</span>
              </>,
              property: 'siteTotalBuiltArea'  
            },
            {label: <>
                 {t('siteTotalAvailableArea')}
                {" "}
                <span className="italic !text-xs !font-light">m²</span>
              </>,
              property: 'siteTotalAvailableArea'  
            },

            { label: t('siteYearBuilt'), property: 'siteYearBuilt' },
            { label: t('siteZoning'), property: 'siteZoning' },
            { label: t('siteZoningCompliance'), property: 'siteZoningCompliance' },
          ],
        },
        {
          title: t('contactInformation'),
          fields: [
            { label: t('siteOwnership'), property: 'siteOwnership' },
            { label: t('siteProviderName'), property: 'siteProviderName' },
            { label: t('siteProviderType'), property: 'siteProviderType' },
            { label: t('siteProviderWebsite'), property: 'siteProviderWebsite' },
            { label: t('siteProviderContactName'), property: 'siteProviderContactName' },
            { label: t('siteProviderContactPhone'), property: 'siteProviderContactPhone' },
            { label: t('siteProviderContactEmail'), property: 'siteProviderContactEmail' },
            { label: t('siteWebsite'), property: 'siteWebsite' },
          ],
        },
        {
          title: t('additionalInformation'),
          fields: [
            { label: t('siteNotes'), property: 'siteNotes' },
          ],
        },
        {
          title: t('coordinates'),
          fields: [
            { label: t('siteLatitude'), property: 'siteLatitude' },
            { label: t('siteLongitude'), property: 'siteLongitude' },
          ],
        },
      ],
    },
    {
      title: t('associatedBuildings'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('associatedBuildings'), property: 'associatedBuildings' },
          ],
        },
      ],
    },
    {
      title: t('siteProjects'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('siteProjectName'), property: 'siteProjectName' },
            { label: t('siteProjectNumber'), property: 'siteProjectNumber' },
            { label: t('siteProjectPhase'), property: 'siteProjectPhase' },
            { label: t('siteProjectType'), property: 'siteProjectType' },
            { label: t('siteEstimatedStartDate'), property: 'siteEstimatedStartDate' },
            { label: t('siteEstimatedEndDate'), property: 'siteEstimatedEndDate' },
            { label: t('siteStartDate'), property: 'siteStartDate' },
            { label: t('siteCompletedDate'), property: 'siteCompletedDate' },
            { label: t('sitePriorityRetrofits'), property: 'sitePriorityRetrofits' },
            { label: t('siteProjectDescription'), property: 'siteProjectDescription' },
            { label: t('sitePreviousUpdates'), property: 'sitePreviousUpdates' },
          ],
        },
        {
          title: t('permits'),
          fields: [
            { label: t('siteBuilderName'), property: 'siteBuilderName' },
            { label: t('siteBuildingPermitsIssued'), property: 'siteBuildingPermitsIssued' },
            { label: t('sitePermitNumber'), property: 'sitePermitNumber' },
            { label: t('sitePermitIssuedDate'), property: 'sitePermitIssuedDate' },
          ],
        },
        {
          title: t('funding'),
          fields: [
            {
              label: 
              <>
                {t('siteEstimatedTotalCost')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
              </>,
              property: 'siteEstimatedTotalCost',
            },
            {
              label: 
              <>
                 {t('siteEstimatedConstructionCost')}
                 {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
              </>,
              property: 'siteEstimatedConstructionCost',
            },
            { label: t('siteRetrofitFundingNeeds'), property: 'siteRetrofitFundingNeeds' },
            {
              label: 
              <>
                {t('siteFederalContribution')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
              </>,
              property: 'siteFederalContribution',
            },
          ],
        },
      ],
    },
    {
      title: t('energyData'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('siteEnergyUsage'), property: 'siteEnergyUsage' },
            {
              label:
              <>
                {t('siteAnnualConsumption')}
                <span className="italic !text-xs !font-light"> kWh</span>
              </>,
              property: 'siteAnnualConsumption'
            },
            {
              label:
              <>
                {t('siteEnergyDemand')}
                <span className="italic !text-xs !font-light"> kW</span>
              </>,
              property: 'siteEnergyDemand'
            },
            {
              label:
              <>
                {t('siteEui')}
                <span className="italic !text-xs !font-light"> kBtu/ft²/year</span>
              </>,
              property: 'siteEui'
            },
           
            {
              label:
              <>
                {t('siteSourceEui')}
                <span className="italic !text-xs !font-light"> kBtu/ft²/year</span>
              </>,
              property: 'siteSourceEui'
            },
            { label: t('siteEnergyCodeCompliance'), property: 'siteEnergyCodeCompliance' },
            {
              label:
              <>
                {t('siteSolarPotential')}
                <span className="italic !text-xs !font-light"> kWh/kWp</span>
              </>,
              property: 'siteSolarPotential'
            },
            { label: t('siteRenewableEnergy'), property: 'siteRenewableEnergy' },
            { label: t('siteEnergyAdditionalInformation'), property: 'siteEnergyAdditionalInformation' },
          ],
        },
      ],
    },
    {
      title: t('environmentalData'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('siteTotalGhgEmissions'), property: 'siteTotalGhgEmissions' },
            { label: t('siteIntensityGhgEmissions'), property: 'siteIntensityGhgEmissions' },
            { label: t('siteCertifications'), property: 'siteCertifications' },
            { label: t('siteCertificationCertificates'), property: 'siteCertificationCertificates' },
            
            {
              label:
              <>
                {t('siteWaterUseIntensity')}
                {" "}
                <span className="italic !text-xs !font-light">(WUI) gal/ft²/yr</span>
              </>,
              property: 'siteWaterUseIntensity'
            },
            { label: t('siteEnvironmentalCompliance'), property: 'siteEnvironmentalCompliance' },
            { label: t('siteEnvironmentalAdditionalInformation'), property: 'siteEnvironmentalAdditionalInformation' },
          ],
        },
      ],
    },
    {
      title: t('maintenanceData'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('siteAssessmentCondition'), property: 'siteAssessmentCondition' },
            { label: t('siteAssessmentDate'), property: 'siteAssessmentDate' },
            { label: t('siteAssessmentDescription'), property: 'siteAssessmentDescription' },
            { label: t('siteMaintenanceRecords'), property: 'siteMaintenanceRecords' },
            { label: t('siteMaintenanceAdditionalInformation'), property: 'siteMaintenanceAdditionalInformation' },
          ],
        },
      ],
    },
    {
      title: t('financialData'),
      subsections: [
        {
          title: t('general'),
          fields: [
            {
              label: <>
                {t('siteAssessedValue')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
                    </>,
              property: 'siteAssessedValue',
            },
            {
              label: <>
                {t('siteLifecycleExpenses')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
                    </>,
              property: 'siteLifecycleExpenses',
            },
            {
              label: <>
                {t('siteOperatingExpenses')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
                    </>,
              property: 'siteOperatingExpenses',
            },
          ],
        },
        {
          title: t('funding'),
          fields: [
            { label: t('siteFundingSources'), property: 'siteFundingSources' },
            { label: t('siteGrants'), property: 'siteGrants' },
            { label: t('siteSubsidies'), property: 'siteSubsidies' },
            { label: t('siteProponentOrganization'), property: 'siteProponentOrganization' },
            { label: t('siteProgramLoan'), property: 'siteProgramLoan' },
            { label: t('siteProponentType'), property: 'siteProponentType' },
            { label: t('siteProgramName'), property: 'siteProgramName' },
            {
              label: <>
                {t('siteTotalContribution')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
                    </>,
              property: 'siteTotalContribution',
            },
            {
              label: <>
                {t('siteValueOfFundingFlowed')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
                    </>,
              property: 'siteValueOfFundingFlowed',
            },
            { label: t('siteFundingAdditionalInformation'), property: 'siteFundingAdditionalInformation' },
          ],
        },
      ],
    },
    {
      title: t('riskConsiderations'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('siteClimateVulnerabilities'), property: 'siteClimateVulnerabilities' },
            { label: t('siteSafetyConcerns'), property: 'siteSafetyConcerns' },
            { label: t('siteFireSafety'), property: 'siteFireSafety' },
          ],
        },
        {
          title: t('insurance'),
          fields: [
            { label: t('siteInsuranceProvider'), property: 'siteInsuranceProvider' },
            {
              label: <>
                {t('siteInsuranceCosts')}
                {" "}
                <span className="italic !text-xs !font-light">$CAD</span>
                    </>,
              property: 'siteInsuranceCosts',
            },
            { label: t('siteInsuranceClaims'), property: 'siteInsuranceClaims' },
          ],
        },
      ],
    },
    {
      title: t('regulatoryCompliance'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('siteFireCert'), property: 'siteFireCert' },
            { label: t('siteEnvironmentalCompliance'), property: 'siteEnvironmentalCompliance' },
            { label: t('siteZoningCompliance'), property: 'siteZoningCompliance' },
            { label: t('siteBuildingPermit'), property: 'siteBuildingPermit' },
          ],
        },
      ],
    },
  ]
}

export const useInfrastructureHeaders = () => {
  // Translations
  const t = useTranslations('headers');

  return [
    {
      title: t('infrastructureInformation'),
      subsections: [
        {
          title: t('general'),
          fields: [
            { label: t('infrastructureName'), property: 'infrastructureName' },
            { label: t('infrastructureType'), property: 'infrastructureType' },
            { label: t('infrastructureStatus'), property: 'infrastructureStatus' },
            { label: t('infrastructureState'), property: 'infrastructureState' },
            { label: t('infrastructureAddress'), property: 'infrastructureAddress' },
            { label: t('infrastructureCity'), property: 'infrastructureCity' },
            { label: t('infrastructureCountrySubdivision'), property: 'infrastructureCountrySubdivision' },
            { label: t('infrastructureMunicipality'), property: 'infrastructureMunicipality' },
            { label: t('infrastructureCounty'), property: 'infrastructureCounty' },
            { label: t('infrastructurePostalCode'), property: 'infrastructurePostalCode' },
            { label: t('infrastructureEmail'), property: 'infrastructureEmail' },
            { label: t('infrastructurePhoneNumber'), property: 'infrastructurePhoneNumber' },
            { label: t('infrastructureWebsite'), property: 'infrastructureWebsite' },
            { label: t('infrastructureDescription'), property: 'infrastructureDescription' },
            { label: t('infrastructureNotes'), property: 'infrastructureNotes' },
          ],
        },
      ],
    },
    {
      title: t('landInfra'),
      subsections: [
        {
          title: t('linearReferencing'),
          fields: [
            { label: t('linearLRMType'), property: 'linearLRMType' },
            { label: t('linearAlignmentType'), property: 'linearAlignmentType' },
            { 
              label: <>
                {t('linearMeasure')} <span className="italic !text-xs !font-light">(m/km)</span>
              </>, 
              property: 'linearMeasure' 
            },
            { label: t('linearStartValue'), property: 'linearStartValue' },
            { label: t('infrastructureMaterial'), property: 'infrastructureMaterial' },
            { label: t('infrastructureSurfaceType'), property: 'infrastructureSurfaceType' },
            { label: t('infrastructureSurfaceName'), property: 'infrastructureSurfaceName' },
            { label: t('infrastructureLongitude'), property: 'infrastructureLongitude' },
            { label: t('infrastructureLatitude'), property: 'infrastructureLatitude' },
            { label: t('infrastructureElevation'), property: 'infrastructureElevation' },
            { label: t('infrastructureSurveyDate'), property: 'infrastructureSurveyDate' },
          ],
        },
      ],
    },
    {
      title: t('ifcInformation'),
      subsections: [
        {
          title: t('ifcData'),
          fields: [
            { label: t('ifcGlobalId'), property: 'ifcGlobalId' },
            { label: t('ifcDomain'), property: 'ifcDomain' },
            { label: t('ifcRoadType'), property: 'ifcRoadType' },
            { label: t('ifcLaneCount'), property: 'ifcLaneCount' },
            { label: t('ifcDesignSpeed'), property: 'ifcDesignSpeed' },
            { label: t('ifcRailType'), property: 'ifcRailType' },
            { label: t('ifcTrackGauge'), property: 'ifcTrackGauge' },
            { label: t('ifcBridgePartType'), property: 'ifcBridgePartType' },
            { label: t('ifcBridgeClearance'), property: 'ifcBridgeClearance' },
            { label: t('ifcLoadRating'), property: 'ifcLoadRating' },
            { label: t('ifcUtilityType'), property: 'ifcUtilityType' },
            { label: t('ifcVoltage'), property: 'ifcVoltage' },
            { label: t('ifcFacilityPartType'), property: 'ifcFacilityPartType' },
          ],
        },
      ],
    },
    {
      title: t('cityGmlInformation'),
      subsections: [
        {
          title: t('cityGmlData'),
          fields: [
            { label: t('cityGmlName'), property: 'cityGmlName' },
            { label: t('cityGmlLod'), property: 'cityGmlLod' },
            { label: t('cityGmlFunction'), property: 'cityGmlFunction' },
            { label: t('cityGmlUsage'), property: 'cityGmlUsage' },
            { label: t('cityGmlCondition'), property: 'cityGmlCondition' },
            { label: t('cityGmlMeasuredHeight'), property: 'cityGmlMeasuredHeight' },
            { label: t('cityGmlConstructionDate'), property: 'cityGmlConstructionDate' },
            { label: t('cityGmlDemolitionDate'), property: 'cityGmlDemolitionDate' },
            { label: t('cityGmlVegetationType'), property: 'cityGmlVegetationType' },
            { label: t('cityGmlFurnitureType'), property: 'cityGmlFurnitureType' },
            { label: t('cityGmlSurfaceMaterial'), property: 'cityGmlSurfaceMaterial' },
            { label: t('cityGmlIsTrafficSpace'), property: 'cityGmlIsTrafficSpace' },
          ],
        },
      ],
    },
  ];
};
