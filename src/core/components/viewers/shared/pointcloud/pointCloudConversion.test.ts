// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createPointCloud, startConversion, watchConversion } from './pointCloudConversion'

class FakeEventSource {
  static last: FakeEventSource | null = null

  readonly listeners = new Map<string, ((event: Event) => void)[]>()
  onerror: (() => void) | null = null
  closed = false

  constructor(readonly url: string) {
    FakeEventSource.last = this
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    const existing = this.listeners.get(type) ?? []
    existing.push(listener)
    this.listeners.set(type, existing)
  }

  close() {
    this.closed = true
  }

  emit(type: string, data: unknown) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data: JSON.stringify(data) } as MessageEvent<string>)
    }
  }

  emitRaw(type: string, data: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data } as MessageEvent<string>)
    }
  }
}

const stubFetch = (response: Partial<Response>) =>
  vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve(''), ...response })

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeEventSource)
  FakeEventSource.last = null
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createPointCloud', () => {
  it('sends the source extension so the stored key keeps the real format', async () => {
    const fetchMock = stubFetch({ json: () => Promise.resolve({ pointCloud: { id: 7 }, upload: { uploadUrl: 'u' } }) })
    vi.stubGlobal('fetch', fetchMock)

    const result = await createPointCloud('scan', 'e57', 42)

    expect(fetchMock).toHaveBeenCalledWith('/api/point-cloud', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: 'scan', buildingId: 42, extension: 'e57' })
    expect(result.pointCloud.id).toBe(7)
  })

  it('surfaces the server text on failure', async () => {
    vi.stubGlobal('fetch', stubFetch({ ok: false, text: () => Promise.resolve('bucket missing') }))
    await expect(createPointCloud('scan', 'laz')).rejects.toThrow(/bucket missing/)
  })
})

describe('startConversion', () => {
  it('encodes the id and asks for poisson sampling', async () => {
    const fetchMock = stubFetch({ json: () => Promise.resolve({ jobId: 'job-1' }) })
    vi.stubGlobal('fetch', fetchMock)

    const result = await startConversion('http://api', 'a b')

    expect(fetchMock.mock.calls[0][0]).toBe('http://api/point-cloud/a%20b/convert-to-potree')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ options: { sampling_method: 'poisson' } })
    expect(result.jobId).toBe('job-1')
  })
})

describe('watchConversion', () => {
  it('reports progress events', () => {
    const onProgress = vi.fn()
    watchConversion('http://api', 'job-1', { onProgress })

    FakeEventSource.last!.emit('progress', { status: 'convert', progress: 40 })

    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ progress: 40 }))
    expect(FakeEventSource.last!.url).toBe('http://api/events/convert-progress/job-1')
  })

  it('treats a failed status on a progress event as a failure, since the service emits no failed event', () => {
    const onFailed = vi.fn()
    const onProgress = vi.fn()
    watchConversion('http://api', 'job-1', { onProgress, onFailed })

    FakeEventSource.last!.emit('progress', { status: 'failed', message: 'laszip error' })

    expect(onFailed).toHaveBeenCalledWith('laszip error')
    expect(onProgress).not.toHaveBeenCalled()
    expect(FakeEventSource.last!.closed).toBe(true)
  })

  it('treats a finished event carrying success false as a failure', () => {
    const onFinished = vi.fn()
    const onFailed = vi.fn()
    watchConversion('http://api', 'job-1', { onFinished, onFailed })

    FakeEventSource.last!.emit('finished', { status: 'finished', progress: 100, success: false, message: 'cleanup' })

    expect(onFinished).not.toHaveBeenCalled()
    expect(onFailed).toHaveBeenCalledWith('cleanup')
  })

  it('reports a successful finish and closes the stream', () => {
    const onFinished = vi.fn()
    watchConversion('http://api', 'job-1', { onFinished })

    FakeEventSource.last!.emit('finished', { status: 'finished', progress: 100, success: true })

    expect(onFinished).toHaveBeenCalledOnce()
    expect(FakeEventSource.last!.closed).toBe(true)
  })

  it('fails once on a dropped connection', () => {
    const onFailed = vi.fn()
    watchConversion('http://api', 'job-1', { onFailed })

    FakeEventSource.last!.onerror!()
    FakeEventSource.last!.onerror!()

    expect(onFailed).toHaveBeenCalledOnce()
  })

  it('ignores an unparsable payload rather than throwing', () => {
    const onProgress = vi.fn()
    const onFailed = vi.fn()
    watchConversion('http://api', 'job-1', { onProgress, onFailed })

    FakeEventSource.last!.emitRaw('progress', 'not json')

    expect(onProgress).not.toHaveBeenCalled()
    expect(onFailed).not.toHaveBeenCalled()
  })

  it('stops delivering after the caller closes', () => {
    const onProgress = vi.fn()
    const close = watchConversion('http://api', 'job-1', { onProgress })

    close()
    expect(FakeEventSource.last!.closed).toBe(true)
  })
})
