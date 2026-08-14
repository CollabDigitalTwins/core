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
  it('takes the organization it is given', () => {
    expect(getOrgVisibility(27).currentOrgId).toBe(27)
  })

  it('accepts a numeric string organization id', () => {
    expect(getOrgVisibility('27').currentOrgId).toBe(27)
  })

  it('resolves no organization when none is supplied', () => {
    expect(getOrgVisibility(undefined).currentOrgId).toBeUndefined()
  })
})

describe('datasetVisibleForOrg', () => {
  it("shows a member their own organization's dataset", () => {
    expect(datasetVisibleForOrg(orgDataset(27), getOrgVisibility(27))).toBe(true)
  })

  it('hides an organizational dataset belonging to another organization', () => {
    expect(datasetVisibleForOrg(orgDataset(99), getOrgVisibility(27))).toBe(false)
  })

  it('hides an organizational dataset with no organization recorded', () => {
    expect(datasetVisibleForOrg(orgDataset(undefined), getOrgVisibility(27))).toBe(false)
  })

  it('hides every organizational dataset when the viewer has no organization', () => {
    expect(datasetVisibleForOrg(orgDataset(27), getOrgVisibility(undefined))).toBe(false)
  })

  it('shows non-organizational datasets to everyone', () => {
    const open = { name: 'x', dataManagementSystem: 'other', group: DatasetGroup.National } as Dataset
    expect(datasetVisibleForOrg(open, getOrgVisibility(27))).toBe(true)
  })

  it('grants no cross-organization view to any path', () => {
    // The /cdt path used to return isAdmin and unlock organizations 1-6.
    expect(datasetVisibleForOrg(orgDataset(1), getOrgVisibility(27))).toBe(false)
  })

  it('grants no blanket visibility to the organization that used to be shared', () => {
    expect(datasetVisibleForOrg(orgDataset(2), getOrgVisibility(27))).toBe(false)
  })
})
