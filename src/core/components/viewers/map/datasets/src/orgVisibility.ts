// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DatasetGroup } from '../../../../../types/dbTypes'

import type { Dataset } from '../../../../../types/datasetTypes'

/**
 * Which organization's datasets the current viewer may see. Shared by the
 * Datasets panel and the map sidebar's Layers tab.
 */
export type OrgVisibility = {
  currentOrgId?: number
}

export function normalizeOrgId(org?: number | string | null) {
  if (org === null || org === undefined) return undefined
  const parsed = typeof org === 'number' ? org : Number.parseInt(String(org), 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * @param currentOrganizationId - the organization this instance belongs to, from
 *   the session. Never derived from the URL: the address bar is not a credential.
 */
export function getOrgVisibility(currentOrganizationId?: number | string | null): OrgVisibility {
  return { currentOrgId: normalizeOrgId(currentOrganizationId) }
}

export function datasetVisibleForOrg(dataset: Dataset, visibility: OrgVisibility) {
  if (dataset.group !== DatasetGroup.Organizational) return true

  const orgId = normalizeOrgId(dataset.organization)
  if (orgId === undefined || visibility.currentOrgId === undefined) return false

  return orgId === visibility.currentOrgId
}
