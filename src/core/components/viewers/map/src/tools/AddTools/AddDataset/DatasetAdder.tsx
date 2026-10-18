'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Upload } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { DatasetsContext, MapContext } from '../../../../../../../store'
import { DatasetGroup } from '../../../../../../../types/dbTypes'
import { Button, Input } from '../../../../../../ui/'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../../ui/Select'
import { parseGeoJSON, type GeoJSONSummary } from '../../../../datasets/src/geojsonFile'
import { listWmsLayers, listWmtsLayers, mapServiceDataset, type MapServiceLayer } from '../../../../datasets/src/mapServices'
import { normalizeOrgId } from '../../../../datasets/src/orgVisibility'
import {
  arcgisUrlDataset,
  detectSourceType,
  extractWmsLayers,
  loadGeojsonUrl,
  nameFromUrl,
  type UrlSourceType,
} from '../../../../datasets/src/urlSources'
import { useAddDatasetToMap } from '../../../../datasets/src/useAddDatasetToMap'
import { layerColorByName } from '../../../../utils/stringToColour'
import { uploadToPresignedUrl } from '../AddFile/utils/uploadToPresignedURLS'

import type { Dataset } from '../../../../../../../types/datasetTypes'

/** The orgId prefix is added server-side. */
const DATASETS_BUCKET = 'pointclouds-demo'

const URL_TYPES: UrlSourceType[] = ['geojson', 'arcgis', 'wms', 'wmts', 'arcgisMapServer', 'arcgisImageServer', 'xyz']
const LAYER_PICKER_TYPES = new Set<UrlSourceType>(['wms', 'wmts'])

type PersistGeometry = 'points' | 'lines' | 'polygons'

function dominantGeometry(summary: GeoJSONSummary): PersistGeometry {
  let points = 0
  let lines = 0
  let polygons = 0
  for (const [type, count] of Object.entries(summary.geometryTypes)) {
    if (type.includes('Point')) points += count
    else if (type.includes('LineString')) lines += count
    else if (type.includes('Polygon')) polygons += count
  }
  if (polygons >= lines && polygons >= points) return 'polygons'
  if (lines >= points) return 'lines'
  return 'points'
}

interface Loaded {
  sourceName: string
  featureCollection: GeoJSON.FeatureCollection
  summary: GeoJSONSummary
  /** Present only for file sources — enables MinIO persistence on add. */
  file?: File
}

interface DatasetAdderProps {
  onClose?: () => void
}

/**
 * Add a dataset from a GeoJSON file or a pasted URL: GeoJSON, an ArcGIS feature layer, or a map service.
 * File uploads also persist to MinIO and re-hydrate on reload.
 */
