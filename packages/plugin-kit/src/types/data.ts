// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// The platform records a plugin reads, as types. Core's own definitions live in
// `types/dbTypes.ts` and reach for `maplibre-gl`, `three` and `@turf/turf` through their
// imports, so restating the plugin-facing shape here is what keeps a plugin from
// installing a map or BIM library to typecheck a building list.
//
// Deliberately narrower than core: these are the fields the SDK commits to, not every
// column the schema carries. Core's `pluginKitSdkModules.test.ts` asserts at compile time
// that core still provides everything declared here, so a narrower shape passes and one
// promising a field core dropped fails. Widen a record when a plugin needs a field.

/** Mirrors core's `ViewerNames`, as the union the records carry. */
export type PluginViewerName =
  | 'auth' | 'map' | 'bim' | 'pointcloud' | 'buildings' | 'sites' | 'files'
  | 'land' | 'infrastructure' | 'extensions' | 'settings' | 'users'

export interface PluginBuilding {
  id: number
  buildingName?: string
  buildingAddress?: string
  buildingMunicipality?: string
  buildingCountrySubdivision?: string
  buildingPostalCode?: string
  buildingLongitude?: number
  buildingLatitude?: number
  buildingElevation?: number
  rotation?: number
  buildingType: string[]
  buildingStoreyNum?: number
  buildingTotalSqft?: number
  buildingNotes?: string
  buildingWebsite?: string
  buildingZoning?: string
  featureId?: string | null
  buildingParentSiteId?: number | null
}

export interface PluginSite {
  id: number
  siteName?: string
  siteAddress?: string
  siteMunicipality?: string
  siteCity?: string
  siteCountrySubdivision?: string
  sitePostalCode?: string
  siteLongitude?: number
  siteLatitude?: number
  siteNotes?: string
  siteWebsite?: string
  siteOrganizationId: number
}

export interface PluginInfrastructure {
  id: number
  featureId?: string
  infrastructureName?: string
  infrastructureType?: string
  infrastructureState?: string
  infrastructureStatus?: string
  infrastructureAddress?: string
  infrastructureMunicipality?: string
  infrastructureCountrySubdivision?: string
  infrastructureDescription?: string
}

export interface PluginOrganization {
  id: number
  name: string
  title?: string | null
  description?: string | null
  countrySubdivision?: string | null
  municipality?: string | null
  lat?: number | null
  long?: number | null
  zoom?: number | null
  country?: string | null
}

export interface PluginFile {
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
  x?: number | null
  y?: number | null
  z?: number | null
  lat?: number | null
  lng?: number | null
  elevation?: number | null
  isVisible?: boolean
  fileOrganizationId: number
}

export interface PluginSensor {
  id: number
  name: string
  data: string
  dataFormat: 'Csv' | 'Json'
  updateFrequency: number
  longitude?: number | null
  latitude?: number | null
  elevation?: number | null
  visible: boolean
  viewer: PluginViewerName
  x?: number | null
  y?: number | null
  z?: number | null
  createdAt: Date
  updatedAt: Date
  url?: string | null
  tags: string[]
  maxThreshold?: number | null
  minThreshold?: number | null
  typeId?: number | null
  organizationId: number
  buildingId?: number | null
  authorId: number
}

export interface PluginSensorType {
  id: number
  name: string
  icon: string
  minValue: number
  maxValue: number
  minColour: string
  midColour: string
  maxColour: string
}

export interface PluginComment {
  id: number
  authorId: number
  organizationId: number
  text: string
  longitude?: number | null
  latitude?: number | null
  elevation?: number | null
  visible: boolean
  viewer: PluginViewerName
  x?: number | null
  y?: number | null
  z?: number | null
  createdAt: Date
  updatedAt: Date
  replyToId?: number | null
  buildingId?: number | null
  image?: string | null
}

/** Every read hook resolves to one of these, keyed by the name it uses for the payload. */
export interface PluginQuery {
  isLoading: boolean
  /** Whatever the fetch threw. Truthy means the read failed. */
  isError: unknown
}

export interface PluginBuildingsQuery extends PluginQuery { buildings: PluginBuilding[] }
export interface PluginBuildingQuery extends PluginQuery { building: PluginBuilding | null }
export interface PluginBuildingOsmIdsQuery extends PluginQuery { osmIds: number[] }
export interface PluginSitesQuery extends PluginQuery { sites: PluginSite[] }
export interface PluginSiteQuery extends PluginQuery { site: PluginSite | null }
export interface PluginInfrastructuresQuery extends PluginQuery {
  infrastructures: PluginInfrastructure[]
}
export interface PluginInfrastructureQuery extends PluginQuery {
  infrastructure: PluginInfrastructure | null
}
export interface PluginOrganizationQuery extends PluginQuery {
  organization: PluginOrganization | null
}
export interface PluginFilesQuery extends PluginQuery { files: PluginFile[] }
export interface PluginFileQuery extends PluginQuery { file: PluginFile | null }
export interface PluginSensorsQuery extends PluginQuery { sensors: PluginSensor[] }
export interface PluginSensorQuery extends PluginQuery { sensor: PluginSensor | null }
export interface PluginSensorTypesQuery extends PluginQuery { sensorTypes: PluginSensorType[] }
export interface PluginSensorTypeQuery extends PluginQuery { sensorType: PluginSensorType | null }
export interface PluginCommentsQuery extends PluginQuery { comments: PluginComment[] }
export interface PluginCommentQuery extends PluginQuery { comment: PluginComment | null }

/** Rejects on failure, so wrap the call rather than reading an error flag after it. */
export type PluginTrigger<Arg, Result> = (arg: Arg) => Promise<Result | undefined>

export interface PluginCreateSensor {
  createSensor: PluginTrigger<{ sensorData: Partial<PluginSensor> }, PluginSensor>
  isMutating: boolean
}

export interface PluginCreateComment {
  createComment: PluginTrigger<{ commentData: Partial<PluginComment> }, PluginComment>
  isMutating: boolean
}

export interface PluginDeleteComments {
  deleteComments: PluginTrigger<{ ids: number[] }, unknown>
  isDeleting: boolean
}

export interface PluginDownloadFile {
  downloadFile: (file: PluginFile, fileName?: string) => Promise<void>
  isDownloading: boolean
  downloadError: Error | null
}

/** The signed-in user's CASL ability, narrowed to the two checks a plugin makes. */
export interface PluginAbility {
  can(action: string, subject: string): boolean
  cannot(action: string, subject: string): boolean
}

export interface PluginPermissions {
  ability: PluginAbility
  isLoading: boolean
}
