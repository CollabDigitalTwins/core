import { describe, expect, it } from 'vitest'

import { BUILT_IN_MAP_STYLES, DEFAULT_MAP_STYLE, organizationDefaultMapStyle, resolveMapStyle } from './mapStyleCatalog'

const byName = (name: string) => BUILT_IN_MAP_STYLES.find(style => style.name === name)!

describe('organizationDefaultMapStyle', () => {
  it('returns the built-in style the organization names', () => {
    expect(organizationDefaultMapStyle('Dark')).toBe(byName('Dark'))
  })

  it('falls back to Satellite for null, undefined or an unknown name', () => {
    expect(organizationDefaultMapStyle(null)).toBe(DEFAULT_MAP_STYLE)
    expect(organizationDefaultMapStyle(undefined)).toBe(DEFAULT_MAP_STYLE)
    expect(organizationDefaultMapStyle('Nope' as never)).toBe(DEFAULT_MAP_STYLE)
    expect(DEFAULT_MAP_STYLE.name).toBe('Satellite')
  })
})

describe('resolveMapStyle', () => {
  it('uses the fallback when nothing is selected', () => {
    expect(resolveMapStyle(null, BUILT_IN_MAP_STYLES, byName('Positron'))).toBe(byName('Positron'))
  })

  it('keeps a selection that is in the catalog over the fallback', () => {
    expect(resolveMapStyle(byName('Streets'), BUILT_IN_MAP_STYLES, byName('Positron'))).toBe(byName('Streets'))
  })
})
