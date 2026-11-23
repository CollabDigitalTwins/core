// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { arcgisLayerUrl } from '../../viewers/map/datasets/src/arcgisLayer'
import { rendererField } from '../../viewers/map/utils/datasetStyle'

import { DEMO_DELAY_MS } from './platformHost'
import { createZoningDemo, createZoningMenuDemo, restoreZoningSearch, zoningAlreadyApplied, zoningLoadFailed, zoningMenuOwnsDataset } from './zoningDemo'

import type { DatasetPort, ZoningStage } from './zoningDemo'
import type { Dataset, FieldProfile } from '../../../types/datasetTypes'

const ZONING_LAYER_URL = 'https://services.arcgis.com/G6F8XLCl5KtAlZ2G/ArcGIS/rest/services/IM_ExistingColourZoning_Sept25/FeatureServer/0'
const ZONING_SEARCH = 'Existing Colour Zoning'
const ZONING_ID = `url-arcgis:${arcgisLayerUrl(ZONING_LAYER_URL)}`
const CATALOGUE_ID = 'catalogue-zoning'
const STAGES: ZoningStage[] = ['load', 'legend', 'layer', 'colour', 'style', 'remove']
const FRAME = 16

const profile = (name: string, distinctValues: string[]): FieldProfile =>
  ({ name, type: 'string', isId: false, nullCount: 0, distinctValues })

const zoningDataset = (): Dataset => ({
  id: ZONING_ID,
  name: 'Zoning',
  layerType: 'fill',
  layerColor: { color: '#0d9488', nameColor: '#0d9488' },
  fields: [profile('ZONE_MAIN', ['R1', 'R2', 'GM']), profile('ZONE_CODE', ['R1A', 'R2B', 'GM[2]'])],
} as unknown as Dataset)

function fakePort(seed: Dataset[] = []) {
  let applied = seed
  const port = {
    applied: () => applied,
    add: vi.fn((dataset: Dataset) => { applied = [...applied, dataset] }),
    update: vi.fn((name: string, changes: Partial<Dataset>) => {
      applied = applied.map(d => (d.name === name ? { ...d, ...changes } : d))
    }),
    remove: vi.fn((id: string) => { applied = applied.filter(d => d.id !== id) }),
  } satisfies DatasetPort
  return port
}

function deferredLoad() {
  let resolve: (dataset: Dataset) => void = () => {}
  let reject: (error: Error) => void = () => {}
  const load = vi.fn(() => new Promise<Dataset>((done, fail) => {
    resolve = done
    reject = fail
  }))
  return { load, resolve: (dataset = zoningDataset()) => resolve(dataset), reject: () => reject(new Error('offline')) }
}

const clicks: string[] = []

function renderRow() {
  document.body.innerHTML = `
    <li data-tour="dataset-row:${ZONING_ID}">
      <button data-tour="dataset-style" aria-expanded="false"></button>
      <button data-tour="dataset-remove"></button>
      <div data-tour="dataset-style-panel"><button data-tour="dataset-more-style" aria-expanded="false"></button></div>
    </li>`
  document.querySelectorAll<HTMLElement>('[data-tour]').forEach(el => el.addEventListener('click', () => clicks.push(el.dataset.tour ?? '')))
}

const flush = () => vi.advanceTimersByTimeAsync(0)

function setup(seed: Dataset[] = []) {
  const port = fakePort(seed)
  const loader = deferredLoad()
  const fly = vi.fn()
  return { port, loader, fly, demo: createZoningDemo(port, { load: loader.load, fly }) }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), FRAME))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  clicks.length = 0
  renderRow()
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

const TYPING_MS = 70

const rowHtml = (name: string, state: string) =>
  `<tr><td>${name}</td><td><span data-tour="dataset-apply"><button data-state="${state}" data-name="${name}"></button></span></td></tr>`

