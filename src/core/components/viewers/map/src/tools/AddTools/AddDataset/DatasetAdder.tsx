'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { Upload } from 'lucide-react'

import { DatasetsContext, MapContext } from '../../../../../../../store'
import { Button, Input } from '../../../../../../ui/'
import { layerColorByName } from '../../../../utils/stringToColour'
import { DatasetGroup } from '../../../../../../../types/dbTypes'
import type { Dataset } from '../../../../../../../types/datasetTypes'
import { parseGeoJSON, type GeoJSONSummary } from '../../../../datasets/src/geojsonFile'
import {
  addWmsToMap,
  detectSourceType,
  extractWmsLayers,
  loadVectorUrl,
  nameFromUrl,
  type UrlSourceType,
} from '../../../../datasets/src/urlSources'
import { uploadToPresignedUrl } from '../AddFile/utils/uploadToPresignedURLS'

/** Bucket uploaded org datasets land in (orgId prefix added server-side). */
const DATASETS_BUCKET = 'pointclouds-demo'

/** Default per-geometry paint, persisted so reload hydration can restyle. */
const DEFAULT_LAYER_STYLES = {
  lineLayerStyle: { 'line-color': '#0d9488', 'line-width': 4 },
  pointLayerStyle: { 'circle-color': '#0d9488', 'circle-radius': 8 },
  polygonLayerStyle: { 'fill-color': '#0d9488', 'fill-opacity': 0.8 },
}

type PersistGeometry = 'points' | 'lines' | 'polygons'

/** Pick the dominant geometry family for the persisted File row's layerType hint. */
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
 * Add a dataset to the map — from a dropped/picked GeoJSON file, or from a
 * pasted URL (GeoJSON, ArcGIS Feature Service, or WMS).
 *
 * Vector sources (file / GeoJSON URL / ArcGIS) are parsed client-side and
 * registered into DatasetsContext; the existing OpenDataLayers renderer draws
 * them. WMS is a raster overlay added straight to the map.
 *
 * File uploads are additionally persisted: the raw GeoJSON is uploaded to MinIO
 * and a File row is created so the dataset re-hydrates on the next load (via
 * minioDatasets.ts). URL/WMS imports are session-only — there is no file to
 * persist.
 */
export const DatasetAdder = ({ onClose }: DatasetAdderProps) => {
  const { dispatch: datasetDispatch } = React.useContext(DatasetsContext)
  const { state: mapState } = React.useContext(MapContext)
  const map = mapState.map.map

  const [loaded, setLoaded] = React.useState<Loaded | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [dragActive, setDragActive] = React.useState(false)

  const [url, setUrl] = React.useState('')
  const [urlType, setUrlType] = React.useState<UrlSourceType>('geojson')
  const [wmsLayers, setWmsLayers] = React.useState('')
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
    if (!value.trim()) return
    const detected = detectSourceType(value)
    setUrlType(detected)
    if (detected === 'wms') {
      const layers = extractWmsLayers(value)
      if (layers) setWmsLayers(layers)
    }
  }

  const loadFromUrl = React.useCallback(async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    setError(null)
    setBusy(true)
    try {
      const { featureCollection, summary } = await loadVectorUrl(
        trimmed,
        urlType === 'arcgis' ? 'arcgis' : 'geojson',
      )
      setLoaded({ sourceName: nameFromUrl(trimmed), featureCollection, summary })
    }
    catch (e) {
      setLoaded(null)
      setError(e instanceof Error ? e.message : 'Failed to load URL')
    }
    finally {
      setBusy(false)
    }
  }, [url, urlType])

  const addWms = React.useCallback(() => {
    const trimmed = url.trim()
    if (!map) { setError('Open the Map viewer first.'); return }
    if (!trimmed || !wmsLayers.trim()) { setError('A WMS URL and layer name are required.'); return }
    try {
      addWmsToMap(map, trimmed, wmsLayers.trim())
      onClose?.()
    }
    catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add WMS layer')
    }
  }, [map, url, wmsLayers, onClose])

  /**
   * Upload the dropped/picked file to MinIO and create a File row so the
   * dataset survives a reload. Best-effort: a failure leaves the dataset
   * session-only rather than blocking the add.
   */
  const persistFile = React.useCallback(async (file: File, geometry: PersistGeometry) => {
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
        layerStyles: DEFAULT_LAYER_STYLES,
      }),
    }
    const fileRes = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileRow),
    })
    if (!fileRes.ok) {
      console.warn(`DatasetAdder: File row create returned ${fileRes.status}; dataset will be session-only`)
    }
  }, [])

  const addToMap = React.useCallback(async () => {
    if (!loaded) return
    const name = loaded.sourceName.replace(/\.(geo)?json$/i, '') || loaded.sourceName
    const featureCollection = loaded.featureCollection

    // File sources persist to MinIO; URL/WMS imports are session-only.
    if (loaded.file) {
      setSaving(true)
      try {
        await persistFile(loaded.file, dominantGeometry(loaded.summary))
      }
      catch (e) {
        console.warn('DatasetAdder: MinIO persistence failed; dataset will be session-only', e)
      }
      finally {
        setSaving(false)
      }
    }

    const dataset: Dataset = {
      id: `local-${Date.now()}`,
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

    const bbox = loaded.summary.bbox
    if (map && bbox) {
      map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 48, duration: 800 })
    }

    setLoaded(null)
    setError(null)
    onClose?.()
  }, [loaded, map, datasetDispatch, persistFile, onClose])

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
              placeholder="https://… (GeoJSON, ArcGIS FeatureServer, or WMS)"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <select
                className="border border-input rounded p-1 text-sm bg-background"
                value={urlType}
                onChange={(e) => setUrlType(e.target.value as UrlSourceType)}
              >
                <option value="geojson">GeoJSON</option>
                <option value="arcgis">ArcGIS Feature Service</option>
                <option value="wms">WMS</option>
              </select>

              {urlType === 'wms'
                ? (
                    <>
                      <Input
                        placeholder="WMS layer name(s)"
                        value={wmsLayers}
                        onChange={(e) => setWmsLayers(e.target.value)}
                      />
                      <Button onClick={addWms} disabled={!url.trim() || !wmsLayers.trim()}>
                        Add WMS
                      </Button>
                    </>
                  )
                : (
                    <Button onClick={() => void loadFromUrl()} disabled={!url.trim() || busy}>
                      {busy ? 'Loading…' : 'Load'}
                    </Button>
                  )}
            </div>
            {urlType === 'wms' && (
              <p className="text-xs text-muted-foreground">
                WMS is added as a raster overlay (not a dataset) — it won’t appear in “view datasets”.
              </p>
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
