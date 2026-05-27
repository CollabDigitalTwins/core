import { CountrySubdivision } from './datasetTypes';
import { Position } from './global'

export enum BuildingOccupantType  {Adults = 'Adults', Families = 'Families', Seniors = 'Seniors', Seniors_50_Plus = 'Seniors_50_Plus', Seniors_55_Plus = 'Seniors_55_Plus', Seniors_65_Plus = 'Seniors_65_Plus', Seniors_60_Plus = 'Seniors_60_Plus', Indigenous_Families = 'Indigenous_Families', Youth = 'Youth', Adults_16_Plus = 'Adults_16_Plus', Adults_16_To_24 = 'Adults_16_To_24', Singles = 'Singles', Families_Single_Parents = 'Families_Single_Parents', Indigenous = 'Indigenous'}
export enum BuildingGeometryStyle  {Complex = 'Complex', Simple = 'Simple', Apartment = 'Apartment'}
export enum BuildingAssessmentConditions  {Excellent = 'Excellent', Good = 'Good', Fair = 'Fair', Poor = 'Poor'}
export enum BuildingProjectPhase  {Inception_Phase = 'Inception_Phase', Conceptualization_Phase = 'Conceptualization_Phase', Criteria_Definition_Phase = 'Criteria_Definition_Phase', Design_Phase = 'Design_Phase', Coordination_Phase = 'Coordination_Phase', Implementation_Phase = 'Implementation_Phase', Handover_Phase = 'Handover_Phase', Operations_Phase = 'Operations_Phase'}
export enum BuildingProjectType  {Modification = 'Modification', New_Build = 'New_Build', Renovation = 'Renovation', Repair = 'Repair', Operation_Maintenance = 'Operation_Maintenance', Retrofit = 'Retrofit'}
export enum BuildingManagementType  {Internal = 'Internal', External = 'External', Municipal = 'Municipal', Private = 'Private'}
export enum BuildingHeatingEnergySource  {Gas = 'Gas', Propane = 'Propane', Electric_BB = 'Electric_BB', Oil = 'Oil', Electric = 'Electric', Natural_Gas = 'Natural_Gas', Solar = 'Solar', Wind = 'Wind', Geothermal = 'Geothermal', District_Heating = 'District_Heating'}
export enum BuildingCoolingEnergySource  {Electric = 'Electric', Wind = 'Wind', Geothermal = 'Geothermal', District_Cooling = 'District_Cooling', Solar = 'Solar'}
export enum BuildingHotWaterEnergySource  {Electric = 'Electric', Natural_Gas = 'Natural_Gas', Propane = 'Propane', Oil = 'Oil', Solar = 'Solar', Wind = 'Wind'}
export enum BuildingElectricityServiceSize  {Size_60 = 'Size_60', Size_100 = 'Size_100', Size_200 = 'Size_200'}
export enum BuildingElectricityServiceLocation  {Overhead = 'Overhead', Underhead = 'Underhead'}
export enum BuildingEnergySource  {Gas = 'Gas', Propane = 'Propane', Electric_BB = 'Electric_BB', Oil = 'Oil', Electric = 'Electric', Natural_Gas = 'Natural_Gas', Solar = 'Solar', Wind = 'Wind', Geothermal = 'Geothermal', District_Heating = 'District_Heating'}