function renderDialog(state: 'checked' | 'unchecked', onBoxClick: (box: Element) => void = () => {}, extraRows = '') {
  document.body.innerHTML = `
    <div data-tour="datasets-search"><input value="" /></div>
    <button data-tour="datasets-tab-municipal"></button>
    <button data-tour="datasets-tab-applied"></button>
    <div data-tour="datasets-list"><table><tbody>${extraRows}${rowHtml('Existing Colour Zoning', state)}</tbody></table></div>`
  document.querySelectorAll<HTMLElement>('[data-tour]').forEach(el => el.addEventListener('mousedown', () => clicks.push(`down:${el.dataset.tour}`)))
  document.querySelectorAll('[data-tour="dataset-apply"] button').forEach(box => box.addEventListener('click', () => onBoxClick(box)))
}

const searchValue = () => document.querySelector<HTMLInputElement>('[data-tour="datasets-search"] input')?.value

const named = (id: string, name: string) => ({ ...zoningDataset(), id, name }) as Dataset

describe('createZoningMenuDemo', () => {
  it('types the zoning search on the municipal tab', () => {
    renderDialog('unchecked')
    const close = createZoningMenuDemo(fakePort())('find')
    expect(clicks).toContain('down:datasets-tab-municipal')
    vi.advanceTimersByTime(ZONING_SEARCH.length * TYPING_MS)
    expect(searchValue()).toBe(ZONING_SEARCH)
    close()
    vi.advanceTimersByTime(FRAME)
  })

  it('ticks only an unticked row and undoes it', () => {
    const port = fakePort()
    renderDialog('unchecked', () => port.add(named(ZONING_ID, 'Existing Colour Zoning')))
    const demo = createZoningMenuDemo(port)
    const closeFind = demo('find')
    vi.advanceTimersByTime(ZONING_SEARCH.length * TYPING_MS)
    const close = demo('apply')
    closeFind()
    expect(zoningMenuOwnsDataset()).toBe(true)
    close()
    vi.advanceTimersByTime(FRAME)
    expect(port.remove).toHaveBeenCalledWith(ZONING_ID)
    expect(searchValue()).toBe('')
    expect(zoningMenuOwnsDataset()).toBe(false)
  })

  it('sets the search itself when apply is reached before typing finished', () => {
    const port = fakePort()
    renderDialog('unchecked', () => port.add(named(ZONING_ID, 'Existing Colour Zoning')))
    const close = createZoningMenuDemo(port)('apply')
    expect(searchValue()).toBe(ZONING_SEARCH)
    close()
    vi.advanceTimersByTime(FRAME)
  })

  it('unticks the zoning row, not an earlier applied dataset', () => {
    const other = named('other', 'Parks')
    const port = fakePort([other])
    const toggle = (box: Element) => {
      if (box.getAttribute('data-name') === 'Parks') { box.setAttribute('data-state', 'unchecked'); port.remove('other'); return }
      const on = box.getAttribute('data-state') === 'checked'
      box.setAttribute('data-state', on ? 'unchecked' : 'checked')
      if (on) port.remove(ZONING_ID)
      else port.add(named(ZONING_ID, 'Existing Colour Zoning'))
    }
    renderDialog('unchecked', toggle, rowHtml('Parks', 'checked'))
    const demo = createZoningMenuDemo(port)
    const closeApply = demo('apply')
    const closeApplied = demo('applied')
    closeApply()
    expect(clicks).toContain('down:datasets-tab-applied')
    expect(port.applied().map(d => d.id)).toEqual(['other', ZONING_ID])
    const close = demo('remove')
    closeApplied()
    expect(port.applied().map(d => d.id)).toEqual(['other'])
    expect(zoningMenuOwnsDataset()).toBe(false)
    close()
    vi.advanceTimersByTime(FRAME)
    expect(port.applied().map(d => d.id)).toEqual(['other'])
  })

  it('records ownership when the dataset lands a few frames after the press', () => {
    const port = fakePort()
    renderDialog('unchecked', () => { setTimeout(() => port.add(named(ZONING_ID, 'Existing Colour Zoning')), FRAME * 5) })
    const close = createZoningMenuDemo(port)('apply')
    expect(zoningMenuOwnsDataset()).toBe(false)
    vi.advanceTimersByTime(FRAME * 8)
    expect(zoningMenuOwnsDataset()).toBe(true)
    close()
    vi.advanceTimersByTime(FRAME)
    expect(port.applied()).toEqual([])
  })

  it('removes a dataset that lands after the demo was released', () => {
    const port = fakePort()
    renderDialog('unchecked', () => { setTimeout(() => port.add(named(CATALOGUE_ID, 'Existing Colour Zoning')), FRAME * 5) })
    createZoningMenuDemo(port)('apply')()
    vi.advanceTimersByTime(FRAME * 10)
    expect(port.add).toHaveBeenCalledOnce()
    expect(port.applied()).toEqual([])
  })

  it('leaves the legend demo\'s zoning layer alone when it lands after the demo was released', () => {
    const port = fakePort()
    renderDialog('unchecked')
    createZoningMenuDemo(port)('apply')()
    vi.advanceTimersByTime(FRAME)
    port.add(named(ZONING_ID, 'Existing Colour Zoning'))
    vi.advanceTimersByTime(FRAME * 10)
    expect(port.applied().map(d => d.id)).toEqual([ZONING_ID])
  })

  it('puts back the search the person had typed when it leaves', () => {
    renderDialog('unchecked')
    const input = document.querySelector<HTMLInputElement>('[data-tour="datasets-search"] input')!
    input.value = 'parks'
    const close = createZoningMenuDemo(fakePort())('find')
    vi.advanceTimersByTime(ZONING_SEARCH.length * TYPING_MS)
    close()
    vi.advanceTimersByTime(FRAME)
    expect(searchValue()).toBe('parks')
  })

  it('puts back the search at once on request while the demo holds, and not after it let go', () => {
    renderDialog('unchecked')
    const input = document.querySelector<HTMLInputElement>('[data-tour="datasets-search"] input')!
    input.value = 'parks'
    const close = createZoningMenuDemo(fakePort())('find')
    vi.advanceTimersByTime(ZONING_SEARCH.length * TYPING_MS)
    restoreZoningSearch()
    expect(searchValue()).toBe('parks')
    close()
    vi.advanceTimersByTime(FRAME)
    input.value = 'later'
    restoreZoningSearch()
    expect(searchValue()).toBe('later')
  })

  it('does not own a dataset the person ticks themselves', () => {
    const port = fakePort()
    renderDialog('unchecked', () => { port.add(named('mine', 'Parks')); port.add(named(ZONING_ID, 'Existing Colour Zoning')) })
    const close = createZoningMenuDemo(port)('apply')
    close()
    vi.advanceTimersByTime(FRAME)
    expect(port.applied().map(d => d.id)).toEqual(['mine'])
  })

  it('points only at a row that was already ticked', () => {
    const port = fakePort([zoningDataset()])
    renderDialog('checked', () => port.remove(ZONING_ID))
    const demo = createZoningMenuDemo(port)
    const close = demo('apply')
    const closeRemove = demo('remove')
    close()
    closeRemove()
    vi.advanceTimersByTime(FRAME)
    expect(port.remove).not.toHaveBeenCalled()
    expect(port.applied()).toHaveLength(1)
  })
})