export const DatasetAdder = ({ onClose }: DatasetAdderProps) => {
  const t = useTranslations('Datasets')
  const { dispatch: datasetDispatch } = React.useContext(DatasetsContext)
  const { state: mapState } = React.useContext(MapContext)
  const map = mapState.map.map

  // Uploads are keyed under the signed-in org; unstamped datasets are hidden from non-admins.
  const { data: sessionData } = useSession()
  const owningOrgId = normalizeOrgId(sessionData?.user?.organizationId)

  const [loaded, setLoaded] = React.useState<Loaded | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [dragActive, setDragActive] = React.useState(false)

  const [url, setUrl] = React.useState('')
  const [urlType, setUrlType] = React.useState<UrlSourceType>('geojson')
  const [serviceLayers, setServiceLayers] = React.useState<MapServiceLayer[]>([])
  const [serviceLayer, setServiceLayer] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const handleFile = React.useCallback(async (file: File) => {
    setError(null)
    try {
      const { featureCollection, summary } = parseGeoJSON(await file.text())
      setLoaded({ sourceName: file.name, featureCollection, summary, file })
    }
    catch (e) {
      setLoaded(null)
      setError(e instanceof Error ? e.message : 'Failed to read file')
    }
  }, [])

  const onDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }, [handleFile])

  const handleUrlChange = (value: string) => {
    setUrl(value)
    setServiceLayers([])
    if (!value.trim()) return
    const detected = detectSourceType(value)
    setUrlType(detected)
    if (detected === 'wms') setServiceLayer(extractWmsLayers(value))
  }

  const { addDataset: addCheckedDataset } = useAddDatasetToMap()
  const addDataset = React.useCallback(async (dataset: Dataset) => {
    if (!await addCheckedDataset(dataset)) return
    datasetDispatch({ type: 'ADD_DATASET', payload: { dataset } })
    onClose?.()
  }, [addCheckedDataset, datasetDispatch, onClose])

  const withBusy = React.useCallback(async (task: () => Promise<void>) => {
    setError(null)
    setBusy(true)
    try {
      await task()
    }
    catch (e) {
      setError(e instanceof Error ? e.message : t('urlLoadFailed'))
    }
    finally {
      setBusy(false)
    }
  }, [t])

  const loadFromUrl = React.useCallback(() => withBusy(async () => {
    const trimmed = url.trim()
    if (urlType === 'geojson') {
      const { featureCollection, summary } = await loadGeojsonUrl(trimmed)
      setLoaded({ sourceName: nameFromUrl(trimmed), featureCollection, summary })
      return
    }
    if (urlType === 'arcgis') {
      await addDataset(await arcgisUrlDataset(trimmed, owningOrgId))
      return
    }
    if (LAYER_PICKER_TYPES.has(urlType) && !serviceLayer) {
      const layers = urlType === 'wms' ? await listWmsLayers(trimmed) : await listWmtsLayers(trimmed)
      if (layers.length === 0) throw new Error(t('noServiceLayers'))
      setServiceLayers(layers)
      setServiceLayer(layers[0].name)
      return
    }
    const layerTitle = serviceLayers.find(layer => layer.name === serviceLayer)?.title
    await addDataset(mapServiceDataset(
      { kind: urlType, url: trimmed, layer: serviceLayer || undefined },
      { name: layerTitle || serviceLayer || nameFromUrl(trimmed), group: DatasetGroup.Organizational, organization: owningOrgId, publisher: 'Local / URL' },
    ))
  }), [withBusy, url, urlType, serviceLayer, serviceLayers, addDataset, owningOrgId, t])

  /** Throws rather than blocking the add; the caller degrades to a session-only dataset. */
  const persistFile = React.useCallback(async (file: File, geometry: PersistGeometry): Promise<number> => {
    const assetId = `${crypto.randomUUID()}.geojson`
    const presignedRes = await fetch(
      `/api/presigned-url-upload?asset=${encodeURIComponent(assetId)}&bucket=${DATASETS_BUCKET}`,
    )
    if (!presignedRes.ok) throw new Error(`presigned URL failed: ${presignedRes.status}`)
    const { presignedUrl } = await presignedRes.json()
    await uploadToPresignedUrl(presignedUrl, file)

    const fileRow = {
      type: 'map-file',
      name: file.name,
      assetId,
      mimeType: 'application/geo+json',
      extension: 'geojson',
      sizeBytes: file.size,
      tag: 'organizational-dataset',
      isVisible: true,
      description: JSON.stringify({
        bucket: DATASETS_BUCKET,
        geometryType: geometry,
      }),
    }
    const fileRes = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileRow),
    })
    if (!fileRes.ok) throw new Error(`File row create returned ${fileRes.status}`)

    const { newFile } = await fileRes.json()
    if (typeof newFile?.id !== 'number') throw new Error('File row create returned no id')
    return newFile.id
  }, [])

  const addToMap = React.useCallback(async () => {
    if (!loaded) return
    const name = loaded.sourceName.replace(/\.(geo)?json$/i, '') || loaded.sourceName
    const featureCollection = loaded.featureCollection

    let persistedFileId: number | null = null
    if (loaded.file) {
      setSaving(true)
      try {
        persistedFileId = await persistFile(loaded.file, dominantGeometry(loaded.summary))
      }
      catch (e) {
        console.warn('DatasetAdder: MinIO persistence failed; dataset will be session-only', e)
        toast.error(t('toastDatasetNotSaved', {
          name: loaded.sourceName,
          error: e instanceof Error ? e.message : 'unknown error',
        }))
      }
      finally {
        setSaving(false)
      }
    }

    // Must match the id minioDatasets.ts rebuilds: the panel dedups by name and keeps this row.
    const dataset: Dataset = {
      id: persistedFileId != null ? `org-minio-${persistedFileId}` : `local-${Date.now()}`,
      organization: owningOrgId,
      name,
      type: 'Organizational',
      publisher: loaded.file ? 'Organizational' : 'Local / URL',
      license: 'Unknown',
      contact: '',
      description: `Imported: ${loaded.sourceName}`,
      countrySubdivision: '',
      municipality: '',
      clickable: true,
      visible: true,
      properties: {},
      getFeatures: async () => featureCollection,
      getFields: async () => [],
      dataManagementSystem: 'other',
      datasetType: 'GeoJSON',
      group: DatasetGroup.Organizational,
      layerColor: layerColorByName(name),
    }

    datasetDispatch({ type: 'ADD_DATASET', payload: { dataset } })
    datasetDispatch({ type: 'ADD_DATASET_TO_MAP', payload: { dataset } })

    // Swap the optimistic row for the hydrated one, which carries the MinIO source URL.
    if (persistedFileId != null) {
      datasetDispatch({ type: 'REFRESH_ORG_DATASETS' })
      toast.success(t('toastDatasetAdded', { name }))
    }

    const bbox = loaded.summary.bbox
    if (map && bbox) {
      map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 48, duration: 800 })
    }

    setLoaded(null)
    setError(null)
    onClose?.()
  }, [loaded, map, datasetDispatch, persistFile, onClose, owningOrgId, t])

  const needsLoad = urlType === 'geojson' || (LAYER_PICKER_TYPES.has(urlType) && !serviceLayer)

  return (
    <div className="flex flex-col gap-3 mt-2">
      {!loaded && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={`rounded-md border-2 border-dashed p-6 text-center text-sm transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
            }`}
          >
            <Upload className="mx-auto mb-2 text-muted-foreground" size={24} />
            <p className="text-muted-foreground">Drag &amp; drop a GeoJSON file here</p>
            <label className="mt-2 inline-block cursor-pointer text-primary underline">
              or browse
              <input
                type="file"
                accept=".geojson,.json,application/geo+json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleFile(file)
                }}
              />
            </label>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or paste a URL
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col gap-2">
            <Input
              placeholder={t('urlPlaceholder')}
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Select
                value={urlType}
                onValueChange={(value) => {
                  setUrlType(value as UrlSourceType)
                  setServiceLayers([])
                }}
              >
                <SelectTrigger aria-label={t('urlType')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URL_TYPES.map(type => <SelectItem key={type} value={type}>{t(`urlTypes.${type}`)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={() => void loadFromUrl()} disabled={!url.trim() || busy}>
                {busy ? t('loading') : needsLoad ? t('load') : t('addToMap')}
              </Button>
            </div>
            {serviceLayers.length > 0 && (
              <Select value={serviceLayer} onValueChange={setServiceLayer}>
                <SelectTrigger aria-label={t('serviceLayer')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {serviceLayers.map(layer => <SelectItem key={layer.name} value={layer.name}>{layer.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </>
      )}

      {loaded && (
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-medium break-all">{loaded.sourceName}</p>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li><strong>Features:</strong> {loaded.summary.featureCount}</li>
            <li>
              <strong>Geometry:</strong>{' '}
              {Object.entries(loaded.summary.geometryTypes)
                .map(([type, count]) => `${type} (${count})`)
                .join(', ') || '—'}
            </li>
            <li>
              <strong>Properties:</strong>{' '}
              {loaded.summary.propertyKeys.join(', ') || '—'}
            </li>
          </ul>
          <div className="flex gap-2">
            <Button onClick={() => void addToMap()} disabled={saving}>
              {saving ? 'Saving…' : 'Add to map'}
            </Button>
            <Button variant="ghost" disabled={saving} onClick={() => { setLoaded(null); setError(null) }}>
              Choose another
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
