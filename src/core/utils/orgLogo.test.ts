// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { orgLogoCandidates, orgLogoUrl } from './orgLogo'

describe('orgLogoUrl', () => {
  it('joins the base url, bucket and key', () => {
    expect(orgLogoUrl('https://s3.example', 'ets.png')).toBe('https://s3.example/org-logos/ets.png')
  })

  it('is undefined without a base url or key', () => {
    expect(orgLogoUrl(undefined, 'ets.png')).toBeUndefined()
    expect(orgLogoUrl('https://s3.example', null)).toBeUndefined()
  })
})

describe('orgLogoCandidates', () => {
  it('lists the png then svg convention name', () => {
    expect(orgLogoCandidates('https://s3.example', 'rideau-canal')).toEqual([
      'https://s3.example/org-logos/rideau-canal-logo.png',
      'https://s3.example/org-logos/rideau-canal-logo.svg',
    ])
  })

  it('is empty without a base url or org name', () => {
    expect(orgLogoCandidates(undefined, 'ets')).toEqual([])
    expect(orgLogoCandidates('https://s3.example', '')).toEqual([])
  })
})
