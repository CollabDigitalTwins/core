// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { userUsageToCsv } from './usageCsv'

describe('userUsageToCsv', () => {
  it('labels unattributed rows and neutralises formula-like names', () => {
    const csv = userUsageToCsv([
      { userId: null, name: null, email: null, organizationName: 'acme', organizationTitle: 'Acme', storedGB: 1.5, fileCount: 3, lastUploadAt: null },
      { userId: 2, name: '=HYPERLINK()', email: 'x@acme.org', organizationName: 'acme', organizationTitle: null, storedGB: 0.25, fileCount: 1, lastUploadAt: '2026-10-05T00:00:00.000Z' },
    ])
    expect(csv.split('\r\n')).toEqual([
      'user,email,organization,stored_gb,files,last_upload',
      'unattributed,,Acme,1.5,3,',
      "'=HYPERLINK(),x@acme.org,acme,0.25,1,2026-10-05T00:00:00.000Z",
    ])
  })
})