export enum SiteEnergySource  {Gas = 'Gas', Propane = 'Propane', Electric_BB = 'Electric_BB', Oil = 'Oil', Electric = 'Electric', Natural_Gas = 'Natural_Gas', Solar = 'Solar', Wind = 'Wind', Geothermal = 'Geothermal', District_Heating = 'District_Heating'}
export enum SiteAssessmentConditions  {Excellent = 'Excellent', Good = 'Good', Fair = 'Fair', Poor = 'Poor'}    
export enum SiteLandUse  {Residential = 'Residential', Industry_And_Business = 'Industry_And_Business', Mixed_Use = 'Mixed_Use', Special_Function_Area = 'Special_Function_Area', Monument = 'Monument', Dump = 'Dump', Mining = 'Mining', Park = 'Park', Cemetery = 'Cemetery', Sports_Leisure_and_Recreation = 'Sports_Leisure_and_Recreation', Open_Pit_Quarry = 'Open_Pit_Quarry', Road = 'Road', Railway = 'Railway', Airfield = 'Airfield', Shipping = 'Shipping', Track = 'Track', Square = 'Square', Grassland = 'Grassland', Agriculture = 'Agriculture', Forest = 'Forest', Grove = 'Grove', Heath = 'Heath', Moor = 'Moor', Marsh = 'Marsh', Untilled_Land = 'Untilled_Land', River = 'River', Standing_Waterbody = 'Standing_Waterbody', Harbour = 'Harbour', Sea = 'Sea'}
export enum SiteProjectPhase  {Inception_Phase = 'Inception_Phase', Conceptualization_Phase = 'Conceptualization_Phase', Criteria_Definition_Phase = 'Criteria_Definition_Phase', Design_Phase = 'Design_Phase', Coordination_Phase = 'Coordination_Phase', Implementation_Phase = 'Implementation_Phase', Handover_Phase = 'Handover_Phase', Operations_Phase = 'Operations_Phase'}
export enum SiteProjectType  {Modification = 'Modification', New_Build = 'New_Build', Renovation = 'Renovation', Repair = 'Repair', Operation_Maintenance = 'Operation_Maintenance', Retrofit = 'Retrofit'}
export enum DatasetGroup { Organizational = 'Organizational', Municipal = 'Municipal', National = 'National', Provincial = 'Provincial'}
export enum DataManagementSystem  {Ckan = 'Ckan', Arcgis = 'Arcgis', Opendatasoft = 'Opendatasoft', Socrata = 'Socrata', Other = 'Other'}
export enum ViewerNames  {auth = 'auth', map = 'map', bim = 'bim', pointcloud = 'pointcloud', buildings = 'buildings', sites = 'sites', files = 'files', land = 'land', infrastructure = 'infrastructure', extensions = 'extensions', settings = 'settings', users= 'users'}
export enum SensorTypes  {Temperature = 'Temperature', Light = 'Light', Humidity = 'Humidity', Energy_Consumption = 'Energy_Consumption', Movement = 'Movement', Air_Quality = 'Air_Quality', Atmospheric_Pressure = 'Atmospheric_Pressure', Irradiance = 'Irradiance', Flow = 'Flow', State = 'State', Noise_Level = 'Noise_Level'}
export enum SensorDataFormat  {Csv = 'Csv', Json = 'Json'}

