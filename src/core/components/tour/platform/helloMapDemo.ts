// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { holdDemo } from './liveDemo'
import { DEMO_DELAY_MS, expandIfCollapsed, press, schedule, waitFor } from './platformHost'

import type { Schedule } from './platformHost'

const HELLO_MAP = 'hello-map'
const ROW = '[data-tour="plugin-row-hello-map"]'

export type HelloMapStage = 'open' | 'install' | 'controls' | 'uninstall'

export type HelloMapControl = 'installed' | 'org-enabled' | 'allow-override' | 'user-run'

interface Session {
  installedByTour: boolean
  flipped: Map<HelloMapControl, boolean>
}

interface Pending {
  schedule: Schedule
  session: Session
}

const ORG_CONTROLS: ReadonlySet<HelloMapControl> = new Set(['installed', 'org-enabled', 'allow-override'])
const UNINSTALL_WATCH_FRAMES = 3600

let session: Session | null = null
let pendingUndo: Pending | null = null

export const helloMapRow = () => document.querySelector<HTMLElement>(ROW)

const inRow = (selector: string) => helloMapRow()?.querySelector<HTMLElement>(selector) ?? null

/** The `data-tour` control inside the Hello Map row, never the same control in another plugin's row. */
export const helloMapControl = (anchor: string) => inRow(`[data-tour="${anchor}"]`)

const switchOf = (control: HelloMapControl) => inRow(`[data-tour="plugin-${control}"] [role="switch"]`)

const isOn = (toggle: HTMLElement) => toggle.getAttribute('aria-checked') === 'true'

const installButton = () => helloMapControl('plugin-install')

const idle = () => !inRow('[data-tour="plugin-controls"][aria-busy="true"]')

export const helloMapInstalledByTour = () => session?.installedByTour === true && !installButton()

const confirmButton = () => document.querySelector<HTMLElement>('[data-tour="confirm-action"]')

const cancelButton = () => document.querySelector<HTMLElement>('[data-tour="confirm-cancel"]')

// The first aria-expanded button is the row's own toggle; later ones are popovers in its cells.
const expandRow = () => expandIfCollapsed(inRow('button[aria-expanded]'))

function forget(state: Session) {
  state.installedByTour = false
  state.flipped.clear()
}

function uninstall(s: Schedule, state: Session, onAsk: () => void, done: () => void) {
  s.when(() => idle() && !!switchOf('installed'), () => {
    const installed = switchOf('installed')
    if (!installed || !isOn(installed)) return done()
    press(installed)
    onAsk()
    s.when(() => !!confirmButton(), () => {
      const confirm = confirmButton()
      if (confirm) press(confirm)
      state.installedByTour = false
      done()
    }, done)
  }, done)
}

function restoreFlips(state: Session) {
  state.flipped.forEach((original, control) => {
    const toggle = switchOf(control)
    if (toggle && isOn(toggle) !== original) press(toggle)
  })
  state.flipped.clear()
}

const switchesShown = (state: Session) => idle()
  && [...state.flipped.keys()].every(control => !!switchOf(control))
  && (!state.installedByTour || !!switchOf('installed'))

function undo(state: Session) {
  if (!state.installedByTour && state.flipped.size === 0) return
  const s = schedule(() => false)
  const pending: Pending = { schedule: s, session: state }
  const done = () => {
    if (pendingUndo === pending) pendingUndo = null
  }
  pendingUndo = pending
  s.when(() => !!helloMapRow(), () => {
    expandRow()
    s.when(() => switchesShown(state) || !!installButton(), () => {
      if (installButton()) {
        forget(state)
        return done()
      }
      restoreFlips(state)
      if (state.installedByTour) uninstall(s, state, () => {}, done)
      else done()
    }, done)
  }, done)
}

function start(): () => void {
  pendingUndo?.schedule.cancel()
  const state = pendingUndo?.session ?? { installedByTour: false, flipped: new Map<HelloMapControl, boolean>() }
  pendingUndo = null
  if (installButton()) forget(state)
  session = state
  return () => {
    session = null
    undo(state)
  }
}

function uninstallStage(s: Schedule, state: Session): () => void {
  let asked = false
  s.after(DEMO_DELAY_MS, () => {
    if (state.installedByTour) uninstall(s, state, () => { asked = true }, () => { asked = false })
  })
  return () => {
    const cancel = cancelButton()
    if (asked && confirmButton() && cancel) press(cancel)
  }
}

const stages: Record<HelloMapStage, (s: Schedule, state: Session) => void | (() => void)> = {
  open: s => s.when(() => !!helloMapRow(), expandRow),
  install: (s, state) => s.after(DEMO_DELAY_MS, () => {
    const install = installButton()
    if (!install) return
    press(install)
    state.installedByTour = true
  }),
  controls: () => {},
  uninstall: uninstallStage,
}

/** Runs one stage of the Hello Map demo; leaving flips back the switches it changed and uninstalls what it installed. */
export function demoHelloMap(stage: HelloMapStage): () => void {
  const release = holdDemo(HELLO_MAP, start)
  const s = schedule(() => false)
  const leave = session ? stages[stage](s, session) : undefined
  return () => {
    s.cancel()
    if (typeof leave === 'function') leave()
    release()
  }
}

function watchForUninstall(state: Session) {
  waitFor(() => !!installButton(), () => forget(state), UNINSTALL_WATCH_FRAMES)
}

/** Presses a Hello Map switch; organization switches only on the Hello Map the tour installed, once its writes settle. */
export function toggleHelloMapControl(control: HelloMapControl): void {
  const state = session
  if (!state || (ORG_CONTROLS.has(control) && (!state.installedByTour || !idle()))) return
  const toggle = switchOf(control)
  if (!toggle) return
  if (!state.flipped.has(control) && control !== 'installed') state.flipped.set(control, isOn(toggle))
  press(toggle)
  if (control === 'installed') watchForUninstall(state)
}
