// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { SECTION_FOR_TYPE, typeOfFile, typeOfRecord } from './fileType'

import type { FileType } from './fileType'
import type { DbFile } from '../../../../types/dbTypes'

const record = (partial: Partial<DbFile>) => partial as DbFile
const picked = (name: string, mimeType = '') => new File([''], name, { type: mimeType })

describe('typeOfRecord', () => {
  it('reads a mis-stamped point cloud by its extension, not its type', () => {
    expect(typeOfRecord(record({ type: 'bim-file', extension: 'laz' }))).toBe('point-cloud-file')
  })

  it('reads a mis-stamped document by its extension too', () => {
    expect(typeOfRecord(record({ type: 'bim-file', extension: 'pdf' }))).toBe('document-file')
  })

  it('classifies each family', () => {
    const cases: [Partial<DbFile>, FileType][] = [
      [{ extension: 'ifc' }, 'bim-file'],
      [{ extension: 'frag' }, 'bim-file'],
      [{ extension: 'e57' }, 'point-cloud-file'],
      [{ extension: 'copc' }, 'point-cloud-file'],
      [{ extension: 'glb' }, '3d-file'],
      [{ extension: 'obj' }, '3d-file'],
      [{ extension: 'dxf' }, 'cad-file'],
      [{ extension: 'dwg' }, 'cad-file'],
      [{ extension: 'png' }, 'media-file'],
      [{ extension: 'mp4' }, 'media-file'],
      [{ extension: 'pdf' }, 'document-file'],
      [{ extension: 'csv' }, 'document-file'],
      [{ extension: 'weird' }, 'file'],
    ]
    for (const [partial, expected] of cases) {
      expect(typeOfRecord(record(partial)), partial.extension).toBe(expected)
    }
  })

  it('never reads a potree output artifact as a point cloud', () => {
    expect(typeOfRecord(record({ extension: 'bin' }))).toBe('file')
  })

  it('falls back to the mime prefix when the extension says nothing', () => {
    expect(typeOfRecord(record({ mimeType: 'image/png' }))).toBe('media-file')
    expect(typeOfRecord(record({ mimeType: 'audio/mpeg' }))).toBe('media-file')
  })

  it('falls back to the stored type only when nothing else identifies it', () => {
    expect(typeOfRecord(record({ type: 'bim-file' }))).toBe('bim-file')
    expect(typeOfRecord(record({ type: 'point-cloud-file' }))).toBe('point-cloud-file')
  })
})

describe('typeOfFile', () => {
  it('classifies a picked file by name', () => {
    expect(typeOfFile(picked('tower.ifc'))).toBe('bim-file')
    expect(typeOfFile(picked('scan.laz'))).toBe('point-cloud-file')
    expect(typeOfFile(picked('scan.e57'))).toBe('point-cloud-file')
    expect(typeOfFile(picked('plan.dxf'))).toBe('cad-file')
  })

  it('reads a compound copc name as a point cloud', () => {
    expect(typeOfFile(picked('scan.copc.laz'))).toBe('point-cloud-file')
    expect(typeOfFile(picked('scan.copc'))).toBe('point-cloud-file')
  })

  it('uses the browser mime type for an extensionless pick', () => {
    expect(typeOfFile(picked('clipboard', 'image/png'))).toBe('media-file')
  })
})

describe('SECTION_FOR_TYPE', () => {
  it('routes every type to a section', () => {
    expect(SECTION_FOR_TYPE['bim-file']).toBe('bim')
    expect(SECTION_FOR_TYPE['3d-file']).toBe('models')
    expect(SECTION_FOR_TYPE['point-cloud-file']).toBe('pointClouds')
    expect(SECTION_FOR_TYPE['cad-file']).toBe('files')
    expect(SECTION_FOR_TYPE['media-file']).toBe('files')
    expect(SECTION_FOR_TYPE['document-file']).toBe('files')
    expect(SECTION_FOR_TYPE.file).toBe('files')
  })
})
