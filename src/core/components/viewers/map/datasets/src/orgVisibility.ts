// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DatasetGroup } from '../../../../../types/dbTypes'

import type { Dataset } from '../../../../../types/datasetTypes'

/**
 * Which organizations' datasets the current viewer may see.
 *
 * Shared by the Datasets panel and the map sidebar's Layers tab — both used to
 * carry their own copy of this logic.
 */
export type OrgVisibility = {
  isAdmin: boolean
  currentOrgId: number
  allowedOrgIds: number[]
}

const ADMIN_ALLOWED_ORGS = [1, 2, 3, 4, 5, 6]

/** Legacy path→org lookup, kept as a fallback for instances that predate orgs being passed in. */
const ORG_BY_PATH_PREFIX: Record<string, number> = {
  '/envirocentre': 1,
  '/dnd': 3,
  '/canada': 4,
  '/gac': 5,
  '/carleton': 6,
}

/** The shared organization whose datasets every instance may see. */
const SHARED_ORG_ID = 2

export function normalizeOrgId(org?: number | string | null) {
  if (org === null || org === undefined) return undefined
  const parsed = typeof org === 'number' ? org : Number.parseInt(String(org), 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * @param pathname - the current route; `/cdt` grants admin visibility.
 * @param currentOrganizationId - the organization this instance actually belongs
 *   to. Prefer this over {@link ORG_BY_PATH_PREFIX}: that table only lists five
 *   organizations, so every organization added since silently fell back to the
 *   shared org and its members could not see their own datasets.
 */
export function getOrgVisibility(
  pathname?: string | null,
  currentOrganizationId?: number | string | null,
): OrgVisibility {
  const normalizedPath = (pathname || '').toLowerCase()
  const firstSegment = normalizedPath.split('/').filter(Boolean)[0]
  const prefix = firstSegment ? `/${firstSegment}` : ''

  if (prefix === '/cdt') {
    return { isAdmin: true, currentOrgId: 1, allowedOrgIds: ADMIN_ALLOWED_ORGS }
  }

  const currentOrgId = normalizeOrgId(currentOrganizationId)
    ?? ORG_BY_PATH_PREFIX[prefix]
    ?? SHARED_ORG_ID
  return {
    isAdmin: false,
    currentOrgId,
    allowedOrgIds: Array.from(new Set([SHARED_ORG_ID, currentOrgId])),
  }
}

export function datasetVisibleForOrg(dataset: Dataset, visibility: OrgVisibility) {
  if (visibility.isAdmin) return true
  if (dataset.group !== DatasetGroup.Organizational) return true

  const orgId = normalizeOrgId(dataset.organization)
  if (orgId === undefined) return false

  return visibility.allowedOrgIds.includes(orgId)
}
