// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { fileIdentityGroup } from './fileIdentityGroup'

import type { DbFile } from '../../../../../../types/dbTypes'

const labels = {
  identity: 'Identity Data', name: 'Name', type: 'Type', extension: 'Extension',
  size: 'Size', uploaded: 'Uploaded', description: 'Description', tag: 'Tag',
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

  it('shows description and tag only when they carry something', () => {
    const bare = fileIdentityGroup(file({}), labels).properties.map(property => property.name)
    expect(bare).not.toContain('Description')

    const full = fileIdentityGroup(file({ description: 'East wing', tag: 'splat-file' }), labels)
      .properties.map(property => property.name)
    expect(full).toContain('Description')
    expect(full).toContain('Tag')
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
})
