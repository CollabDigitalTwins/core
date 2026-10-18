// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { LoadProgress, ProgressListener } from '../../../../../types/datasetTypes'

/** `fetch()` with an AbortController-backed timeout, chained to an optional caller signal. */
export async function fetchWithTimeout(url: string, timeoutMs = 10_000, signal?: AbortSignal, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  }
  catch (error) {
    signal?.removeEventListener('abort', onAbort)
    throw error
  }
  finally {
    clearTimeout(timeoutId)
  }
}

/** Throws the signal's abort reason once it is aborted, so a load stops between steps. */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
}

/** The parsed JSON body, or null on a network error, a non-2xx status or a body that is not JSON. */
export async function fetchJson<T = unknown>(url: string, timeoutMs = 15_000, signal?: AbortSignal): Promise<T | null> {
  try {
    const response = await fetchWithTimeout(url, timeoutMs, signal)
    return response.ok ? await response.json() as T : null
  }
  catch {
    return null
  }
}

/** The parsed JSON body; throws `<label> failed: HTTP <status>` on a non-2xx status. */
export async function fetchJsonOrThrow<T>(url: string, timeoutMs: number, label: string, onProgress?: ProgressListener, signal?: AbortSignal): Promise<T> {
  const response = await fetchWithTimeout(url, timeoutMs, signal)
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`)
  return readJsonWithProgress<T>(response, onProgress)
}

const PROGRESS_INTERVAL_MS = 100

/** Bytes downloaded, with a fraction only when `content-length` is known and still ahead of what arrived. */
export function byteProgress(bytes: number, declared: number): LoadProgress {
  return declared > 0 && bytes <= declared ? { bytes, totalBytes: declared, fraction: bytes / declared } : { bytes }
}

/** The response body parsed as JSON, counted as it streams so `onProgress` hears the bytes against `content-length`. */
export async function readJsonWithProgress<T>(response: Response, onProgress?: ProgressListener): Promise<T> {
  if (!onProgress || !response.body) return response.json() as Promise<T>
  const declared = Number(response.headers.get('content-length')) || 0
  let bytes = 0
  let reportedAt = 0
  const counted = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytes += chunk.byteLength
      if (Date.now() - reportedAt >= PROGRESS_INTERVAL_MS) {
        reportedAt = Date.now()
        onProgress(byteProgress(bytes, declared))
      }
      controller.enqueue(chunk)
    },
  }))
  const parsed = await new Response(counted).json() as T
  onProgress(byteProgress(bytes, declared))
  return parsed
}

export interface PageTracker {
  onPage: (items: unknown[]) => void
  /** A listener for one page's download, so its bytes add to the size reported so far. */
  bytes: () => ProgressListener | undefined
}

/** Reports features loaded against `total`, plus the bytes of every page downloaded, to `onProgress`; byte updates are throttled. */
export function trackPages(onProgress: ProgressListener | undefined, total?: number | null): PageTracker {
  let featureCount = 0
  let bytes = 0
  let emittedAt = 0
  const emit = () => {
    if (!onProgress) return
    emittedAt = Date.now()
    onProgress({
      featureCount,
      ...(total ? { totalFeatureCount: total, fraction: Math.min(1, featureCount / total) } : {}),
      ...(bytes > 0 ? { bytes } : {}),
    })
  }
  return {
    onPage: (items) => {
      featureCount += items.length
      emit()
    },
    bytes: () => {
      if (!onProgress) return undefined
      let pageBytes = 0
      return (progress) => {
        const latest = progress.bytes ?? 0
        bytes += latest - pageBytes
        pageBytes = latest
        if (Date.now() - emittedAt >= PROGRESS_INTERVAL_MS) emit()
      }
    },
  }
}

/** `url` without its query string or trailing slashes. */
export function serviceBaseUrl(url: string): string {
  return url.split('?')[0].replace(/\/+$/, '')
}

const OPEN_DATA_PROXY = '/api/openDataProxy'

/** The URL routed through the app's guarded open-data proxy when running in the browser; unchanged on the server. */
export function proxiedUrl(url: string): string {
  return typeof window === 'undefined' ? url : `${OPEN_DATA_PROXY}?url=${encodeURIComponent(url)}`
}

/** A direct request first, then the same request through the proxy when the server blocks cross-origin reads. */
export async function fetchWithProxyFallback(url: string, timeoutMs = 15_000): Promise<Response> {
  try {
    return await fetchWithTimeout(url, timeoutMs)
  }
  catch (error) {
    if (typeof window === 'undefined') throw error
    return fetchWithTimeout(proxiedUrl(url), timeoutMs)
  }
}
