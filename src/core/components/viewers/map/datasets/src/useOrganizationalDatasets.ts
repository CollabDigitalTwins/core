// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useSession } from 'next-auth/react'
import * as React from 'react'

import { fetchLocalDatasets } from './localDatasets'
import { fetchOrganizationalMinioDatasets } from './minioDatasets'
import { datasetVisibleForOrg, getOrgVisibility, normalizeOrgId, type OrgVisibility } from './orgVisibility'
import { buildPublishedCatalogMap, type PublishedCatalogEntry } from './publishedTiles'

import type { Dataset } from '../../../../../types/datasetTypes'
import type { Organization } from '../../../../../types/dbTypes'

/**
 * Loads the Organizational dataset list: Martin vector tiles plus the MinIO-
 * backed GeoJSON uploads from "Add Dataset", for the signed-in organization.
 */
export type UseOrganizationalDatasetsArgs = {
  /** The organization this instance belongs to — i.e. the one being *viewed*. */
  organization?: Organization
  martinBaseUrl?: string
  /** Bumped by the store to force a reload after an upload or a publish. */
  refreshNonce?: unknown
}

export type UseOrganizationalDatasetsResult = {
  /**
   * `null` until the first load settles, so callers can leave the previous list
   * on screen instead of blanking it while a reload is in flight. An empty
   * array means "loaded, and there is nothing to show".
   */
  datasets: Dataset[] | null
  publishedCatalog: Map<string, PublishedCatalogEntry>
  /** Also used by the panel's other tabs to filter open-data lists. */
  orgVisibility: OrgVisibility
}

export function useOrganizationalDatasets({
  organization,
  martinBaseUrl,
  refreshNonce,
}: UseOrganizationalDatasetsArgs): UseOrganizationalDatasetsResult {
  const orgVisibility = React.useMemo(() => getOrgVisibility(organization?.id), [organization?.id])

  // `/api/files` only ever returns the signed-in user's organization, so this is
  // whose datasets any of this would be.
  const { data: sessionData } = useSession()
  const owningOrgId = normalizeOrgId(sessionData?.user?.organizationId)

  // A platform admin may legitimately be looking at another organization's
  // instance. Listing their own datasets under it would be misleading, so the
  // organizational list is empty there and nothing is fetched.
  const viewingOwnOrg = owningOrgId !== undefined && owningOrgId === orgVisibility.currentOrgId

  const [datasets, setDatasets] = React.useState<Dataset[] | null>(null)
  const [publishedCatalog, setPublishedCatalog] = React.useState<Map<string, PublishedCatalogEntry>>(new Map())

  React.useEffect(() => {
    const loadOrganizationalDatasets = async () => {
      if (!viewingOwnOrg || owningOrgId === undefined) {
        setPublishedCatalog(new Map())
        setDatasets([])
        return
      }

      // Refresh the published-catalog lookup first (a fast /api/files read) so
      // converted open-data datasets flip promptly across every tab — ahead of
      // the slower Martin tile-sampling below. Non-fatal on failure.
      try {
        const filesRes = await fetch('/api/files')
        if (filesRes.ok) {
          const body = await filesRes.json()
          const rows = Array.isArray(body?.files) ? body.files : []
          setPublishedCatalog(buildPublishedCatalogMap(rows))
        }
      }
      catch (err) {
        console.warn('Failed to refresh published-catalog map:', err)
      }

      const martinBaseUrlClean = (martinBaseUrl ?? '').replace(/\/+$/, '')

      const martinPromise: Promise<Dataset[]> = martinBaseUrlClean
        ? (async () => {
            const datasetsUrl = martinBaseUrlClean.includes('/tiles/index.json')
              ? martinBaseUrlClean
              : `${martinBaseUrlClean}/tiles/index.json`

            const localPortal = {
              id: -1,
              name: 'Organizational Datasets',
              apiUrl: datasetsUrl,
              dataManagementSystem: 'Other' as const,
              countrySubdivision: null,
              municipality: null,
              group: 'Organizational' as const,
            }

            try {
              return await fetchLocalDatasets(localPortal as any)
            }
            catch (err) {
              console.error('Failed to load Martin organizational datasets:', err)
              return []
            }
          })()
        : Promise.resolve([])

      if (!martinBaseUrlClean) {
        console.warn('NEXT_PUBLIC_MARTIN_SERVER_URL not configured — skipping Martin pre-load')
      }

      // Martin must resolve first so MinIO suppression can check live catalog
      // membership — prevents "file disappeared" during the publish→restart gap.
      const martinDatasets = await martinPromise
      const publishedTilesInCatalog = new Set<string>(
        martinDatasets.map(d => typeof d.id === 'string' ? d.id : '').filter(Boolean),
      )

      const minioDatasets = await fetchOrganizationalMinioDatasets(owningOrgId, publishedTilesInCatalog)
        .catch((err) => {
          console.error('Failed to load MinIO organizational datasets:', err)
          return [] as Dataset[]
        })

      const combined = [...martinDatasets, ...minioDatasets]
      const visibleOrgDatasets = combined.filter(ds => datasetVisibleForOrg(ds, orgVisibility))

      if (visibleOrgDatasets.length === 0) {
        console.warn('No organizational datasets found')
      }
      setDatasets(visibleOrgDatasets)
    }

    void loadOrganizationalDatasets()
  }, [orgVisibility, owningOrgId, viewingOwnOrg, martinBaseUrl, refreshNonce])

  return { datasets, publishedCatalog, orgVisibility }
}
