// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { anchorSelector, findAnchor } from '../hostTargets'

import { runStage } from './liveDemo'
import { ARRIVAL_FRAMES, DEMO_DELAY_MS, expandIfCollapsed, press, schedule, waitFor } from './platformHost'

import type { Schedule } from './platformHost'

const HELLO_MAP = 'hello-map'

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

/** Whether the switch changes Hello Map for the whole organization rather than for the person. */
export const isOrgControl = (control: HelloMapControl) => ORG_CONTROLS.has(control)

let session: Session | null = null
let pendingUndo: Pending | null = null

export const helloMapRow = () => findAnchor(`plugin-row-${HELLO_MAP}`)

const inRow = (selector: string) => helloMapRow()?.querySelector<HTMLElement>(selector) ?? null

/** The `data-tour` control inside the Hello Map row, never the same control in another plugin's row. */
export const helloMapControl = (anchor: string) => inRow(anchorSelector(anchor))

const switchOf = (control: HelloMapControl) => inRow(`${anchorSelector(`plugin-${control}`)} [role="switch"]`)

const isOn = (toggle: HTMLElement) => toggle.getAttribute('aria-checked') === 'true'

const installButton = () => helloMapControl('plugin-install')

const idle = () => !inRow('[data-tour="plugin-controls"][aria-busy="true"]')

export const helloMapInstalledByTour = () => session?.installedByTour === true

const confirmButton = () => findAnchor('confirm-action')

const cancelButton = () => findAnchor('confirm-cancel')

const rowToggle = () => inRow('button[aria-expanded]')

const expandRow = () => expandIfCollapsed(rowToggle())

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

function whenRowMounts(s: Schedule, then: () => void) {
  const observer = new MutationObserver(() => {
    if (!helloMapRow()) return
    observer.disconnect()
    then()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  s.track(() => observer.disconnect())
}

const switchIs = (control: HelloMapControl, on: boolean) => {
  const toggle = switchOf(control)
  return !!toggle && isOn(toggle) === on
}

const unchangedSinceTour = (state: Session) =>
  (!state.installedByTour || switchIs('installed', true))
  && [...state.flipped].every(([control, original]) => switchIs(control, !original))

function undo(state: Session, deferred = false) {
  if (!state.installedByTour && state.flipped.size === 0) return
  const s = schedule()
  const pending: Pending = { schedule: s, session: state }
  const done = () => {
    if (pendingUndo === pending) pendingUndo = null
  }
  pendingUndo = pending
  s.when(() => !!helloMapRow(), () => {
    expandRow()
    s.when(() => switchesShown(state) || !!installButton(), () => {
      if (installButton() || (deferred && !unchangedSinceTour(state))) {
        forget(state)
        return done()
      }
      restoreFlips(state)
      if (state.installedByTour) uninstall(s, state, () => {}, done)
      else done()
    }, done)
  }, () => whenRowMounts(s, () => undo(state, true)))
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
  return runStage(HELLO_MAP, start, s => (session ? stages[stage](s, session) : undefined))
}

function watchForUninstall(state: Session) {
  waitFor(() => !!installButton(), () => forget(state), ARRIVAL_FRAMES)
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
