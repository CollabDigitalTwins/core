// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { arcgisLayerUrl } from '../../viewers/map/datasets/src/arcgisLayer'
import { datasetStyleOf, rendererForField } from '../../viewers/map/utils/datasetStyle'

import { anchorSelector, findAnchor } from '../hostTargets'

import { runStage } from './liveDemo'
import { ARRIVAL_FRAMES, DEMO_DELAY_MS, expandIfCollapsed, press, setNativeValue, typeInto, waitFor } from './platformHost'

import type { Schedule } from './platformHost'
import type { Dataset, DatasetStyle } from '../../../types/datasetTypes'

const ZONING_LAYER_URL = 'https://services.arcgis.com/G6F8XLCl5KtAlZ2G/ArcGIS/rest/services/IM_ExistingColourZoning_Sept25/FeatureServer/0'

const URL_DATASET_PREFIX = 'url-arcgis:'
const ZONING_LAYER = arcgisLayerUrl(ZONING_LAYER_URL)
const ZONING_ID = `${URL_DATASET_PREFIX}${ZONING_LAYER}`
const COLOUR_FIELD = 'ZONE_MAIN'
const DEMO_STYLE = {
  label: { field: 'ZONE_CODE', size: 12, colour: '#111827' },
  strokeColour: '#111827',
  opacity: 0.6,
} satisfies Partial<DatasetStyle>

let owned = false
let failed = false

const appliedBeforeTour = (applied: Dataset[]) =>
  applied.some(dataset => dataset.id === ZONING_ID || dataset.url === ZONING_LAYER)

/** Whether the person has the zoning map on the map already; the copy the tour added does not count. */
export const zoningAlreadyApplied = (applied: Dataset[]): boolean => !owned && appliedBeforeTour(applied)

/** Whether the legend demo could not load the zoning map, so its remaining steps have nothing to show. */
export const zoningLoadFailed = () => failed

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
  document.querySelector<HTMLElement>(`${anchorSelector(`dataset-row:${ZONING_ID}`)} ${anchorSelector(anchor)}`)

export const zoningStylePanel = () => rowControl('dataset-style-panel')

export const zoningRow = () => findAnchor(`dataset-row:${ZONING_ID}`)

const legendToggle = () =>
  document.querySelector<HTMLElement>('[data-tour="legend-applied"] [aria-expanded]')

const expandWhenShown = (s: Schedule, anchor: string, then: () => void = () => {}) =>
  s.when(() => !!rowControl(anchor), () => {
    expandIfCollapsed(rowControl(anchor))
    then()
  })

/** Runs one stage of the zoning demo in the Map Legend; every stage shares one added dataset, removed when the last one closes. */
export function createZoningDemo(port: DatasetPort, deps: ZoningDeps): (stage: ZoningStage) => () => void {
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

  const unfoldLegend = () => {
    const toggle = legendToggle()
    if (toggle?.getAttribute('aria-expanded') !== 'false') return
    press(toggle)
    legendOpenedByTour = true
  }

  const showLayer = (s: Schedule) => {
    restoreLayer()
    s.when(() => !!legendToggle(), unfoldLegend)
  }

  const foldLegend = () => {
    const toggle = legendToggle()
    if (legendOpenedByTour && toggle?.isConnected && toggle.getAttribute('aria-expanded') === 'true') press(toggle)
    legendOpenedByTour = false
  }

  const start = () => {
    generation++
    failed = false
    owned = !appliedBeforeTour(port.applied())
    if (!owned) return () => {}
    deps.fly()
    addLayer()
    return () => {
      generation++
      foldLegend()
      if (owned) port.remove(ZONING_ID)
      owned = false
    }
  }

  const stages: Record<ZoningStage, (s: Schedule) => void> = {
    load: () => {},
    legend: s => {
      restoreLayer()
      s.when(() => !!legendToggle(), () => s.after(DEMO_DELAY_MS, unfoldLegend))
    },
    layer: s => {
      showLayer(s)
      s.when(() => !!rowControl('dataset-style'), () => s.after(DEMO_DELAY_MS, () => expandIfCollapsed(rowControl('dataset-style'))))
    },
    colour: s => {
      showLayer(s)
      expandWhenShown(s, 'dataset-style')
      s.when(() => !!colourProfile(), () => s.after(DEMO_DELAY_MS, () => {
        const profile = colourProfile()
        if (profile) restyle(dataset => ({ renderer: rendererForField(profile, dataset.layerColor) }))
      }))
    },
    style: s => {
      showLayer(s)
      expandWhenShown(s, 'dataset-style', () =>
        expandWhenShown(s, 'dataset-more-style', () => s.after(DEMO_DELAY_MS, () => restyle(() => DEMO_STYLE))))
    },
    remove: s => s.after(DEMO_DELAY_MS, () => s.when(() => !!rowControl('dataset-remove'), () => {
      const remove = rowControl('dataset-remove')
      if (!remove) return
      press(remove)
      foldLegend()
    })),
  }

  return stage => runStage('zoning', start, s => {
    if (owned && !failed) stages[stage](s)
  }, () => failed)
}

