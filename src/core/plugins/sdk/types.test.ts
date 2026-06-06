import { validateManifest } from './types'

describe('validateManifest', () => {
  const validManifest = {
    slug: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    capabilities: ['sidebar.items'],
  }

  it('accepts a valid manifest', () => {
    expect(validateManifest(validManifest)).toEqual({ valid: true, errors: [] })
  })

  it('rejects manifest missing slug', () => {
    const { slug, ...noSlug } = validManifest
    const result = validateManifest(noSlug)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('slug is required')
  })

  it('rejects manifest missing name', () => {
    const { name, ...noName } = validManifest
    const result = validateManifest(noName)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('name is required')
  })

  it('rejects manifest missing version', () => {
    const { version, ...noVersion } = validManifest
    const result = validateManifest(noVersion)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('version is required')
  })

  it('rejects manifest with invalid capability', () => {
    const result = validateManifest({ ...validManifest, capabilities: ['invalid.thing'] })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/invalid capability/)
  })

  it('rejects api.routes capability (removed in framework trim)', () => {
    const result = validateManifest({ ...validManifest, capabilities: ['api.routes'] })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/invalid capability/)
  })

  it('rejects manifest with empty capabilities', () => {
    const result = validateManifest({ ...validManifest, capabilities: [] })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('at least one capability is required')
  })
})
