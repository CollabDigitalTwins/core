'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Data access for plugins.
 *
 * These are the app's own bound hooks, re-exported. A plugin therefore goes
 * through the same `ApiAdapter` the rest of core uses, and inherits its auth, its
 * organization scoping and its SWR cache for free — there is no second data path
 * to keep in step, and no way for a plugin to reach past the tenant boundary.
 *
 * Read-only where a write belongs to core. Buildings and sites are the canonical
 * asset records; a feature that needs to change them is a core change, not a
 * plugin. Sensors and comments are read-write because they are the two domains
 * plugins are expected to author.
 *
 * A plugin's *own* data goes in `plugins-sdk/store` instead, namespaced by plugin.
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

/**
 * The plugin's own configuration, as set for this organization.
 * Shape is whatever the manifest's `configSchema` describes.
 */
export { usePluginConfig } from '../host/provider'

export { usePluginPermissions } from './permissions'