export enum InfrastructureType {LandFeature = 'LandFeature', Facility = 'Facility', Project = 'Project', Alignment = 'Alignment', Road = 'Road', Railway = 'Railway', Survey = 'Survey', LandDivision = 'LandDivision', Condominium = 'Condominium', Other = 'Other'}
export enum InfrastructureState {Existing = 'Existing', Proposed = 'Proposed', Planned = 'Planned', UnderConstruction = 'UnderConstruction', Abandoned = 'Abandoned', Demolished = 'Demolished'}
export enum LinearSide {Left = 'Left', Right = 'Right', Center = 'Center', Both = 'Both', Neither = 'Neither', Unspecified = 'Unspecified'}
export enum LinearReferencingType {Absolute = 'Absolute', Relative = 'Relative', Interpolative = 'Interpolative'}
export enum GeometryType {Point = 'Point', LineString = 'LineString', PolyfaceMesh = 'PolyfaceMesh', Curve = 'Curve'}
export enum SurfaceType {TIN = 'TIN', Grid = 'Grid', Breaklines = 'Breaklines'}
export enum IfcInfrastructureDomain {IfcRoad = 'IfcRoad', IfcRailway = 'IfcRailway', IfcBridge = 'IfcBridge', IfcMarineFacility = 'IfcMarineFacility', IfcWaterway = 'IfcWaterway', IfcGeotechnicalAssembly = 'IfcGeotechnicalAssembly',}
export enum IfcRoadType {Highway = 'Highway', Street = 'Street', Interchange = 'Interchange', BicycleWay = 'BicycleWay', Footway = 'Footway', NotDefined = 'NotDefined'}
export enum IfcRailType {HeavyRail = 'HeavyRail', LightRail = 'LightRail', Subway = 'Subway', Tram = 'Tram', Monorail = 'Monorail', RackRail = 'RackRail'}
export enum IfcTrackComponentType {Track = 'Track', Sleeper = 'Sleeper', Ballast = 'Ballast', Frog = 'Frog', Sleepers = 'Sleepers', Block = 'Block'}
export enum IfcBridgePartType {Abutment = 'Abutment', Deck = 'Deck', Pier = 'Pier', Pylon = 'Pylon', Superstructure = 'Superstructure', Substructure = 'Substructure'}
export enum IfcGeotechType { Borehole = 'Borehole', Earthwork = 'Earthwork', RockTunnel = 'RockTunnel' }
export enum IfcSignalType { TrafficLight = 'TrafficLight', RailSignal = 'RailSignal', Sign = 'Sign', Panel = 'Panel' }
export enum IfcSensorType { TrafficSensor = 'TrafficSensor', WeatherSensor = 'WeatherSensor', SecurityCamera = 'SecurityCamera' }
export enum IfcUtilityType { PowerLine = 'PowerLine', Telecom = 'Telecom', Stormwater = 'Stormwater', Sewage = 'Sewage', Gas = 'Gas', DuctBank = 'DuctBank' }
export enum IfcEarthworksType { Cut = 'Cut', Fill = 'Fill', Embankment = 'Embankment', Subgrade = 'Subgrade' }
export enum IfcFacilityPartType { Segment = 'Segment', Junction = 'Junction', LevelCrossing = 'LevelCrossing', Terminal = 'Terminal' }
export enum CityGmlLod { LOD0 = 'LOD0', LOD1 = 'LOD1', LOD2 = 'LOD2', LOD3 = 'LOD3', LOD4 = 'LOD4' }
export enum CityGmlFunction { Traffic = 'Traffic', WaterBody = 'WaterBody', SolitaryVegetation = 'SolitaryVegetation', PlantCover = 'PlantCover', CityFurniture = 'CityFurniture', LandUse = 'LandUse' }
export enum CityGmlUsage { Public = 'Public', Private = 'Private', Industrial = 'Industrial', Commercial = 'Commercial', Government = 'Government', Military = 'Military' }
export enum CityGmlFurnitureType { TrafficLight = 'TrafficLight', TrafficSign = 'TrafficSign', StreetLamp = 'StreetLamp', BusStop = 'BusStop', Bench = 'Bench', WasteBin = 'WasteBin', Bollard = 'Bollard' }
export enum CityGmlVegetationType { Tree = 'Tree', Shrub = 'Shrub', Hedge = 'Hedge', Grass = 'Grass' }
export enum CityGmlCondition { Intact = 'Intact', UnderConstruction = 'UnderConstruction', Declined = 'Declined', Demolished = 'Demolished', Ruin = 'Ruin' }
export enum CityGmlElevationRef { Bottom = 'Bottom', Ground = 'Ground', Eaves = 'Eaves', Top = 'Top' }
export enum CityGmlSurfaceMaterial { Asphalt = 'Asphalt', Concrete = 'Concrete', Gravel = 'Gravel', Soil = 'Soil', Grass = 'Grass', PavingStones = 'PavingStones' }
export enum CityGmlTrafficSurfaceFunction { DrivingLane = 'DrivingLane', CycleLane = 'CycleLane', Sidewalk = 'Sidewalk', ParkingBay = 'ParkingBay', Crosswalk = 'Crosswalk', TrafficIsland = 'TrafficIsland', Embankment = 'Embankment' }
export enum Language { En = 'En', Fr = 'Fr', Es = 'Es' }


export interface User {
    id: number;
    name: string;
    password: string;
    email: string;
    emailVerified?: Date | null;   
    imageFileId?: number | null;
    createdAt: Date; 
    updatedAt: Date;               
    organizationId?: number | null;
    roleId: number;
}

export interface Role {
    id: number;
    name: string;
    permissions: unknown[];        // Prisma Json[]; keep as unknown[] in core
    orgId: number;
}

export type Permission = {
  action: string;
  subject: string;
  description?: string;
};

export interface Account {
    id: number;
    type: string;
    provider: string;
    providerAccountId: string;
    refresh_token?: string | null;
    access_token?: string | null;
    expires_at?: number | null;
    token_type?: string | null;
    scope?: string | null;
    id_token?: string | null;
    session_state?: string | null;
    createdAt: Date;
    updatedAt: Date;
    userId: number;
}

