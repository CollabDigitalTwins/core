import type { Building } from '../../../../types/dbTypes'
import {
  BuildingAssessmentConditions,
  BuildingGeometryStyle,
  BuildingProjectPhase,
  BuildingProjectType,
  BuildingHeatingEnergySource,
  BuildingCoolingEnergySource,
  BuildingHotWaterEnergySource,
  BuildingOccupantType,
  BuildingManagementType,
  BuildingElectricityServiceSize,
  BuildingElectricityServiceLocation,
} from '../../../../types/dbTypes'

/**
 * Building schema template with example values for CSV export
 * This serves as a reference for users importing building data
 */
export const buildingSchemaTemplate: Record<string, string> = {
  // IDs and References
  id: '1',
  buildingParentSiteId: '5',
  featureId: 'building_001',
  buildingOsmId: '123456789',
  
  // Basic Information
  buildingName: 'Example Residential Building',
  buildingAddress: '123 Main Street, Ottawa, ON K1A 0B1',
  buildingAnchorAddress: '123 Main Street, Ottawa, ON K1A 0B1',
  buildingStreetNumber: '123',
  buildingStreetName: 'Main',
  buildingStreetType: 'Street',
  buildingStreetDirection: 'N',
  buildingCountrySubdivision: 'CA-ON',
  buildingMunicipality: 'Ottawa',
  buildingCity: 'Ottawa',
  buildingPostalCode: 'K1A 0B1',
  buildingCounty: 'Ottawa County',
  buildingWardName: 'Somerset',
  buildingWardNumber: '14',
  
  // Contact Information
  buildingEmail: 'building@example.com',
  buildingPhoneNumber: '613-555-0100',
  buildingWebsite: 'https://example.com',
  
  // Building Characteristics
  buildingType: 'Multi-Unit Residential Building',
  buildingGeometryStyle: BuildingGeometryStyle.Complex,
  buildingStoreyNum: '4',
  buildingTotalSqft: '25000',
  buildingMaterials: 'Brick',
  buildingYearBuilt: '1985',
  buildingZoning: 'R4',
  
  // Coordinates and Location
  buildingLongitude: '-75.6972',
  buildingLatitude: '45.4215',
  buildingElevation: '70',
  buildingEasting: '446800',
  buildingNorthing: '5031000',
  buildingEPSG: '2951',
  buildingOrthogonalHeight: '12',
  rotation: '0',
  
  // Amenities (boolean fields - use TRUE/FALSE)
  buildingParkingAvailable: 'TRUE',
  buildingElevatorAvailable: 'TRUE',
  buildingDryerAvailable: 'FALSE',
  buildingWasherAvailable: 'TRUE',
  buildingCommonSpace: 'TRUE',
  
  // Utilities Included (boolean fields)
  buildingHeatingIncluded: 'TRUE',
  buildingHydroIncluded: 'FALSE',
  buildingWaterIncluded: 'TRUE',
  buildingUtilitiesIncluded: 'FALSE',
  
  // Unit Information - Bachelor Units
  buildingUnitsB: 'TRUE',
  buildingUnitsBNum: '2',
  buildingUnitsBSqft: '450',
  
  // Unit Information - 1 Bedroom
  buildingUnits1B: 'TRUE',
  buildingUnits1BNum: '10',
  buildingUnits1BSqft: '700',
  
  // Unit Information - 2 Bedroom
  buildingUnits2B: 'TRUE',
  buildingUnits2BNum: '8',
  buildingUnits2BSqft: '950',
  
  // Unit Information - 3 Bedroom
  buildingUnits3B: 'TRUE',
  buildingUnits3BNum: '5',
  buildingUnits3BSqft: '1150',
  
  // Unit Information - 4 Bedroom
  buildingUnits4B: 'FALSE',
  buildingUnits4BNum: '0',
  buildingUnits4BSqft: '',
  
  // Unit Information - 5 Bedroom
  buildingUnits5B: 'FALSE',
  buildingUnits5BNum: '0',
  buildingUnits5BSqft: '',
  
  // Unit Information - 6 Bedroom
  buildingUnits6B: 'FALSE',
  buildingUnits6BNum: '0',
  buildingUnits6BSqft: '',
  
  // Unit Types - Market Rent
  buildingUnitsMarketRent: 'TRUE',
  buildingUnitsMarketRentNum: '15',
  buildingUnitsMarketRentSqft: '850',
  
  // Unit Types - Accessible/Modified
  buildingUnitsModified: 'TRUE',
  buildingUnitsModifiedNum: '3',
  buildingUnitsModifiedSqft: '750',
  
  // Unit Types - Room Units
  buildingUnitsRoom: 'FALSE',
  buildingUnitsRoomNum: '0',
  buildingUnitsRoomSqft: '',
  
  // Unit Types - Subsidized
  buildingUnitsSubsidized: 'TRUE',
  buildingUnitsSubsidizedNum: '5',
  buildingUnitsSubsidizedSqft: '700',
  
  // Unit Types - Below Market Rent
  buildingUnitsBelowMarketRent: 'TRUE',
  buildingUnitsBelowMarketRentNum: '3',
  buildingUnitsBelowMarketRentSqft: '750',
  
  // Unit Types - Rent Geared to Income
  buildingUnitsRentGearedToIncome: 'TRUE',
  buildingUnitsRentGearedToIncomeNum: '2',
  buildingUnitsRentGearedToIncomeSqft: '650',
  
  // Unit Totals
  buildingUnitsTotal: '25',
  buildingTotalRentableArea: '18750',
  buildingUnitAdditionalInformation: 'All units include in-suite laundry hookups',
  
  // Provider Information
  buildingProviderName: 'Example Property Management',
  buildingProviderType: 'Property Management Company',
  buildingProviderWebsite: 'https://provider.example.com',
  buildingProviderContactName: 'John Smith',
  buildingProviderContactPhone: '613-555-0101',
  buildingProviderContactEmail: 'contact@provider.example.com',
  
  // Management Information
  buildingManagementType: BuildingManagementType.External,
  buildingManagementName: 'ABC Management Inc.',
  buildingManagementContactName: 'Jane Doe',
  buildingManagementWebsite: 'https://management.example.com',
  buildingManagementPhoneNumber: '613-555-0102',
  
  // Occupant Information
  buildingOccupantType: BuildingOccupantType.Families,
  buildingRentalMarketSurveyZone: '12',
  buildingCensusTract: '5050032.01',
  
  // Assessment Information
  buildingAssessmentCondition: BuildingAssessmentConditions.Good,
  buildingAssessmentDate: '2023-06-15',
  buildingAssessmentDescription: 'Annual building condition assessment',
  buildingAssessedValue: '3500000',
  
  // Energy Information
  buildingHeatingEnergySources: BuildingHeatingEnergySource.Natural_Gas,
  buildingHeatingMetric: '85000',
  buildingHeatingInstallationYear: '2015',
  buildingCoolingEnergySources: BuildingCoolingEnergySource.Electric,
  buildingCoolingMetric: '45000',
  buildingCoolingInstallationYear: '2015',
  buildingHotWaterSystemsEnergySources: BuildingHotWaterEnergySource.Natural_Gas,
  buildingHotWaterSystemsMetric: '25000',
  buildingHotWaterSystemsInstallationYear: '2015',
  buildingEnergyAdditionalInformation: 'Energy audit completed in 2022',
  buildingAnnualConsumption: '125000',
  buildingSourceEui: '180',
  buildingSiteEui: '165',
  buildingSolarPotential: '75000',
  buildingHvacEfficiency: 'SEER 16',
  
  // Electricity Service
  buildingElectricityServiceSize: BuildingElectricityServiceSize.Size_200,
  buildingElectricityServiceLocation: BuildingElectricityServiceLocation.Overhead,
  buildingElectricityServicePanelSize: '200',
  buildingElectricityServiceUtilityConnection: 'Hydro Ottawa',
  buildingElectricityServiceUpgradeHistory: 'Panel upgraded in 2010',
  
  // Environmental Information
  buildingAirQuality: '85',
  buildingAirQualityAssessmentDate: '2023-03-20',
  buildingTotalGhgEmissions: '150',
  buildingIntensityGhgEmissions: '30',
  buildingWaterUseIntensity: '45',
  buildingCertifications: 'LEED Silver',
  buildingComfort: 'Temperature and humidity controlled',
  buildingEnvironmentalAdditionalInformation: 'Low-flow fixtures installed throughout',
  
  // Project Information
  buildingProjectPhase: BuildingProjectPhase.Operations_Phase,
  buildingProjectType: BuildingProjectType.Renovation,
  buildingProjectName: 'Energy Efficiency Upgrade 2024',
  buildingProjectNumber: '2024001',
  buildingProjectDescription: 'Comprehensive energy efficiency retrofit including HVAC and envelope improvements',
  buildingEstimatedStartDate: '2024-04-01',
  buildingEstimatedEndDate: '2024-10-31',
  buildingStartDate: '2024-04-15',
  buildingCompletedDate: '',
  buildingBuilderName: 'ABC Construction Ltd.',
  previousUpdates: 'Roof replacement 2018, Window replacement 2020',
  
  // Financial Information
  buildingLifecycleExpenses: '250000',
  buildingOperatingExpenses: '125000',
  buildingEstimatedTotalCost: '500000',
  buildingEstimatedConstructionCost: '450000',
  buildingFundingSources: 'Federal Green Building Fund',
  buildingGrants: '150000',
  buildingSubsidies: '75000',
  buildingFederalContribution: '150000',
  buildingTotalContribution: '225000',
  buildingValueOfFundingFlowed: '200000',
  buildingProponentOrganization: 'Example Housing Corporation',
  buildingProgramLoan: '100000',
  buildingProponentType: 'Non-Profit',
  buildingProgramName: 'Green Retrofit Program',
  buildingRetrofitFundingNeeds: 'Additional funding needed for solar panels',
  buildingFundingAdditionalInformation: 'Application submitted for additional provincial funding',
  
  // Maintenance
  buildingMaintenanceAdditionalInformation: 'Regular monthly inspections and preventive maintenance program in place',
  buildingPriorityRetrofits: 'Solar panel installation, improved insulation',
  
  // Risk and Safety
  buildingStructuralVulnerabilities: 'Minor foundation settling in southwest corner',
  buildingClimateVulnerabilities: 'Flooding risk in basement during extreme rainfall events',
  buildingSafetyConcerns: 'Emergency lighting to be updated',
  
  // Permits and Compliance
  buildingPermitNumber: '2024-B-001234',
  buildingPermitIssuedDate: '2024-03-15',
  buildingOwnership: 'Example Housing Corporation',
  buildingAdditionalInformation: 'Building has undergone several major renovations',
  buildingNotes: 'Historic building with heritage designation considerations',
}

/**
 * Get all building field names in consistent order
 */
export function getBuildingFieldNames(): string[] {
  return Object.keys(buildingSchemaTemplate)
}

/**
 * Get example value for a building field
 */
export function getBuildingFieldExample(fieldName: string): string {
  return buildingSchemaTemplate[fieldName] || ''
}