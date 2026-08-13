// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePathname } from 'next/navigation'
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
 * backed GeoJSON uploads from "Add Dataset", filtered to what this viewer may
 * see.
 *
 * Extracted from the Datasets panel so the two organization ids in play can be
 * tested apart — see {@link useOrganizationalDatasets} for why they differ.
 */
export type UseOrganizationalDatasetsArgs = {
  /** The organization this instance belongs to — i.e. the one being *viewed*. */
  organization?: Organization
  minioBaseUrl?: string
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
  minioBaseUrl,
  martinBaseUrl,
  refreshNonce,
}: UseOrganizationalDatasetsArgs): UseOrganizationalDatasetsResult {
  const pathname = usePathname()

  // Pass the instance's real organization — the path-prefix fallback only knows
  // five orgs, so newer ones could not see their own datasets.
  const orgVisibility = React.useMemo(
    () => getOrgVisibility(pathname, organization?.id),
    [pathname, organization?.id],
  )

  // Two different organizations are in play, and they must not be confused:
  //
  //   owningOrgId — whose files these are. `/api/files` only ever returns the
  //     signed-in user's organization, and the upload route keys objects under
  //     that same organization, so this is where the bytes actually live.
  //   orgVisibility.currentOrgId — whose instance is being *looked at*, taken
  //     from the address bar. That decides what the viewer is allowed to see.
  //
  // They differ whenever you view another organization's instance. Using the
  // viewed organization to build the storage path asks for a file that was
  // never written there: the dataset lists, then draws nothing.
  const { data: sessionData } = useSession()
  const owningOrgId = normalizeOrgId(sessionData?.user?.organizationId)

  const [datasets, setDatasets] = React.useState<Dataset[] | null>(null)
  // Open-data datasets already published to Martin tiles, keyed by
  // "{portalId}:{datasetId}". Lets the original portal entry (National/Applied/
  // All tabs) show as converted, not just the organizational-list copy.
  const [publishedCatalog, setPublishedCatalog] = React.useState<Map<string, PublishedCatalogEntry>>(new Map())

  React.useEffect(() => {
    const loadOrganizationalDatasets = async () => {
      // First, refresh the published-catalog lookup (a fast /api/files read) so
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

      // Two parallel sources: Martin vector tiles (if configured) and MinIO-
      // backed GeoJSON uploads (the "Add Dataset" path). Errors from either
      // are isolated so a failure on one side does not block the other.
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

      const minioDatasets: Dataset[] = owningOrgId !== undefined
        ? await fetchOrganizationalMinioDatasets(owningOrgId, publishedTilesInCatalog, minioBaseUrl).catch((err) => {
            console.error('Failed to load MinIO organizational datasets:', err)
            return []
          })
        : []

      const combined = [...martinDatasets, ...minioDatasets]
      const visibleOrgDatasets = combined.filter(ds => datasetVisibleForOrg(ds, orgVisibility))

      if (visibleOrgDatasets.length === 0) {
        console.warn('No organizational datasets found')
      }
      setDatasets(visibleOrgDatasets)
    }

    void loadOrganizationalDatasets()
  }, [orgVisibility, owningOrgId, minioBaseUrl, martinBaseUrl, refreshNonce])

  return { datasets, publishedCatalog, orgVisibility }
}
