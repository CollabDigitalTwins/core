// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { downloadFile, downloadDbFile, downloadFromUrl, downloadBlobUrl } from './downloadUtils'

vi.mock('../viewers/map/utils/dateName', () => ({
  dateName: (name: string) => `STAMP_${name}`,
}))

function lastAnchor(): HTMLAnchorElement {
  return document.body.querySelector('a:last-of-type') as HTMLAnchorElement
}

describe('downloadFile', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>
  let appendSpy: ReturnType<typeof vi.spyOn>
  let removeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    appendSpy = vi.spyOn(document.body, 'appendChild')
    removeSpy = vi.spyOn(document.body, 'removeChild')
  })

  afterEach(() => {
    clickSpy.mockRestore()
    appendSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('creates an anchor, sets href + download, clicks, and removes it', () => {
    downloadFile('http://x.com/file.bin', 'report.csv', { useOriginalName: true })
    expect(appendSpy).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(removeSpy).toHaveBeenCalledTimes(1)
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.href).toBe('http://x.com/file.bin')
    expect(anchor.download).toBe('report.csv')
  })

  it('adds a timestamp by default', () => {
    downloadFile('http://x.com/file.bin', 'report.csv')
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe('STAMP_report.csv')
  })

  it('replaces the file extension when customExtension is supplied', () => {
    downloadFile('http://x.com/file.bin', 'report.csv', { useOriginalName: true, customExtension: 'json' })
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe('report.json')
  })

  it('combines timestamp and customExtension', () => {
    downloadFile('http://x.com/file.bin', 'report.csv', { customExtension: 'json' })
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe('STAMP_report.json')
  })
})

describe('downloadDbFile / downloadFromUrl / downloadBlobUrl', () => {
  let appendSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    appendSpy = vi.spyOn(document.body, 'appendChild')
  })

  afterEach(() => vi.restoreAllMocks())

  it('downloadDbFile pulls url + name from the file row', () => {
    downloadDbFile({ url: 'http://x.com/a', name: 'a.csv' } as any, { useOriginalName: true })
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.href).toBe('http://x.com/a')
    expect(anchor.download).toBe('a.csv')
  })

  it('downloadFromUrl forwards args', () => {
    downloadFromUrl('http://x.com/b', 'b.csv', { useOriginalName: true })
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.href).toBe('http://x.com/b')
    expect(anchor.download).toBe('b.csv')
  })

  it('downloadBlobUrl applies an explicit extension', () => {
    downloadBlobUrl('blob:abc', 'snapshot', 'png', { useOriginalName: true })
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe('snapshot.png')
  })
})