export interface Organization {
    id: number;
    name: string;
    title?: string | null;
    description?: string | null;
    geocoder: boolean;
    mainColor?: string | null;
    secondaryColor?: string | null;
    locationId?: string | null;
    countrySubdivision?: string | null; // CA-ON, US-NY, etc.
    municipality?: string | null;
    postalCode?: string | null;
    lat?: number | null;
    long?: number | null;
    zoom?: number | null;
    bbox: number[]
    bearing?: number | null;
    pitch?: number | null;
    mapStyles: unknown[]; // Json[] in Prisma, keep as unknown[] in core
    minZoom?: number | null;
    maxBounds: number[]
    appContent: (ViewerNames | `${ViewerNames}`)[]
    logoKey?: string | null;
    faviconKey?: string | null;
    maxNumberOfUsers?: number | null;
    languages: (Language | `${Language}`)[];
    country?: string | null;
    locationSiteId?: number | null;
    locationBuildingId?: number | null;
}

export interface BuildingOnOrganizations {
    buildingId: number;
    organizationId: number;
}

export interface Comment {
    id: number;
    authorId: number;
    organizationId: number;
    text: string;
    longitude?: number | null;
    latitude?: number | null;
    elevation?: number | null;
    visible: boolean;
    viewer: ViewerNames | `${ViewerNames}`;
    x?: number | null;
    y?: number | null;
    z?: number | null;
    createdAt: Date;
    updatedAt: Date;
    image?: string | null;
    replyToId?: number | null;
    buildingId?: number | null;
}

export interface Sensor {
    id: number;
    data: string;
    dataFormat: SensorDataFormat | `${SensorDataFormat}`;
    updateFrequency: number;
    name: string;
    longitude?: number | null;
    latitude?: number | null;
    elevation?: number | null;
    visible: boolean;
    viewer: ViewerNames | `${ViewerNames}`;
    x?: number | null;
    y?: number | null;
    z?: number | null;
    createdAt: Date;
    updatedAt: Date;
    url?: string | null;
    tags: string[];
    maxThreshold?: number | null;
    minThreshold?: number | null;
    typeId?: number | null;
    organizationId: number;
    buildingId?: number | null;
    authorId: number;
}

export interface SensorType {
    id: number;
    name: SensorTypes | `${SensorTypes}`;
    icon: string;
    minValue: number;
    maxValue: number;
    minColour: string;
    midColour: string;
    maxColour: string;
}

