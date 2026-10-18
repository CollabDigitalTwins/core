// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { byteProgress } from './http'

import type { ProgressListener } from '../../../../../types/datasetTypes'
import type { FlatBounds } from '../../utils/validateBounds'
import type { Feature } from 'geojson'

/** Flat [w, s, e, n] per feature, NaN for features without coordinates. */
export function indexFeatureBounds(features: Feature[]): Float64Array {
  const bounds = new Float64Array(features.length * 4).fill(Number.NaN)
  for (let i = 0; i < features.length; i++) {
    const stack: unknown[] = [(features[i]?.geometry as { coordinates?: unknown } | null)?.coordinates]
    const geometries = (features[i]?.geometry as { geometries?: Array<{ coordinates?: unknown }> } | null)?.geometries
    if (geometries) for (let g = 0; g < geometries.length; g++) stack.push(geometries[g].coordinates)
    let west = Infinity
    let south = Infinity
    let east = -Infinity
    let north = -Infinity
    while (stack.length > 0) {
      const item = stack.pop()
      if (!Array.isArray(item)) continue
      if (typeof item[0] === 'number' && typeof item[1] === 'number') {
        if (item[0] < west) west = item[0]
        if (item[0] > east) east = item[0]
        if (item[1] < south) south = item[1]
        if (item[1] > north) north = item[1]
      }
      else {
        for (let j = 0; j < item.length; j++) stack.push(item[j])
      }
    }
    if (west <= east) {
      bounds[i * 4] = west
      bounds[i * 4 + 1] = south
      bounds[i * 4 + 2] = east
      bounds[i * 4 + 3] = north
    }
  }
  return bounds
}

/** The features whose bounds touch `bbox`. */
export function featuresInBounds(features: Feature[], bounds: Float64Array, bbox: FlatBounds): Feature[] {
  const result: Feature[] = []
  for (let i = 0; i < features.length; i++) {
    const west = bounds[i * 4]
    if (Number.isNaN(west)) continue
    if (west <= bbox[2] && bounds[i * 4 + 2] >= bbox[0] && bounds[i * 4 + 1] <= bbox[3] && bounds[i * 4 + 3] >= bbox[1]) result.push(features[i])
  }
  return result
}

interface LoadedFile {
  features: Feature[]
  bounds: Float64Array
}

type ByteReport = (bytes: number, declared: number) => void

async function downloadFeatures(urls: string[], report?: ByteReport): Promise<Feature[]> {
  let lastError: unknown = new Error('No URL to download')
  for (const url of urls) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const declared = Number(response.headers.get('content-length')) || 0
      let bytes = 0
      let reportedAt = 0
      const counted = report && response.body
        ? new Response(response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              bytes += chunk.byteLength
              if (Date.now() - reportedAt >= 100) {
                reportedAt = Date.now()
                report(bytes, declared)
              }
              controller.enqueue(chunk)
            },
          })))
        : response
      const body = await counted.json() as { features?: Feature[] }
      if (counted !== response) report?.(bytes, declared)
      return Array.isArray(body.features) ? body.features : []
    }
    catch (error) {
      lastError = error
    }
  }
  throw lastError
}

// Built by stringifying these functions, so each must be self-contained.
export const WORKER_SOURCE = `
const indexFeatureBounds = ${indexFeatureBounds.toString()}
const featuresInBounds = ${featuresInBounds.toString()}
const downloadFeatures = ${downloadFeatures.toString()}
let file = null
onmessage = async (event) => {
  const message = event.data
  try {
    if (message.type === 'load') {
      const features = await downloadFeatures(message.urls, function (bytes, total) {
        postMessage({ id: message.id, progress: true, bytes: bytes, total: total })
      })
      file = { features, bounds: indexFeatureBounds(features) }
      postMessage({ id: message.id, count: features.length })
    }
    else {
      const features = message.bbox ? featuresInBounds(file.features, file.bounds, message.bbox) : file.features
      postMessage({ id: message.id, features })
    }
  }
  catch (error) {
    postMessage({ id: message.id, error: String(error && error.message || error) })
  }
}`

interface WorkerReply {
  id: number
  progress?: boolean
  bytes?: number
  total?: number
  count?: number
  features?: Feature[]
  error?: string
}

