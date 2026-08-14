'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Data access for plugins: core's own bound hooks, re-exported. A plugin goes
 * through the same `ApiAdapter` as everything else and inherits its auth, org
 * scoping and SWR cache — no second data path, and no way past the tenant boundary.
 *
 * Read-only where the write belongs to core: buildings and sites are canonical asset
 * records, so changing them is a core change. Sensors and comments are read-write,
 * being the domains plugins are expected to author. A plugin's own data goes in
 * `plugins-sdk/store`.
 */

// --- Read: assets -----------------------------------------------------------
export {
  useBuildings,
  useBuilding,
  useBuildingsByOsm,
  useBuildingOsmIds,
} from '../../hooks/buildings/buildings'
export { useSites, useSite } from '../../hooks/sites/sites'
export { useInfrastructures, useInfrastructure } from '../../hooks/infrastructures/infrastructures'

// --- Read: organization and files ------------------------------------------
export { useOrganization, useOrganizationByName } from '../../hooks/organizations/organizations'
export {
  useFiles,
  useFile,
  useFilesByBuildingId,
  useFilesBySiteId,
  useDownloadFile,
} from '../../hooks/files/files'

// --- Read/write: sensors ----------------------------------------------------
export {
  useSensors,
  useSensor,
  useSensorsByBuilding,
  useSensorsByAuthor,
  useCreateSensor,
} from '../../hooks/sensors/sensors'
export { useSensorTypes, useSensorType } from '../../hooks/sensorTypes/sensorTypes'

// --- Read/write: comments ---------------------------------------------------
export {
  useComments,
  useComment,
  useCommentsByBuilding,
  useCommentsByAuthor,
  useCreateComment,
  useDeleteComments,
} from '../../hooks/comments/comments'

// --- Plugin context ---------------------------------------------------------

/** The plugin's config for this organization, shaped by the manifest's `configSchema`. */
export { usePluginConfig } from './config'

export { usePluginPermissions } from './permissions'