function renderLegendCard(expanded: boolean) {
  const card = document.createElement('div')
  card.dataset.tour = 'legend-applied'
  const toggle = document.createElement('button')
  toggle.setAttribute('aria-expanded', String(expanded))
  toggle.addEventListener('click', () => toggle.setAttribute('aria-expanded', String(toggle.getAttribute('aria-expanded') !== 'true')))
  card.append(toggle)
  document.body.append(card)
  return toggle
}

describe('createZoningDemo', () => {
  async function loadedLegend(expanded: boolean) {
    const toggle = renderLegendCard(expanded)
    const { loader, demo } = setup()
    const closeLoad = demo('load')
    loader.resolve()
    await flush()
    const close = demo('legend')
    closeLoad()
    return { toggle, close }
  }

  it('expands the collapsed legend card and folds it back on leave', async () => {
    const { toggle, close } = await loadedLegend(false)
    vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    close()
    vi.advanceTimersByTime(FRAME)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('leaves an already-open legend card open on leave', async () => {
    const { toggle, close } = await loadedLegend(true)
    vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    close()
    vi.advanceTimersByTime(FRAME)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it.each(['layer', 'colour', 'style'] as const)('opens a folded legend card when jumping straight to the %s step', async stage => {
    const row = document.querySelector(`[data-tour="dataset-row:${ZONING_ID}"]`)!
    row.remove()
    const toggle = renderLegendCard(false)
    toggle.addEventListener('click', () => { if (toggle.getAttribute('aria-expanded') === 'true') document.body.append(row) })
    const { loader, demo } = setup()
    const closeLoad = demo('load')
    loader.resolve()
    await flush()
    const close = demo(stage)
    closeLoad()
    vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME * 3)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(clicks).toContain('dataset-style')
    close()
    vi.advanceTimersByTime(FRAME)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('removes the layer even when the tour expanded the legend', async () => {
    const row = document.querySelector(`[data-tour="dataset-row:${ZONING_ID}"]`)!
    const toggle = renderLegendCard(false)
    toggle.addEventListener('click', () => { if (toggle.getAttribute('aria-expanded') === 'false') row.remove() })
    let removedWhileMounted = false
    row.querySelector('[data-tour="dataset-remove"]')?.addEventListener('click', () => { removedWhileMounted = row.isConnected })
    const { loader, demo } = setup()
    const closeLoad = demo('load')
    loader.resolve()
    await flush()
    const closeLegend = demo('legend')
    closeLoad()
    vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    const close = demo('remove')
    closeLegend()
    vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    expect(removedWhileMounted).toBe(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    close()
    vi.advanceTimersByTime(FRAME)
  })

  it('leaves the legend state alone once removing the last layer unmounts the card', async () => {
    const toggle = renderLegendCard(false)
    document.querySelector('[data-tour="dataset-remove"]')?.addEventListener('click', () => {
      toggle.closest('[data-tour="legend-applied"]')?.remove()
    })
    const { loader, demo } = setup()
    const closeLoad = demo('load')
    loader.resolve()
    await flush()
    const closeLegend = demo('legend')
    closeLoad()
    vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const close = demo('remove')
    closeLegend()
    vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    expect(clicks).toContain('dataset-remove')
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    close()
    vi.advanceTimersByTime(FRAME)
  })

  it("expands the layer's style", async () => {
    const { loader, demo } = setup()
    const closeLoad = demo('load')
    loader.resolve()
    await flush()
    const close = demo('layer')
    closeLoad()
    vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    expect(clicks).toContain('dataset-style')
    close()
    vi.advanceTimersByTime(FRAME)
  })

  it('adds the zoning dataset once across the whole sequence', async () => {
    const { port, loader, fly, demo } = setup()
    let close = demo('load')
    for (const stage of STAGES.slice(1)) {
      close()
      close = demo(stage)
    }
    loader.resolve()
    await flush()
    expect(loader.load).toHaveBeenCalledOnce()
    expect(loader.load).toHaveBeenCalledWith(ZONING_LAYER_URL)
    expect(fly).toHaveBeenCalledOnce()
    expect(port.add).toHaveBeenCalledOnce()
    close()
    vi.advanceTimersByTime(FRAME)
  })

  it('colours by ZONE_MAIN', async () => {
    const { port, loader, demo } = setup()
    const closeLoad = demo('load')
    loader.resolve()
    await flush()
    const close = demo('colour')
    closeLoad()
    vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    expect(clicks).toContain('dataset-style')
    expect(rendererField(port.applied()[0].style!.renderer)).toBe('ZONE_MAIN')
    close()
    vi.advanceTimersByTime(FRAME)
  })

  it('labels with ZONE_CODE and restyles', async () => {
    const { port, loader, demo } = setup()
    const closeLoad = demo('load')
    loader.resolve()
    await flush()
    const close = demo('style')
    closeLoad()
    vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    const style = port.applied()[0].style!
    expect(clicks).toContain('dataset-more-style')
    expect(style.label?.field).toBe('ZONE_CODE')
    expect(style.opacity).toBe(0.6)
    close()
    vi.advanceTimersByTime(FRAME)
  })

  it('presses the row\'s remove button', async () => {
    const { loader, demo } = setup()
    const closeLoad = demo('load')
    loader.resolve()
    await flush()
    const close = demo('remove')
    closeLoad()
    vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    expect(clicks).toContain('dataset-remove')
    close()
    vi.advanceTimersByTime(FRAME)
  })

  it('removes the dataset when the person leaves the sequence', async () => {
    const { port, loader, demo } = setup()
    const close = demo('load')
    loader.resolve()
    await flush()
    close()
    expect(port.remove).not.toHaveBeenCalled()
    vi.advanceTimersByTime(FRAME)
    expect(port.remove).toHaveBeenCalledWith(ZONING_ID)
    expect(port.applied()).toEqual([])
  })

  it('removes a dataset that arrives after the demo ended', async () => {
    const { port, loader, demo } = setup()
    demo('load')()
    vi.advanceTimersByTime(FRAME)
    loader.resolve()
    await flush()
    expect(port.add).not.toHaveBeenCalled()
    expect(port.applied()).toEqual([])
  })

  it('cancels a stage\'s pending restyle when it closes', async () => {
    const { port, loader, demo } = setup()
    const closeLoad = demo('load')
    loader.resolve()
    await flush()
    const close = demo('colour')
    closeLoad()
    close()
    vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    expect(port.update).not.toHaveBeenCalled()
  })

  it('adds the layer back when the person goes back after removing it', async () => {
    const { port, loader, demo } = setup()
    const closeLoad = demo('load')
    loader.resolve()
    await flush()
    const closeRemove = demo('remove')
    closeLoad()
    vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    port.remove(ZONING_ID)
    const close = demo('style')
    closeRemove()
    loader.resolve()
    await flush()
    expect(loader.load).toHaveBeenCalledTimes(2)
    expect(port.add).toHaveBeenCalledTimes(2)
    expect(port.applied().map(d => d.id)).toEqual([ZONING_ID])
    close()
    vi.advanceTimersByTime(FRAME)
    expect(port.applied()).toEqual([])
  })

  it('does nothing more after the load fails', async () => {
    const { port, loader, demo } = setup()
    document.querySelectorAll('[data-tour="dataset-style"], [data-tour="dataset-more-style"]').forEach(el => el.remove())
    let close = demo('load')
    loader.reject()
    await flush()
    for (const stage of STAGES.slice(1)) {
      close()
      close = demo(stage)
      vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    }
    expect(vi.getTimerCount()).toBe(0)
    close()
    vi.advanceTimersByTime(FRAME)
    expect(loader.load).toHaveBeenCalledOnce()
    expect(port.add).not.toHaveBeenCalled()
    expect(port.update).not.toHaveBeenCalled()
    expect(clicks).toEqual([])
  })

  it('keeps reporting the failed load after it lets go, until it starts again', async () => {
    const { loader, demo } = setup()
    const close = demo('load')
    expect(zoningLoadFailed()).toBe(false)
    loader.reject()
    await flush()
    close()
    vi.advanceTimersByTime(FRAME)
    expect(zoningLoadFailed()).toBe(true)
    const again = demo('load')
    expect(zoningLoadFailed()).toBe(false)
    again()
    vi.advanceTimersByTime(FRAME)
  })

  it('does not count its own copy as already applied while it shows it', async () => {
    const { port, loader, demo } = setup()
    const close = demo('load')
    loader.resolve()
    await flush()
    expect(zoningAlreadyApplied(port.applied())).toBe(false)
    close()
    vi.advanceTimersByTime(FRAME)
    expect(zoningAlreadyApplied([zoningDataset()])).toBe(true)
  })

  it('treats the catalogue copy of the zoning map as already applied', async () => {
    const catalogue = { ...named(CATALOGUE_ID, 'Existing Colour Zoning'), url: arcgisLayerUrl(ZONING_LAYER_URL) } as Dataset
    const { port, loader, fly, demo } = setup([catalogue])
    expect(zoningAlreadyApplied(port.applied())).toBe(true)
    let close = () => {}
    for (const stage of STAGES) {
      close()
      close = demo(stage)
      vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    }
    await flush()
    close()
    vi.advanceTimersByTime(FRAME)
    expect(loader.load).not.toHaveBeenCalled()
    expect(fly).not.toHaveBeenCalled()
    expect(port.add).not.toHaveBeenCalled()
    expect(port.remove).not.toHaveBeenCalled()
  })

  it('does not add when the loaded name is already on the map', async () => {
    const { port, loader, demo } = setup()
    const close = demo('load')
    port.add(named('mine', 'Zoning'))
    port.add.mockClear()
    loader.resolve()
    await flush()
    expect(port.add).not.toHaveBeenCalled()
    close()
    vi.advanceTimersByTime(FRAME)
    expect(port.remove).not.toHaveBeenCalled()
    expect(port.applied().map(d => d.id)).toEqual(['mine'])
  })

  it('keeps the dataset the Datasets dialog added and styles that one', async () => {
    const { port, loader, demo } = setup()
    document.body.innerHTML = `
      <div data-tour="datasets-search"><input value="" /></div>
      <div data-tour="datasets-list"><table><tbody>${rowHtml('Existing Colour Zoning', 'unchecked')}</tbody></table></div>`
    document.querySelector('[data-tour="dataset-apply"] button')?.addEventListener('click', () => port.add({ ...zoningDataset(), id: CATALOGUE_ID, name: 'Existing Colour Zoning' }))
    const menu = createZoningMenuDemo(port)
    const leaveApply = menu('apply')
    vi.advanceTimersByTime(FRAME * 2)
    const leaveClose = menu('close')
    leaveApply()
    leaveClose()
    const leaveLoad = demo('load')
    document.body.innerHTML = `<li data-tour="dataset-row:${CATALOGUE_ID}"><button data-tour="dataset-remove"></button></li>`
    await vi.advanceTimersByTimeAsync(FRAME * 2)
    expect(port.applied().map(d => d.id)).toEqual([CATALOGUE_ID])
    expect(loader.load).not.toHaveBeenCalled()
    leaveLoad()
    await vi.advanceTimersByTimeAsync(FRAME * 2)
    expect(port.applied()).toEqual([])
  })

  it('leaves an already-applied zoning dataset alone', async () => {
    const { port, loader, fly, demo } = setup([zoningDataset()])
    let close = () => {}
    for (const stage of STAGES) {
      close()
      close = demo(stage)
      vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME)
    }
    await flush()
    close()
    vi.advanceTimersByTime(FRAME)
    expect(loader.load).not.toHaveBeenCalled()
    expect(fly).not.toHaveBeenCalled()
    expect(port.add).not.toHaveBeenCalled()
    expect(port.update).not.toHaveBeenCalled()
    expect(port.remove).not.toHaveBeenCalled()
    expect(clicks).toEqual([])
  })
})
