import { normalizeElevation, getStoreyItemIds } from './utils'

describe('normalizeElevation', () => {
  // Bounds for these tests: minY=0, maxY=10
  it('returns the raw elevation when it is in-bounds without coord adjustment', () => {
    // raw=5, coordHeight=1000 (out of range with coord). raw alone is in-bounds → returned.
    expect(normalizeElevation(5, 1000, 0, 10)).toBe(5)
  })

  it('returns the coord-adjusted elevation when only that is in-bounds', () => {
    // raw=-100 (out), coordHeight=105 → elevWithCoord=5 (in).
    expect(normalizeElevation(-100, 105, 0, 10)).toBe(5)
  })

  it('returns the coord-adjusted elevation when both are in-bounds (default)', () => {
    expect(normalizeElevation(5, 1, 0, 10)).toBe(6)
  })

  it('converts millimetre-scale elevations to metres when far out of range', () => {
    // raw=5000 is far above maxY+200=210. inMeters=5 → in bounds. coordHeight=0 → returns 5.
    expect(normalizeElevation(5000, 0, 0, 10)).toBe(5)
  })

  it('leaves elevation alone if the metre conversion is also out of bounds', () => {
    // raw=100000, metres=100, still out of bounds → no conversion. Both raw and raw+coord out → returns raw+coord.
    expect(normalizeElevation(100000, 0, 0, 10)).toBe(100000)
  })
})

describe('getStoreyItemIds', () => {
  it('returns the array from getItemsByQuery on success', async () => {
    const model = { getItemsByQuery: vi.fn().mockResolvedValue([1, 2, 3]) }
    await expect(getStoreyItemIds(model, 99)).resolves.toEqual([1, 2, 3])
    expect(model.getItemsByQuery).toHaveBeenCalledTimes(1)
  })

  it('returns [] when getItemsByQuery returns a non-array', async () => {
    const model = { getItemsByQuery: vi.fn().mockResolvedValue(null) }
    await expect(getStoreyItemIds(model, 99)).resolves.toEqual([])
  })

  it('returns [] when getItemsByQuery throws', async () => {
    const model = { getItemsByQuery: vi.fn().mockRejectedValue(new Error('relation not indexed')) }
    await expect(getStoreyItemIds(model, 99)).resolves.toEqual([])
  })
})