class WorkerUnavailable extends Error {}

interface PendingRequest {
  resolve: (reply: WorkerReply) => void
  reject: (error: Error) => void
  onBytes?: ByteReport
}

function startWorker(): Worker | null {
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL.createObjectURL !== 'function') return null
  try {
    return new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' })))
  }
  catch {
    return null
  }
}

/** A GeoJSON file parsed and indexed off the main thread, answering bbox queries; falls back to the main thread without workers. */
export class GeoJsonFileIndex {
  private worker: Worker | null | undefined
  private inline: LoadedFile | null = null
  private nextId = 0
  private loading: Promise<number> | null = null
  private readonly pending = new Map<number, PendingRequest>()
  private readonly progressListeners = new Set<ProgressListener>()
  private downloaded = false
  private readonly urls: string[]

  /** `sizeHint` stands in for `content-length` when the server sends none or a compressed one. */
  constructor(urls: string[], private readonly sizeHint?: number) {
    const origin = typeof location === 'undefined' ? undefined : location.href
    this.urls = urls.map(url => (origin ? new URL(url, origin).href : url))
  }

  private failPending(error: Error) {
    for (const request of this.pending.values()) request.reject(error)
    this.pending.clear()
  }

  private connect(): Worker | null {
    const worker = startWorker()
    if (!worker) return null
    worker.addEventListener('message', (event: MessageEvent<WorkerReply>) => {
      const request = this.pending.get(event.data.id)
      if (!request) return
      if (event.data.progress) {
        request.onBytes?.(event.data.bytes ?? 0, event.data.total ?? 0)
        return
      }
      this.pending.delete(event.data.id)
      if (event.data.error) request.reject(new Error(event.data.error))
      else request.resolve(event.data)
    })
    const abandon = () => {
      worker.terminate()
      this.worker = null
      this.failPending(new WorkerUnavailable('The file worker could not run'))
    }
    worker.addEventListener('error', abandon)
    worker.addEventListener('messageerror', abandon)
    return worker
  }

  private request(message: { type: 'load' | 'slice'; urls?: string[]; bbox?: FlatBounds }, onBytes?: ByteReport): Promise<WorkerReply> {
    const worker = this.worker
    if (!worker) return Promise.reject(new WorkerUnavailable('No file worker'))
    const id = ++this.nextId
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onBytes })
      worker.postMessage({ ...message, id })
    })
  }

  private readonly reportBytes: ByteReport = (bytes, declared) => {
    for (const listener of this.progressListeners) listener(byteProgress(bytes, this.sizeHint ?? declared))
  }

  private async loadInline(): Promise<number> {
    const features = await downloadFeatures(this.urls, this.reportBytes)
    this.inline = { features, bounds: indexFeatureBounds(features) }
    return features.length
  }

  /** Downloads and indexes the file once, telling `onProgress` how much has arrived; resolves to its feature count. */
  load(onProgress?: ProgressListener): Promise<number> {
    if (onProgress && !this.downloaded) this.progressListeners.add(onProgress)
    this.loading ??= (async () => {
      this.worker ??= this.connect()
      if (!this.worker) return this.loadInline()
      try {
        return (await this.request({ type: 'load', urls: this.urls }, this.reportBytes)).count ?? 0
      }
      catch (error) {
        if (!(error instanceof WorkerUnavailable)) throw error
        return this.loadInline()
      }
    })().then((count) => {
      this.downloaded = true
      return count
    }, (error: unknown) => {
      this.loading = null
      throw error
    }).finally(() => this.progressListeners.clear())
    return this.loading
  }

  async slice(bbox?: FlatBounds): Promise<Feature[]> {
    await this.load()
    if (this.inline) return bbox ? featuresInBounds(this.inline.features, this.inline.bounds, bbox) : this.inline.features
    return (await this.request({ type: 'slice', bbox })).features ?? []
  }

  /** Stops the worker and frees the parsed file; the next `load` starts over. */
  dispose() {
    this.worker?.terminate()
    this.worker = undefined
    this.failPending(new Error('The file index was released'))
    this.inline = null
    this.loading = null
    this.downloaded = false
  }
}