export interface Building {
    id: number                          
    buildingEmail?: string
    buildingPhoneNumber?: string
    buildingAddress?: string
    buildingStreetNumber?: string
    buildingStreetName?: string
    buildingStreetType?: string
    buildingStreetDirection?: string
    buildingCountrySubdivision?: string
    buildingMunicipality?: string
    buildingPostalCode?: string
    buildingType: string[]
    buildingLongitude?: number
    buildingLatitude?: number
    rotation?: number
    buildingElevation?: number
    buildingEasting?: number
    buildingNorthing?: number
    buildingEPSG?: number
    buildingName?: string
    buildingNotes?: string
    buildingWebsite?: string
    buildingHeatingIncluded?: boolean
    buildingHydroIncluded?: boolean
    buildingProviderContactEmail?: string
    buildingProviderContactName?: string
    buildingProviderContactPhone?: string
    buildingProviderName?: string
    buildingProviderType?: string
    buildingProviderWebsite?: string
    buildingOccupantType: (BuildingOccupantType | `${BuildingOccupantType}`)[]
    buildingStoreyNum?: number
    buildingTotalSqft?: number
    buildingUnits1B?: boolean
    buildingUnits1BNum?: number
    buildingUnits1BSqft: number[]
    buildingUnits2B?: boolean
    buildingUnits2BNum?: number
    buildingUnits2BSqft: number[]
    buildingUnits3B?: boolean
    buildingUnits3BNum?: number
    buildingUnits3BSqft: number[]
    buildingUnits4B?: boolean
    buildingUnits4BNum?: number
    buildingUnits4BSqft: number[]
    buildingUnits5B?: boolean
    buildingUnits5BNum?: number
    buildingUnits5BSqft: number[]
    buildingUnits6B?: boolean
    buildingUnits6BNum?: number
    buildingUnits6BSqft: number[]
    buildingUnitsB?: boolean
    buildingUnitsBNum?: number
    buildingUnitsBSqft: number[]
    buildingUnitsMarketRent?: boolean
    buildingUnitsMarketRentNum?: number
    buildingUnitsMarketRentSqft: number[]
    buildingUnitsModified?: boolean
    buildingUnitsModifiedNum?: number
    buildingUnitsModifiedSqft: number[]
    buildingUnitsRoom?: boolean
    buildingUnitsRoomNum?: number
    buildingUnitsRoomSqft: number[]
    buildingUnitsSubsidized?: boolean
    buildingUnitsSubsidizedNum?: number
    buildingUnitsSubsidizedSqft: number[]
    buildingUnitsBelowMarketRent?: boolean
    buildingUnitsBelowMarketRentNum?: number
    buildingUnitsBelowMarketRentSqft: number[]
    buildingUnitsRentGearedToIncome?: boolean
    buildingUnitsRentGearedToIncomeNum?: number
    buildingUnitsRentGearedToIncomeSqft: number[]
    buildingUnitsTotal?: number
    buildingUtilitiesIncluded?: boolean
    buildingYearBuilt?: number
    buildingAnchorAddress?: string
    buildingGeometryStyle?: BuildingGeometryStyle | `${BuildingGeometryStyle}`
    buildingCommonSpace?: boolean
    buildingAirQuality?: number
    buildingAirQualityAssessmentDate?: Date
    buildingAnnualConsumption?: number
    buildingAssessedValue?: number
    buildingBuilderName?: string
    buildingAdditionalInformation?: string
    buildingAssessmentCondition?: BuildingAssessmentConditions | `${BuildingAssessmentConditions}`
    buildingAssessmentDate?: Date
    buildingAssessmentDescription?: string
    buildingCity?: string
    buildingCounty?: string
    buildingOrthogonalHeight?: number
    buildingOsmId?: string
    buildingOsmType?: string
    buildingProjectPhase?: BuildingProjectPhase | `${BuildingProjectPhase}`
    buildingProjectType?: BuildingProjectType | `${BuildingProjectType}`
    buildingSourceEui?: number
    buildingWardName?: string
    buildingWardNumber?: number
    buildingManagementType?: BuildingManagementType | `${BuildingManagementType}`
    buildingManagementName?: string
    buildingManagementContactName?: string
    buildingManagementWebsite?: string
    buildingManagementPhoneNumber?: string
    buildingCensusTract?: number
    buildingCertifications?: string
    buildingClimateVulnerabilities?: string
    buildingComfort?: string
    buildingCompletedDate?: Date
    buildingDryerAvailable?: boolean
    buildingElevatorAvailable?: boolean
    buildingEnergyAdditionalInformation?: string
    buildingHeatingEnergySources: (BuildingHeatingEnergySource | `${BuildingHeatingEnergySource}`)[]
    buildingHeatingMetric?: number
    buildingHeatingInstallationYear?: number
    buildingCoolingEnergySources: (BuildingCoolingEnergySource | `${BuildingCoolingEnergySource}`)[]
    buildingCoolingMetric?: number
    buildingCoolingInstallationYear?: number
    buildingHotWaterSystemsEnergySources: (BuildingHotWaterEnergySource | `${BuildingHotWaterEnergySource}`)[]
    buildingHotWaterSystemsMetric?: number
    buildingHotWaterSystemsInstallationYear?: number
    buildingEnvironmentalAdditionalInformation?: string
    buildingEstimatedConstructionCost?: number
    buildingEstimatedEndDate?: Date
    buildingEstimatedStartDate?: Date
    buildingEstimatedTotalCost?: number
    buildingFederalContribution?: number
    buildingFundingAdditionalInformation?: string
    buildingFundingSources?: string
    buildingGrants?: number
    buildingHvacEfficiency?: string
    buildingElectricityServiceSize?: BuildingElectricityServiceSize | `${BuildingElectricityServiceSize}`
    buildingElectricityServiceLocation?: BuildingElectricityServiceLocation | `${BuildingElectricityServiceLocation}`
    buildingElectricityServicePanelSize?: number
    buildingElectricityServiceUtilityConnection?: string
    buildingElectricityServiceUpgradeHistory?: string
    buildingIntensityGhgEmissions?: number
    buildingLifecycleExpenses?: number
    buildingMaintenanceAdditionalInformation?: string
    buildingMaterials?: string
    buildingOperatingExpenses?: number
    buildingOwnership?: string
    buildingParkingAvailable?: boolean
    buildingPermitIssuedDate?: Date
    buildingPermitNumber?: number
    previousUpdates?: string
    buildingPriorityRetrofits?: string
    buildingProgramLoan?: number
    buildingProgramName?: string
    buildingProjectDescription?: string
    buildingProjectName?: string
    buildingProjectNumber?: number
    buildingProponentOrganization?: string
    buildingProponentType?: string
    buildingRentalMarketSurveyZone?: number
    buildingRetrofitFundingNeeds?: string
    buildingSafetyConcerns?: string
    buildingSiteEui?: number
    buildingSolarPotential?: number
    buildingStartDate?: Date
    buildingStructuralVulnerabilities?: string
    buildingSubsidies?: number
    buildingTotalContribution?: number
    buildingTotalGhgEmissions?: number
    buildingTotalRentableArea?: number
    buildingUnitAdditionalInformation?: string
    buildingValueOfFundingFlowed?: number
    buildingWasherAvailable?: boolean
    buildingWaterIncluded?: boolean
    buildingWaterUseIntensity?: number
    buildingZoning?: string
    featureId?: string | null
    buildingParentSiteId?: number | null
}