const ZONING_SEARCH = 'Existing Colour Zoning'

export type ZoningMenuStage = 'find' | 'apply' | 'applied' | 'remove'

const menuOwned = new Map<string, string>()

export const zoningMenuOwnsDataset = () => menuOwned.size > 0

const searchInput = () => findAnchor('datasets-search')?.querySelector('input')

const listBoxes = () =>
  [...document.querySelectorAll<HTMLElement>('[data-tour="datasets-list"] [data-tour="dataset-apply"] button')]

const rowText = (box: HTMLElement) => box.closest('tr')?.textContent?.toLowerCase() ?? ''

export const zoningMenuRow = () => listBoxes().find(box => rowText(box).includes(ZONING_SEARCH.toLowerCase()))

const ownedNamesIn = (text: string) =>
  [...menuOwned].filter(([, name]) => text.includes(name.toLowerCase()))

const ownedBox = () => listBoxes().find(box => box.dataset.state === 'checked' && ownedNamesIn(rowText(box)).length > 0)

let searchHeld: string | null = null

/** Puts back the search the person had typed now, while the Datasets dialog is still open, if the zoning demo changed it. */
export function restoreZoningSearch(): void {
  const input = searchInput()
  if (input && searchHeld !== null && input.value !== searchHeld) setNativeValue(input, searchHeld)
}

/** Runs one stage of the zoning demo in the Datasets dialog; leaving clears the search and removes what the demo added. */
export function createZoningMenuDemo(port: DatasetPort): (stage: ZoningMenuStage) => () => void {
  let cancelOwnership = () => {}
  let pendingTick: (() => Dataset[]) | null = null

  const dropOwned = () => {
    menuOwned.forEach((_, id) => port.remove(id))
    menuOwned.clear()
  }

  const removeOnArrival = (arrived: () => Dataset[]) => {
    const catalogueIds = () => arrived().flatMap(({ id }) => (id && !id.startsWith(URL_DATASET_PREFIX) ? [id] : []))
    waitFor(() => catalogueIds().length > 0, () => catalogueIds().forEach(id => port.remove(id)), ARRIVAL_FRAMES)
  }

  const start = () => {
    searchHeld = searchInput()?.value ?? ''
    return () => {
      cancelOwnership()
      if (pendingTick) removeOnArrival(pendingTick)
      pendingTick = null
      restoreZoningSearch()
      searchHeld = null
      dropOwned()
    }
  }

  const ownOnArrival = (arrived: () => Dataset[]) => {
    pendingTick = arrived
    cancelOwnership()
    cancelOwnership = waitFor(() => arrived().length > 0, () => {
      arrived().forEach(dataset => menuOwned.set(dataset.id, dataset.name))
      pendingTick = null
    }, ARRIVAL_FRAMES)
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
    if (!box) return dropOwned()
    ownedNamesIn(rowText(box)).forEach(([id]) => menuOwned.delete(id))
    press(box)
  }

  const ensureSearch = () => {
    const input = searchInput()
    if (input && input.value.toLowerCase() !== ZONING_SEARCH.toLowerCase()) setNativeValue(input, ZONING_SEARCH)
  }

  const stages: Record<ZoningMenuStage, (s: Schedule) => void> = {
    find: s => {
      const municipal = findAnchor('datasets-tab-municipal')
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
      const tab = findAnchor('datasets-tab-applied')
      if (tab) press(tab)
    },
    remove: s => {
      if (!zoningMenuOwnsDataset()) return
      if (ownedBox()) untick()
      else s.after(DEMO_DELAY_MS, untick)
    },
  }

  return stage => runStage('zoning-menu', start, s => stages[stage](s))
}
