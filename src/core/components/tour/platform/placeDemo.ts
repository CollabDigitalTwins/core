// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { anchorSelector, findAnchor } from '../hostTargets'

import { runStage } from './liveDemo'
import { ARRIVAL_FRAMES, DEMO_DELAY_MS, expandIfCollapsed, press, setNativeValue, typeInto, waitFor } from './platformHost'

import type { Schedule } from './platformHost'

const SENSOR_DEMO_URL = 'https://sensors-api-tau.vercel.app/api/sensor/temperature'

export type PlaceKind = 'comment' | 'sensor'

export type PlaceStage = 'add' | 'place' | 'delete'

/** A comment or sensor as the demo tells them apart: its text or name, and the `data-tour` sections its row sits in. */
export interface PlacedItem {
  id: number
  label: string
  groups?: string[]
}

/** The comments or sensors on the map, as the place-and-delete demo reads and changes them. */
export interface PlacedItemPort {
  items: () => PlacedItem[]
  remove: (id: number) => void
  openDialog: () => void
  closeDialog: () => void
  placeAtCentre: () => void
}

/** The sensors port, which also picks the type a new sensor gets. */
export interface SensorPort extends PlacedItemPort {
  typeIds: () => number[]
  preselectType: (id: number) => void
}

interface KindSpec<P extends PlacedItemPort> {
  name: PlaceKind
  submit: string
  fields: (label: string) => [anchor: string, value: string][]
  open: (port: P) => void
}

interface Session {
  label: string
  known: Set<number> | null
  owned: Set<number>
  openedDialog: boolean
  submitted: boolean
  fired: boolean
  cancelArrival: () => void
}

const PANELS: Record<PlaceKind, string> = { comment: 'panel-comments', sensor: 'panel-sensors' }

const placed = new Map<PlaceKind, number>()

const placedRow = (kind: PlaceKind) => {
  const id = placed.get(kind)
  return id === undefined ? null : findAnchor(`${kind}-item:${id}`)
}

/** What the place and delete steps spotlight: the placed row, else the panel. */
export const placedTarget = (kind: PlaceKind) => () => placedRow(kind) ?? findAnchor(PANELS[kind])

/** What the add step spotlights: the add dialog, else the panel. */
export const placeDialogTarget = (kind: PlaceKind) => () => findAnchor(`${kind}-input`) ?? findAnchor(PANELS[kind])

const COMMENT: KindSpec<PlacedItemPort> = {
  name: 'comment',
  submit: 'comment-submit',
  fields: label => [['comment-input-text', label]],
  open: port => {
    const add = findAnchor('section-add', findAnchor(PANELS.comment) ?? document)
    if (add) press(add)
    else port.openDialog()
  },
}

const SENSOR: KindSpec<SensorPort> = {
  name: 'sensor',
  submit: 'sensor-place',
  fields: label => [['sensor-input-name', label], ['sensor-input-url', SENSOR_DEMO_URL]],
  open: port => {
    const groupAdd = document.querySelector<HTMLElement>('[data-tour^="sensor-type:"]:not([data-tour="sensor-type:-1"]) [data-tour="section-add"]')
    if (groupAdd) return press(groupAdd)
    const [firstType] = port.typeIds()
    if (firstType !== undefined) port.preselectType(firstType)
    const empty = findAnchor('sensors-add')
    if (empty) press(empty)
    else port.openDialog()
  },
}

const commit = (input: HTMLInputElement, value: string) => {
  if (input.value !== value) setNativeValue(input, value)
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}