export interface DbFile {
  id: number
  name: string
  type: string
  url?: string | null
  assetId: string
  mimeType?: string | null
  extension?: string | null
  sizeBytes?: number | null
  uploadedAt: string
  description?: string | null
  tag?: string | null
  position?: Position
  x?: number | null
  y?: number | null
  z?: number | null
  lat?: number | null
  lng?: number | null
  elevation?: number | null
  rotation?: number | null
  isVisible?: boolean
  lazFileKey?: string | null
  potreeFolderKey?: string | null
  potreeMetadataFileKey?: string | null
  pointCloudUploaded?: boolean | null
  pointCloudPotreeConverted?: boolean | null
  fileCommentId?: number | null
  fileOrganizationId: number
  attachedFilesBuildingId?: number | null
  buildingCodeComplianceBuildingId?: number | null
  environmentalComplianceBuildingId?: number | null
  occupancyCertificateBuildingId?: number | null
  permitsIssuedBuildingId?: number | null
  systemAssessmentsBuildingId?: number | null
  zoningComplianceBuildingId?: number | null
  certificationsFileBuildingId?: number | null
  energyCodeComplianceBuildingId?: number | null
  fireSafetyBuildingId?: number | null
  maintenanceRecordsBuildingId?: number | null
  proximityToServicesBuildingId?: number | null
  regionalEnergyTrendsBuildingId?: number | null
  BCABuildingId?: number | null
  contractorReportsBuildingId?: number | null
  engineeringAssessmentsBuildingId?: number | null
  airQualityReportsBuildingId?: number | null
  waterQualityReportsBuildingId?: number | null
  DSRsBuildingId?: number | null
  energyAssessmentReportsBuildingId?: number | null
  attachedFilesSiteId?: number | null
  energyCodeComplianceSiteId?: number | null
  certificationCertificatesSiteId?: number | null
  environmentalComplianceSiteId?: number | null
  maintenanceRecordsSiteId?: number | null
  fireSafetySiteId?: number | null
  fireCertSiteId?: number | null
  zoningComplianceSiteId?: number | null
  buildingPermitSiteId?: number | null
  insuranceClaimsSiteId?: number | null
  buildingPermitsIssuedSiteId?: number | null
}

