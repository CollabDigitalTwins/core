// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { arcgisLayerUrl } from '../../viewers/map/datasets/src/arcgisLayer'
import { datasetStyleOf, rendererForField } from '../../viewers/map/utils/datasetStyle'

import { holdDemo } from './liveDemo'
import { DEMO_DELAY_MS, expandIfCollapsed, press, schedule, setNativeValue, typeInto, waitFor } from './platformHost'

import type { Schedule } from './platformHost'
import type { Dataset, DatasetStyle } from '../../../types/datasetTypes'

export const ZONING_LAYER_URL = 'https://services.arcgis.com/G6F8XLCl5KtAlZ2G/ArcGIS/rest/services/IM_ExistingColourZoning_Sept25/FeatureServer/0'

const ZONING_LAYER = arcgisLayerUrl(ZONING_LAYER_URL)
const ZONING_ID = `url-arcgis:${ZONING_LAYER}`
const URL_DATASET_PREFIX = 'url-arcgis:'
const COLOUR_FIELD = 'ZONE_MAIN'
const DEMO_STYLE = {
  label: { field: 'ZONE_CODE', size: 12, colour: '#111827' },
  strokeColour: '#111827',
  opacity: 0.6,
} satisfies Partial<DatasetStyle>

/** Whether the zoning map is on the map already, as the tour's copy or the catalogue's. */
export const zoningAlreadyApplied = (applied: Dataset[]): boolean =>
  applied.some(dataset => dataset.id === ZONING_ID || dataset.url === ZONING_LAYER)

export type ZoningStage = 'load' | 'legend' | 'layer' | 'colour' | 'style' | 'remove'

/** The applied-datasets store, as the zoning demo reads and changes it. */
export interface DatasetPort {
  applied: () => Dataset[]
  add: (dataset: Dataset) => void
  update: (name: string, changes: Partial<Dataset>) => void
  remove: (id: string) => void
}

interface ZoningDeps {
  load: (url: string) => Promise<Dataset>
  fly: () => void
}

const rowControl = (anchor: string) =>
  document.querySelector<HTMLElement>(`[data-tour="dataset-row:${ZONING_ID}"] [data-tour="${anchor}"]`)

export const zoningStylePanel = () => rowControl('dataset-style-panel')

export const zoningRow = () => document.querySelector<HTMLElement>(`[data-tour="dataset-row:${ZONING_ID}"]`)

const legendToggle = () =>
  document.querySelector<HTMLElement>('[data-tour="legend-applied"] [aria-expanded]')

const expandWhenShown = (s: Schedule, anchor: string, then: () => void = () => {}) =>
  s.when(() => !!rowControl(anchor), () => {
    expandIfCollapsed(rowControl(anchor))
    then()
  })

/** Runs one stage of the zoning demo in the Map Legend; every stage shares one added dataset, removed when the last one closes. */
export function createZoningDemo(port: DatasetPort, deps: ZoningDeps): (stage: ZoningStage) => () => void {
  let owned = false
  let failed = false
  let loading = false
  let generation = 0
  let legendOpenedByTour = false
  const zoning = () => port.applied().find(dataset => dataset.id === ZONING_ID)
  const colourProfile = () => zoning()?.fields?.find(field => field.name === COLOUR_FIELD)

  const restyle = (changes: (dataset: Dataset) => Partial<DatasetStyle>) => {
    const dataset = zoning()
    if (dataset) port.update(dataset.name, { style: { ...datasetStyleOf(dataset), ...changes(dataset) } })
  }

  const addLayer = () => {
    const hold = generation
    loading = true
    deps.load(ZONING_LAYER_URL).then(dataset => {
      loading = false
      if (hold !== generation) return
      if (port.applied().some(applied => applied.name === dataset.name)) owned = false
      else port.add(dataset)
    }, () => {
      loading = false
      if (hold === generation) failed = true
    })
  }

  const restoreLayer = () => {
    if (!zoning() && !loading) addLayer()
  }

  const foldLegend = () => {
    const toggle = legendToggle()
    if (legendOpenedByTour && toggle?.isConnected && toggle.getAttribute('aria-expanded') === 'true') press(toggle)
    legendOpenedByTour = false
  }

  const start = () => {
    generation++
    failed = false
    owned = !zoningAlreadyApplied(port.applied())
    if (!owned) return () => {}
    deps.fly()
    addLayer()
    return () => {
      generation++
      foldLegend()
      if (owned) port.remove(ZONING_ID)
    }
  }

  const stages: Record<ZoningStage, (s: Schedule) => void> = {
    load: () => {},
    legend: s => {
      restoreLayer()
      s.when(() => !!legendToggle(), () => s.after(DEMO_DELAY_MS, () => {
        const toggle = legendToggle()
        if (toggle?.getAttribute('aria-expanded') !== 'false') return
        press(toggle)
        legendOpenedByTour = true
      }))
    },
    layer: s => {
      restoreLayer()
      s.when(() => !!rowControl('dataset-style'), () => s.after(DEMO_DELAY_MS, () => expandIfCollapsed(rowControl('dataset-style'))))
    },
    colour: s => {
      restoreLayer()
      expandWhenShown(s, 'dataset-style')
      s.when(() => !!colourProfile(), () => s.after(DEMO_DELAY_MS, () => {
        const profile = colourProfile()
        if (profile) restyle(dataset => ({ renderer: rendererForField(profile, dataset.layerColor) }))
      }))
    },
    style: s => {
      restoreLayer()
      expandWhenShown(s, 'dataset-style', () =>
        expandWhenShown(s, 'dataset-more-style', () => s.after(DEMO_DELAY_MS, () => restyle(() => DEMO_STYLE))))
    },
    remove: s => s.after(DEMO_DELAY_MS, () => s.when(() => !!rowControl('dataset-remove'), () => {
      const remove = rowControl('dataset-remove')
      if (remove) press(remove)
    })),
  }

  return stage => {
    const release = holdDemo('zoning', start)
    const s = schedule(() => failed)
    if (owned && !failed) stages[stage](s)
    return () => {
      s.cancel()
      release()
    }
  }
}

