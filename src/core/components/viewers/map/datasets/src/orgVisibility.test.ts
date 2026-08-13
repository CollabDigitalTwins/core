// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DatasetGroup } from '../../../../../types/dbTypes'

import { datasetVisibleForOrg, getOrgVisibility } from './orgVisibility'

import type { Dataset } from '../../../../../types/datasetTypes'

function orgDataset(organization?: number): Dataset {
  return {
    name: 'roads',
    dataManagementSystem: 'other',
    group: DatasetGroup.Organizational,
    organization,
  } as Dataset
}

describe('getOrgVisibility', () => {
  it('treats the /cdt path as admin', () => {
    const v = getOrgVisibility('/cdt/map')
    expect(v.isAdmin).toBe(true)
  })

  it('is not admin on an organization path', () => {
    expect(getOrgVisibility('/carleton').isAdmin).toBe(false)
  })

  it('resolves a known path prefix to its organization', () => {
    expect(getOrgVisibility('/carleton').currentOrgId).toBe(6)
  })

  it('always allows the shared organization 2', () => {
    expect(getOrgVisibility('/carleton').allowedOrgIds).toContain(2)
  })

  it('prefers the supplied organization over the path prefix table', () => {
    expect(getOrgVisibility('/arts-ottawa', 27).currentOrgId).toBe(27)
  })

  it('allows an organization that is absent from the path prefix table', () => {
    expect(getOrgVisibility('/arts-ottawa', 27).allowedOrgIds).toContain(27)
  })

  it('falls back to the prefix table when no organization is supplied', () => {
    expect(getOrgVisibility('/carleton', undefined).currentOrgId).toBe(6)
  })

  it('accepts a numeric string organization id', () => {
    expect(getOrgVisibility('/arts-ottawa', '27').currentOrgId).toBe(27)
  })
})

describe('datasetVisibleForOrg', () => {
  it('shows every dataset to an admin', () => {
    expect(datasetVisibleForOrg(orgDataset(99), getOrgVisibility('/cdt'))).toBe(true)
  })

  it('shows non-organizational datasets to everyone', () => {
    const open = { name: 'x', dataManagementSystem: 'other', group: DatasetGroup.National } as Dataset
    expect(datasetVisibleForOrg(open, getOrgVisibility('/carleton'))).toBe(true)
  })

  it('hides an organizational dataset belonging to another organization', () => {
    expect(datasetVisibleForOrg(orgDataset(99), getOrgVisibility('/carleton'))).toBe(false)
  })

  it('hides an organizational dataset with no organization recorded', () => {
    expect(datasetVisibleForOrg(orgDataset(undefined), getOrgVisibility('/carleton'))).toBe(false)
  })

  it("shows a member their own organization's dataset", () => {
    expect(datasetVisibleForOrg(orgDataset(27), getOrgVisibility('/arts-ottawa', 27))).toBe(true)
  })
})