export interface Site {
    id: number
    siteName?: string
    siteAddress?: string
    siteCountrySubdivision?: string
    siteMunicipality?: string
    siteCity?: string
    sitePostalCode?: string
    siteCounty?: string
    siteWard?: string
    siteLongitude?: number
    siteLatitude?: number
    siteEnergyUsage?: SiteEnergySource | `${SiteEnergySource}`
    siteAnnualConsumption?: number
    siteEnergyDemand?: number
    siteSourceEui?: number
    siteEui?: number
    siteSolarPotential?: number
    siteRenewableEnergy?: string
    siteEnergyAdditionalInformation?: string
    siteTotalGhgEmissions?: number
    siteIntensityGhgEmissions?: number
    siteCertifications?: string
    siteWaterUseData?: number
    siteEnvironmentalAdditionalInformation?: string
    siteLifecycleExpenses?: number
    siteOperatingExpenses?: number
    siteFundingSources?: string
    siteGrants?: number
    siteSubsidies?: number
    siteProponentOrganization?: string
    siteProgramLoan?: number
    siteProponentType?: string
    siteProgramName?: string
    siteTotalContribution?: number
    siteValueOfFundingFlowed?: number
    siteFundingAdditionalInformation?: string
    siteAssessmentCondition?: SiteAssessmentConditions | `${SiteAssessmentConditions}`
    siteAssessmentDate?: Date
    siteAssessmentDescription?: string
    siteMaintenanceAdditionalInformation?: string
    siteClimateVulnerabilities?: string
    siteSafetyConcerns?: string
    siteInsuranceProvider?: string
    siteInsuranceCosts?: number
    siteLandUse?: SiteLandUse | `${SiteLandUse}`
    siteLandUseSubtype?: string
    siteTotalArea?: number
    siteTotalBuiltArea?: number
    siteTotalAvailableArea?: number
    siteYearBuilt?: Date
    siteZoning?: string
    siteOwnership?: string
    siteProviderName?: string
    siteProviderType?: string
    siteProviderWebsite?: string
    siteProviderContactName?: string
    siteProviderContactPhone?: string
    siteProviderContactEmail?: string
    siteWebsite?: string
    siteNotes?: string
    siteProjectName?: string
    siteProjectNumber?: number
    siteProjectPhase?: SiteProjectPhase | `${SiteProjectPhase}`
    siteProjectType?: SiteProjectType | `${SiteProjectType}`
    siteEstimatedStartDate?: Date
    siteEstimatedEndDate?: Date
    siteStartDate?: Date
    siteCompletedDate?: Date
    sitePriorityRetrofits?: string
    siteProjectDescription?: string
    sitePreviousUpdates?: string
    siteBuilderName?: string
    sitePermitNumber?: number
    sitePermitIssuedDate?: Date
    siteEstimatedTotalCost?: number
    siteEstimatedConstructionCost?: number
    siteRetrofitFundingNeeds?: string
    siteFederalContribution?: number
    siteAssessedValue?: number
    siteOrganizationId: number
}

export interface OpenDataPortal {
    id: number
    name: string
    group: DatasetGroup | `${DatasetGroup}`
    portalUrl?: string
    dataManagementSystem?: DataManagementSystem | `${DataManagementSystem}`
    apiUrl?: string
    countrySubdivision?: string
    municipality?: string
    country?: string
    live?: boolean
}