function createPlaceDemo<P extends PlacedItemPort>(kind: KindSpec<P>, port: P): (stage: PlaceStage, label: string) => () => void {
  let session: Session | null = null
  let cancelLateArrival = () => {}
  const dialog = () => findAnchor(`${kind.name}-input`)
  const inputs = (label: string) => kind.fields(label).map(([anchor, value]) => [findAnchor<HTMLInputElement>(anchor), value] as const)
  const filled = (label: string) => inputs(label).every(([input, value]) => input?.value === value)
  const exists = (id: number) => port.items().some(item => item.id === id)
  const arrivals = (state: Session) =>
    port.items().filter(item => state.known && !state.known.has(item.id) && item.label === state.label)

  const fill = (s: Schedule, label: string, animate: boolean, done: () => void) => {
    const fields = inputs(label)
    if (fields.some(([input]) => !input)) return
    const [[first, firstValue], ...rest] = fields as [HTMLInputElement, string][]
    const finish = () => {
      rest.forEach(([input, value]) => commit(input, value))
      done()
    }
    if (animate && first.value !== firstValue) s.track(typeInto(first, firstValue, finish))
    else {
      commit(first, firstValue)
      finish()
    }
  }

  const submitButton = (state: Session) => {
    const button = findAnchor<HTMLButtonElement>(kind.submit)
    return button && !button.disabled && filled(state.label) ? button : null
  }

  const submit = (state: Session) => {
    const button = submitButton(state)
    if (state.submitted || !button) return
    state.known = new Set(port.items().map(item => item.id))
    press(button)
    state.submitted = true
  }

  const openDialog = (state: Session) => {
    if (dialog()) return
    kind.open(port)
    state.openedDialog = true
  }

  const fire = (state: Session) => {
    if (state.fired) return
    state.fired = true
    port.placeAtCentre()
    state.cancelArrival = waitFor(() => arrivals(state).length > 0, () => {
      arrivals(state).forEach(item => state.owned.add(item.id))
      placed.set(kind.name, [...state.owned][0])
      state.known = null
    }, ARRIVAL_FRAMES)
  }

  const reveal = (state: Session) => port.items()
    .filter(item => state.owned.has(item.id))
    .flatMap(item => item.groups ?? [])
    .forEach(group => expandIfCollapsed(document.querySelector<HTMLElement>(`${anchorSelector(group)} [aria-expanded]`)))

  const settle = (state: Session) => {
    if (state.openedDialog) port.closeDialog()
    state.openedDialog = false
    reveal(state)
  }

  const ownedDelete = () => {
    const row = placedRow(kind.name)
    return row ? findAnchor('item-delete', row) : null
  }

  const stages: Record<PlaceStage, (s: Schedule, state: Session) => void> = {
    add: (s, state) => {
      if (state.submitted) return
      openDialog(state)
      s.when(() => !!dialog(), () => fill(s, state.label, true, () =>
        s.after(DEMO_DELAY_MS, () => s.when(() => !!submitButton(state), () => submit(state)))))
    },
    place: (s, state) => {
      if (!state.submitted) {
        openDialog(state)
        s.when(() => !!dialog(), () => fill(s, state.label, false, () => s.when(() => !!submitButton(state), () => submit(state))))
      }
      s.when(() => state.submitted && !dialog(), () => s.after(DEMO_DELAY_MS, () => fire(state)))
      s.when(() => state.owned.size > 0, () => settle(state))
    },
    delete: (s, state) => {
      s.when(() => state.owned.size > 0, () => {
        reveal(state)
        s.after(DEMO_DELAY_MS, () => s.when(() => !!ownedDelete(), () => {
          const remove = ownedDelete()
          if (!remove) return
          state.owned.delete(placed.get(kind.name) ?? -1)
          press(remove)
        }))
      })
    },
  }

  const undo = (state: Session) => {
    session = null
    placed.delete(kind.name)
    state.cancelArrival()
    if (state.fired && state.known) {
      cancelLateArrival = waitFor(() => arrivals(state).length > 0, () => arrivals(state).forEach(item => port.remove(item.id)), ARRIVAL_FRAMES)
    }
    state.owned.forEach(id => { if (exists(id)) port.remove(id) })
    if ((state.submitted && !state.fired) || state.openedDialog) port.closeDialog()
  }

  const start = (label: string) => () => {
    cancelLateArrival()
    const state: Session = { label, known: null, owned: new Set(), openedDialog: false, submitted: false, fired: false, cancelArrival: () => {} }
    session = state
    return () => undo(state)
  }

  return (stage, label) => runStage(`${kind.name}-demo`, start(label), s => {
    if (session) stages[stage](s, session)
  })
}

/** Runs one stage of the comment demo: write one, place it at the map centre, delete it; leaving deletes what it placed. */
export const createCommentDemo = (port: PlacedItemPort) => createPlaceDemo(COMMENT, port)

/** Runs one stage of the sensor demo: fill one in, place it at the map centre, delete it; leaving deletes what it placed. */
export const createSensorDemo = (port: SensorPort) => createPlaceDemo(SENSOR, port)