export const ZONING_SEARCH = 'Existing Colour Zoning'

export type ZoningMenuStage = 'find' | 'apply' | 'applied' | 'remove'

const OWNERSHIP_FRAMES = 3600

const menuOwned = new Map<string, string>()

export const zoningMenuOwnsDataset = () => menuOwned.size > 0

const anchor = (name: string) => document.querySelector<HTMLElement>(`[data-tour="${name}"]`)

const searchInput = () => document.querySelector<HTMLInputElement>('[data-tour="datasets-search"] input')

const listBoxes = () =>
  [...document.querySelectorAll<HTMLElement>('[data-tour="datasets-list"] [data-tour="dataset-apply"] button')]

const rowText = (box: HTMLElement) => box.closest('tr')?.textContent?.toLowerCase() ?? ''

export const zoningMenuRow = () => listBoxes().find(box => rowText(box).includes(ZONING_SEARCH.toLowerCase()))

const ownedNamesIn = (text: string) =>
  [...menuOwned].filter(([, name]) => text.includes(name.toLowerCase()))

const ownedBox = () => listBoxes().find(box => box.dataset.state === 'checked' && ownedNamesIn(rowText(box)).length > 0)

/** Runs one stage of the zoning demo in the Datasets dialog; leaving clears the search and removes what the demo added. */
export function createZoningMenuDemo(port: DatasetPort): (stage: ZoningMenuStage) => () => void {
  let cancelOwnership = () => {}
  let pendingTick: (() => Dataset[]) | null = null

  const removeOnArrival = (arrived: () => Dataset[]) => {
    const catalogueIds = () => arrived().flatMap(({ id }) => (id && !id.startsWith(URL_DATASET_PREFIX) ? [id] : []))
    waitFor(() => catalogueIds().length > 0, () => catalogueIds().forEach(id => port.remove(id)), OWNERSHIP_FRAMES)
  }

  const start = () => {
    const searchBefore = searchInput()?.value ?? ''
    return () => {
      cancelOwnership()
      if (pendingTick) removeOnArrival(pendingTick)
      pendingTick = null
      const input = searchInput()
      if (input) setNativeValue(input, searchBefore)
      menuOwned.forEach((_, id) => port.remove(id))
      menuOwned.clear()
    }
  }

  const ownOnArrival = (arrived: () => Dataset[]) => {
    pendingTick = arrived
    cancelOwnership()
    cancelOwnership = waitFor(() => arrived().length > 0, () => {
      arrived().forEach(dataset => menuOwned.set(dataset.id, dataset.name))
      pendingTick = null
    }, OWNERSHIP_FRAMES)
  }

  const tick = () => {
    const box = zoningMenuRow()
    if (box?.dataset.state !== 'unchecked') return
    const row = rowText(box)
    const known = new Set(port.applied().map(dataset => dataset.id))
    press(box)
    ownOnArrival(() => port.applied().filter(dataset => !known.has(dataset.id) && row.includes(dataset.name.toLowerCase())))
  }

  const untick = () => {
    const box = ownedBox()
    if (!box) {
      menuOwned.forEach((_, id) => port.remove(id))
      menuOwned.clear()
      return
    }
    ownedNamesIn(rowText(box)).forEach(([id]) => menuOwned.delete(id))
    press(box)
  }

  const ensureSearch = () => {
    const input = searchInput()
    if (input && input.value.toLowerCase() !== ZONING_SEARCH.toLowerCase()) setNativeValue(input, ZONING_SEARCH)
  }

  const stages: Record<ZoningMenuStage, (s: Schedule) => void> = {
    find: s => {
      const municipal = anchor('datasets-tab-municipal')
      if (municipal) press(municipal)
      s.when(() => !!searchInput(), () => {
        const input = searchInput()
        if (input) s.track(typeInto(input, ZONING_SEARCH, () => {}))
      })
    },
    apply: s => {
      ensureSearch()
      s.when(() => !!zoningMenuRow(), tick)
    },
    applied: () => {
      const tab = anchor('datasets-tab-applied')
      if (tab) press(tab)
    },
    remove: s => {
      if (!zoningMenuOwnsDataset()) return
      if (ownedBox()) untick()
      else s.after(DEMO_DELAY_MS, untick)
    },
  }

  return stage => {
    const release = holdDemo('zoning-menu', start)
    const s = schedule(() => false)
    stages[stage](s)
    return () => {
      s.cancel()
      release()
    }
  }
}