export interface Infrastructure {
    id: number
    featureId?: string
    infrastructureName?: string
    infrastructureType?: InfrastructureType | `${InfrastructureType}`
    infrastructureEmail?: string
    infrastructureCountrySubdivision?: string
    infrastructureMunicipality?: string
    infrastructureCity?: string
    infrastructureCounty?: string
    infrastructurePhoneNumber?: string
    infrastructureAddress?: string
    infrastructureStreetNumber?: string
    infrastructureStreetName?: string
    infrastructureStreetType?: string
    infrastructureStreetDirection?: string
    infrastructurePostalCode?: string
    infrastructureDescription?: string
    infrastructureDatasetId?: string
    infrastructureExternalId?: string // Mapped from ID.identifier
    infrastructureScope?: string // Mapped from ID.scope
    infrastructureProjectName?: string // Context from Part 0 Project
    infrastructureFacilityId?: string // Context from Part 0 Facility
    infrastructureState?: InfrastructureState | `${InfrastructureState}`
    infrastructureStatus?: string // Generic status string or CodeList URI
    infrastructureValidFrom?: Date
    infrastructureValidTo?: Date
    infrastructureGeometryId?: number // Reference to geometry in our Files table               
    infrastructureGeometryType?: GeometryType | `${GeometryType}` 
    infrastructureEPSG?: number
    infrastructureLongitude?: number
    infrastructureLatitude?: number
    infrastructureRotation?: number
    infrastructureElevation?: number
    infrastructureEasting?: number
    infrastructureNorthing?: number
    infrastructureNotes?: string
    infrastructureWebsite?: string // Coordinate Reference System
    linearMeasure?: number
    linearMeasureUom?: string // Unit of measure (e.g., "m", "km")
    linearStartValue?: number
    linearDefaultLRM?: string
    linearLRMType?: LinearReferencingType | `${LinearReferencingType}`
    linearHasStationEquation?: boolean
    linearRestartValue?: number // Value after the station equation
    linearIsAlignment?: boolean
    linearAlignmentType?: string // e.g., "Centerline", "LeftRail", "RightCurb"
    infrastructureMaterial?: string
    infrastructureLayerType?: string
    linearHasCrossSection?: boolean
    linearCrossSectionArea?: number
    linearCrossSectionAreaUom?: string
    linearMaxLateralOffset?: number // Furthest distance from centerline
    linearVerticalOffset?: number
    infrastructureSurfaceType?: SurfaceType | `${SurfaceType}`
    infrastructureTinId?: string // Reference to TIN geometry ID
    infrastructureSurfaceName?: string
    infrastructureSurveyDocumentId?: string
    infrastructureSurveyDate?: Date
    ifcGlobalId?: string
    ifcDomain?: IfcInfrastructureDomain | `${IfcInfrastructureDomain}`
    ifcRoadType?: IfcRoadType | `${IfcRoadType}`
    ifcLaneCount?: number
    ifcDesignSpeed?: number
    ifcRailType?: IfcRailType | `${IfcRailType}`
    ifcTrackGauge?: number
    ifcCant?: number
    ifcTrackComponentType?: IfcTrackComponentType | `${IfcTrackComponentType}`
    ifcBridgePartType?: IfcBridgePartType | `${IfcBridgePartType}`
    ifcBridgeClearance?: number
    ifcLoadRating?: number
    ifcGeotechType?: IfcGeotechType | `${IfcGeotechType}`
    ifcWaterDepth?: number
    ifcSignalType?: IfcSignalType | `${IfcSignalType}`
    ifcSensorType?: IfcSensorType | `${IfcSensorType}`
    ifcUtilityType?: IfcUtilityType | `${IfcUtilityType}`
    ifcUtilityDiameter?: number
    ifcVoltage?: number // For power lines
    ifcEarthworksType?: IfcEarthworksType | `${IfcEarthworksType}`
    ifcSlopeRatio?: number // e.g., 2:1 slope
    infrastructureParentId?: string // Recursive ID for nested parts (e.g. Bridge Span inside Bridge)
    ifcFacilityPartType?: IfcFacilityPartType | `${IfcFacilityPartType}`
    cityGmlLod?: CityGmlLod | `${CityGmlLod}`
    cityGmlFunction?: CityGmlFunction | `${CityGmlFunction}`
    cityGmlUsage?: CityGmlUsage | `${CityGmlUsage}`
    cityGmlRelativeToTerrain?: string
    cityGmlIsTrafficSpace?: boolean
    cityGmlTrafficGranularity?: string
    cityGmlVegetationType?: CityGmlVegetationType | `${CityGmlVegetationType}`
    cityGmlFurnitureType?: CityGmlFurnitureType | `${CityGmlFurnitureType}`
    cityGmlCrownDiameter?: number
    cityGmlName?: string
    cityGmlCondition?: CityGmlCondition | `${CityGmlCondition}`
    cityGmlConstructionDate?: Date
    cityGmlDemolitionDate?: Date
    cityGmlMeasuredHeight?: number
    cityGmlHeightRef?: CityGmlElevationRef | `${CityGmlElevationRef}`
    cityGmlSurfaceMaterial?: CityGmlSurfaceMaterial | `${CityGmlSurfaceMaterial}`
    cityGmlTrafficFunction?: CityGmlTrafficSurfaceFunction | `${CityGmlTrafficSurfaceFunction}`
    cityGmlIsAuxiliary?: boolean
    organizationId: number
}