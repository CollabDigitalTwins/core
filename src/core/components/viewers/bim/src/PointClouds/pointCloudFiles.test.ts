// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import {
  POINT_CLOUD_ACCEPT,
  isPointCloudFile,
  isRenderablePointCloud,
  stripPointCloudExtension,
  uniquePointCloudName,
} from './pointCloudFiles'

import type { DbFile } from '../../../../../types/dbTypes'

const file = (partial: Partial<DbFile>) => partial as DbFile

describe('isRenderablePointCloud', () => {
  it('accepts converted las, laz and e57 whatever the case', () => {
    expect(isRenderablePointCloud(file({ extension: 'LAZ', pointCloudPotreeConverted: true }))).toBe(true)
    expect(isRenderablePointCloud(file({ extension: 'las', pointCloudPotreeConverted: true }))).toBe(true)
    expect(isRenderablePointCloud(file({ extension: 'E57', pointCloudPotreeConverted: true }))).toBe(true)
  })

  it('rejects an unconverted cloud', () => {
    expect(isRenderablePointCloud(file({ extension: 'laz', pointCloudPotreeConverted: false }))).toBe(false)
    expect(isRenderablePointCloud(file({ extension: 'laz' }))).toBe(false)
  })

  it('rejects other extensions and files with none', () => {
    expect(isRenderablePointCloud(file({ extension: 'ifc', pointCloudPotreeConverted: true }))).toBe(false)
    expect(isRenderablePointCloud(file({ pointCloudPotreeConverted: true }))).toBe(false)
  })
})

describe('isPointCloudFile', () => {
  it('accepts a cloud that has not been converted yet', () => {
    expect(isPointCloudFile(file({ extension: 'laz' }))).toBe(true)
    expect(isPointCloudFile(file({ extension: 'e57', pointCloudPotreeConverted: false }))).toBe(true)
  })

  it('still rejects non-cloud extensions', () => {
    expect(isPointCloudFile(file({ extension: 'ifc' }))).toBe(false)
    expect(isPointCloudFile(file({}))).toBe(false)
  })
})

describe('POINT_CLOUD_ACCEPT', () => {
  it('lists every accepted extension for a file input', () => {
    expect(POINT_CLOUD_ACCEPT).toBe('.las,.laz,.e57')
  })
})

describe('stripPointCloudExtension', () => {
  it('drops only a trailing cloud extension, case insensitively', () => {
    expect(stripPointCloudExtension('scan.LAZ')).toBe('scan')
    expect(stripPointCloudExtension('bay.3.e57')).toBe('bay.3')
  })

  it('leaves a name with no cloud extension alone', () => {
    expect(stripPointCloudExtension('model.ifc')).toBe('model.ifc')
    expect(stripPointCloudExtension('laz.scan')).toBe('laz.scan')
  })
})

describe('uniquePointCloudName', () => {
  it('returns the base name when it is free', () => {
    expect(uniquePointCloudName('scan', ['other'])).toBe('scan')
  })

  it('suffixes past every name already taken', () => {
    expect(uniquePointCloudName('scan', ['scan'])).toBe('scan (1)')
    expect(uniquePointCloudName('scan', ['scan', 'scan (1)', 'scan (2)'])).toBe('scan (3)')
  })
})

describe('classification by file type', () => {
  it('accepts a converter-created cloud that has no extension recorded', () => {
    const converterRow = file({ type: 'point-cloud-file', pointCloudPotreeConverted: true })

    expect(isPointCloudFile(converterRow)).toBe(true)
    expect(isRenderablePointCloud(converterRow)).toBe(true)
  })

  it('matches the type whatever the case', () => {
    expect(isPointCloudFile(file({ type: 'Point-Cloud-File' }))).toBe(true)
  })

  it('still requires conversion even when the type says point cloud', () => {
    expect(isRenderablePointCloud(file({ type: 'point-cloud-file' }))).toBe(false)
  })

  it('does not claim a file of another type with no cloud extension', () => {
    expect(isPointCloudFile(file({ type: 'system', extension: 'pdf' }))).toBe(false)
    expect(isPointCloudFile(file({ type: 'bim-file', extension: 'ifc' }))).toBe(false)
  })
})
