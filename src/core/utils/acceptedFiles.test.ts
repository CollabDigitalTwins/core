import { describe, it, expect } from 'vitest'
import { isAcceptedFileType, acceptedFiles } from './acceptedFiles'

// isAcceptedFileType only reads `.name` and `.type`, so a minimal stub stands in for File.
const f = (name: string, type = '') => ({ name, type }) as unknown as File

describe('isAcceptedFileType', () => {
  it('accepts by extension (case-insensitive)', () => {
    expect(isAcceptedFileType(f('model.GLB'))).toBe(true)
    expect(isAcceptedFileType(f('a.ifc'))).toBe(true)
    expect(isAcceptedFileType(f('photo.jpeg'))).toBe(true)
  })

  it('accepts by MIME type when the extension is unknown', () => {
    expect(isAcceptedFileType(f('blob', 'application/pdf'))).toBe(true)
    expect(isAcceptedFileType(f('weird.xyz', 'image/png'))).toBe(true)
  })

  it('rejects an unknown extension with unknown/empty MIME', () => {
    expect(isAcceptedFileType(f('archive.zip'))).toBe(false)
    expect(isAcceptedFileType(f('noextension'))).toBe(false)
    expect(isAcceptedFileType(f('a.exe', 'application/x-msdownload'))).toBe(false)
  })

  it('acceptedFiles is the joined extension+MIME accept string', () => {
    expect(acceptedFiles).toContain('.ifc')
    expect(acceptedFiles).toContain('application/pdf')
    expect(acceptedFiles.split(',').length).toBeGreaterThan(20)
  })
})
