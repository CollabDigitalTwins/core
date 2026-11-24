import { describe, expect, it } from 'vitest'

import { foldForSearch } from './foldForSearch'

describe('foldForSearch', () => {
  it('ignores case and accents', () => {
    expect(foldForSearch('Québec')).toBe(foldForSearch('QUEBEC'))
    expect(foldForSearch('SÉNSOR')).toBe('sensor')
  })
})
