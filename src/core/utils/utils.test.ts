import { describe, it, expect } from 'vitest'
import { cn, getFileExtension } from './utils'

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })
  it('drops falsy values (clsx)', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c')
    expect(cn(['a', 'b'])).toBe('a b')
  })
  it('resolves conflicting Tailwind utilities (tailwind-merge keeps the last)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })
})

describe('getFileExtension', () => {
  const f = (name: string) => ({ name }) as File
  it('returns the lowercased extension', () => {
    expect(getFileExtension(f('photo.PNG'))).toBe('png')
    expect(getFileExtension(f('model.GLB'))).toBe('glb')
  })
  it('uses the last segment for multi-dot names', () => {
    expect(getFileExtension(f('archive.tar.gz'))).toBe('gz')
  })
  it('returns empty string when there is no extension', () => {
    expect(getFileExtension(f('README'))).toBe('')
  })
})
