// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { fileIdentityGroup } from './fileIdentityGroup'

import type { DbFile } from '../../../../../../types/dbTypes'

const labels = {
  identity: 'Identity Data', name: 'Name', type: 'Type', extension: 'Extension',
  size: 'Size', uploaded: 'Uploaded', description: 'Description',
  'type_splat-file': 'Gaussian splat',
}

const file = (partial: Partial<DbFile>) => ({
  id: 41, name: 'scan.ply', type: 'splat-file', assetId: 'a',
  uploadedAt: '2026-09-02T14:21:00Z', fileOrganizationId: 1, ...partial,
} as DbFile)

describe('fileIdentityGroup', () => {
  it('lists the columns every file has', () => {
    const names = fileIdentityGroup(file({ extension: 'ply', sizeBytes: 1024 }), labels)
      .properties.map(property => property.name)
    expect(names).toEqual(['Name', 'Type', 'Extension', 'Size', 'Uploaded'])
  })

  it('renders a size in the largest unit that keeps it readable', () => {
    const group = fileIdentityGroup(file({ sizeBytes: 193_200_000 }), labels)
    expect(group.properties.find(property => property.name === 'Size')?.value).toBe('193.2 MB')
  })

  it('shows description only when it carries something', () => {
    const bare = fileIdentityGroup(file({}), labels).properties.map(property => property.name)
    expect(bare).not.toContain('Description')

    const full = fileIdentityGroup(file({ description: 'East wing' }), labels)
      .properties.map(property => property.name)
    expect(full).toContain('Description')
  })

  it('does not show a tag row', () => {
    const names = fileIdentityGroup(file({ tag: 'splat-file' }), labels).properties.map(property => property.name)
    expect(names).not.toContain('Tag')
  })

  it('keeps the identity-data id, so it opens by default like an element does', () => {
    expect(fileIdentityGroup(file({}), labels).id).toBe('identity-data')
  })

  it('translates the file type instead of showing the raw enum', () => {
    const group = fileIdentityGroup(file({ extension: 'ply' }), labels)
    expect(group.properties.find(property => property.name === 'Type')?.value).toBe('Gaussian splat')
  })

  it('does not render a size row for a zero or absent sizeBytes', () => {
    const zero = fileIdentityGroup(file({ sizeBytes: 0 }), labels).properties.map(property => property.name)
    expect(zero).not.toContain('Size')

    const absent = fileIdentityGroup(file({}), labels).properties.map(property => property.name)
    expect(absent).not.toContain('Size')
  })

  it('keeps the size units instead of a bare number', () => {
    const group = fileIdentityGroup(file({ sizeBytes: 193_200_000 }), labels)
    expect(group.properties.find(property => property.name === 'Size')?.value).toBe('193.2 MB')
  })

  it('renders the uploaded date as a full timestamp, not a truncated number', () => {
    const group = fileIdentityGroup(file({ uploadedAt: '2026-09-14T20:01:15Z' }), labels)
    const uploaded = group.properties.find(property => property.name === 'Uploaded')?.value
    expect(uploaded).toBe(new Date('2026-09-14T20:01:15Z').toLocaleString())
  })

  it('omits the uploaded row when uploadedAt does not parse', () => {
    const names = fileIdentityGroup(file({ uploadedAt: 'not-a-date' }), labels).properties.map(property => property.name)
    expect(names).not.toContain('Uploaded')
  })
})
