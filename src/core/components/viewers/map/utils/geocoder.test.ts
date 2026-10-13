// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { addressFieldsFromPlace } from './geocoder'

describe('addressFieldsFromPlace', () => {
  it('reads the street, region code, locality and postal code of a geocoder place', () => {
    const fields = addressFieldsFromPlace(
      { street: 'Colonel By Drive', region_a: 'ON', region: 'Ontario', locality: 'Ottawa', postalcode: 'K1S 5B6' },
      '1125 Colonel By Drive, Ottawa, ON, Canada',
    )

    expect(fields).toEqual({
      buildingAddress: '1125 Colonel By Drive, Ottawa, ON, Canada',
      buildingStreetName: 'Colonel By Drive',
      buildingCountrySubdivision: 'ON',
      buildingMunicipality: 'Ottawa',
      buildingPostalCode: 'K1S 5B6',
    })
  })

  it('falls back to the region name and county when the codes are missing', () => {
    const fields = addressFieldsFromPlace({ region: 'Ontario', county: 'Carleton' }, 'Somewhere')

    expect(fields.buildingCountrySubdivision).toBe('Ontario')
    expect(fields.buildingMunicipality).toBe('Carleton')
  })

  it('leaves out fields the place does not carry', () => {
    expect(addressFieldsFromPlace(undefined, '')).toEqual({})
  })
})
