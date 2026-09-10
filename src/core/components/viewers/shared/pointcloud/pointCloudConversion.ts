// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export interface CreatedPointCloud {
  id: string | number
  name?: string
}

export interface CreatePointCloudResult {
  pointCloud: CreatedPointCloud
  upload: { uploadUrl: string }
}

/** The converter reports a stage plus an optional percentage; only `convert` and `upload` carry one. */
export interface ConversionEvent {
  jobId: string
  pointCloudId: number
  status: string
  progress: number | null
  message?: string
  success?: boolean
}

export interface ConversionWatcher {
  onProgress?: (event: ConversionEvent) => void
  onFinished?: (event: ConversionEvent) => void
  onFailed?: (reason: string) => void
}

export const CONVERSION_FAILED = 'failed'

/** Routed through the CDT proxy so organizationId comes from the session, not the client. */
export async function createPointCloud(
  name: string,
  extension: string,
  buildingId?: number,
): Promise<CreatePointCloudResult> {
  const response = await fetch('/api/point-cloud', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, buildingId, extension }),
  })

  if (!response.ok) {
    throw new Error(`Create point cloud failed: ${await response.text() || response.status}`)
  }

  return response.json() as Promise<CreatePointCloudResult>
}

export async function startConversion(apiBase: string, pointCloudId: string | number): Promise<{ jobId: string }> {
  const response = await fetch(
    `${apiBase}/point-cloud/${encodeURIComponent(String(pointCloudId))}/convert-to-potree`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: { sampling_method: 'poisson' } }),
    },
  )

  if (!response.ok) {
    throw new Error(`Start conversion failed: ${await response.text() || response.status}`)
  }

  return response.json() as Promise<{ jobId: string }>
}

function parseEvent(event: Event): ConversionEvent | null {
  try {
    return JSON.parse((event as MessageEvent<string>).data) as ConversionEvent
  }
  catch {
    return null
  }
}

/** Watches one job, returning a close function. The service emits only `progress` and
 *  `finished`; a failure is a `progress` with `status: 'failed'`, or `success: false`. */
export function watchConversion(apiBase: string, jobId: string, watcher: ConversionWatcher): () => void {
  const source = new EventSource(`${apiBase}/events/convert-progress/${encodeURIComponent(jobId)}`)
  let closed = false

  const close = () => {
    if (closed) return
    closed = true
    source.close()
  }

  // EventSource retries on its own, so onerror can fire repeatedly for one dead job.
  const fail = (reason: string) => {
    if (closed) return
    close()
    watcher.onFailed?.(reason)
  }

  source.addEventListener('progress', (event) => {
    const payload = parseEvent(event)
    if (!payload) return
    if (payload.status === CONVERSION_FAILED) {
      fail(payload.message ?? CONVERSION_FAILED)
      return
    }
    watcher.onProgress?.(payload)
  })

  source.addEventListener('finished', (event) => {
    const payload = parseEvent(event)
    if (closed) return
    close()
    if (payload && payload.success === false) {
      watcher.onFailed?.(payload.message ?? CONVERSION_FAILED)
      return
    }
    if (payload) watcher.onFinished?.(payload)
  })

  // The stream stays open for the whole job, so an error here is a dropped connection.
  source.onerror = () => fail('connection lost')

  return close
}
