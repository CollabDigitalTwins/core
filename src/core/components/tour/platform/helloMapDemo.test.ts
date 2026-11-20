// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { demoHelloMap, helloMapInstalledByTour, toggleHelloMapControl } from './helloMapDemo'
import { DEMO_DELAY_MS } from './platformHost'

import type { HelloMapControl, HelloMapStage } from './helloMapDemo'

const FRAME = 16
const CONTROLS: HelloMapControl[] = ['installed', 'org-enabled', 'allow-override', 'user-run']
const STAGES: HelloMapStage[] = ['open', 'install', 'controls', 'uninstall']

interface FakeRow {
  expanded: boolean
  installed: boolean
  confirming: boolean
  busy: boolean
  writeMs: number
  dialogMs: number
  switches: Record<HelloMapControl, boolean>
}

let row: FakeRow
let presses: string[]
let releases: (() => void)[]

const switchRow = (slug: string, control: HelloMapControl, on: boolean) =>
  `<div data-tour="plugin-${control}"><button role="switch" aria-checked="${on}" data-switch="${slug}:${control}"></button></div>`

function render() {
  const details = !row.installed
    ? '<button data-tour="plugin-install" data-press="install"></button>'
    : CONTROLS.map(control => switchRow('hello-map', control, row.switches[control])).join('')
  document.body.innerHTML = `
    <ul>
      <li data-tour="plugin-row-other">
        <button aria-expanded="true" data-press="other-expand"></button>
        <div data-tour="plugin-controls">${CONTROLS.map(control => switchRow('other', control, true)).join('')}</div>
      </li>
      <li data-tour="plugin-row-hello-map">
        <button aria-expanded="${row.expanded}" data-press="expand"></button>
        ${row.expanded ? `<div data-tour="plugin-controls" aria-busy="${row.busy}">${details}</div>` : ''}
      </li>
    </ul>
    ${row.confirming ? '<button data-tour="confirm-cancel" data-press="cancel"></button><button data-tour="confirm-action" data-press="confirm"></button>' : ''}`
}

function write() {
  if (!row.writeMs) return
  row.busy = true
  setTimeout(() => { row.busy = false; render() }, row.writeMs)
}

function openDialog() {
  if (!row.dialogMs) row.confirming = true
  else setTimeout(() => { row.confirming = true; render() }, row.dialogMs)
}

function onClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const name = target.dataset.press ?? target.dataset.switch ?? ''
  presses.push(name)
  if (name === 'expand') row.expanded = !row.expanded
  if (name === 'install') {
    row.installed = true
    write()
  }
  if (name === 'cancel') row.confirming = false
  if (name === 'confirm') {
    row.confirming = false
    row.installed = false
    write()
  }
  if (name === 'hello-map:installed') openDialog()
  else if (name.startsWith('hello-map:')) {
    const control = name.slice('hello-map:'.length) as HelloMapControl
    row.switches[control] = !row.switches[control]
  }
  render()
}

const run = (stage: HelloMapStage) => releases.push(demoHelloMap(stage))
const releaseAll = () => releases.splice(0).forEach(release => release())
const settle = () => vi.advanceTimersByTimeAsync(DEMO_DELAY_MS + FRAME * 20)
const count = (name: string) => presses.filter(press => press === name).length
const click = (selector: string) => document.querySelector<HTMLElement>(selector)?.click()

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), FRAME))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  row = { expanded: false, installed: false, confirming: false, busy: false, writeMs: 0, dialogMs: 0, switches: { 'installed': true, 'org-enabled': false, 'allow-override': true, 'user-run': false } }
  presses = []
  releases = []
  render()
  document.addEventListener('click', onClick)
})

afterEach(async () => {
  releaseAll()
  await vi.advanceTimersByTimeAsync(FRAME * 700)
  document.removeEventListener('click', onClick)
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('demoHelloMap', () => {
  it('opens the Hello Map row and never another plugin', async () => {
    run('open')
    await settle()
    expect(presses).toEqual(['expand'])
    expect(row.expanded).toBe(true)
  })

  it('installs only when the Install button is there', async () => {
    run('open')
    await settle()
    run('install')
    await settle()
    expect(count('install')).toBe(1)
    expect(helloMapInstalledByTour()).toBe(true)
  })

  it('uninstalls with confirmation when the person leaves', async () => {
    run('open')
    await settle()
    run('install')
    await settle()
    releaseAll()
    await settle()
    expect(presses.slice(-2)).toEqual(['hello-map:installed', 'confirm'])
    expect(row.installed).toBe(false)
    expect(helloMapInstalledByTour()).toBe(false)
  })

  it('waits for the install write before uninstalling on leave, even from a collapsed row', async () => {
    row.writeMs = 500
    run('open')
    await settle()
    run('install')
    await settle()
    row.expanded = false
    render()
    releaseAll()
    await vi.advanceTimersByTimeAsync(100)
    expect(presses.slice(-1)).toEqual(['expand'])
    expect(row.busy).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    expect(presses.slice(-2)).toEqual(['hello-map:installed', 'confirm'])
    expect(row.installed).toBe(false)
  })

  it('forgets its install once Hello Map was uninstalled by hand', async () => {
    run('open')
    await settle()
    run('install')
    await settle()
    run('controls')
    toggleHelloMapControl('installed')
    click('[data-tour="confirm-action"]')
    await settle()
    expect(helloMapInstalledByTour()).toBe(false)
    releaseAll()
    await vi.advanceTimersByTimeAsync(FRAME * 700)
    row.installed = true
    render()
    run('controls')
    run('uninstall')
    await settle()
    releaseAll()
    await settle()
    expect(count('hello-map:installed')).toBe(1)
    expect(row.installed).toBe(true)
  })

  it('closes the confirm dialog it opened when the uninstall step is left', async () => {
    row.dialogMs = 5
    run('open')
    await settle()
    run('install')
    await settle()
    const release = demoHelloMap('uninstall')
    await vi.advanceTimersByTimeAsync(DEMO_DELAY_MS + 10)
    expect(row.confirming).toBe(true)
    release()
    expect(presses.slice(-1)).toEqual(['cancel'])
    expect(row.confirming).toBe(false)
    expect(row.installed).toBe(true)
  })

  it('leaves a switch alone that the person already switched back', async () => {
    row.installed = true
    row.expanded = true
    render()
    run('controls')
    toggleHelloMapControl('user-run')
    click('[data-switch="hello-map:user-run"]')
    releaseAll()
    await settle()
    expect(count('hello-map:user-run')).toBe(2)
    expect(row.switches['user-run']).toBe(false)
  })

  it('uninstalls on the uninstall step and then leaves it uninstalled', async () => {
    run('open')
    await settle()
    run('install')
    await settle()
    run('uninstall')
    await settle()
    expect(presses.slice(-2)).toEqual(['hello-map:installed', 'confirm'])
    expect(helloMapInstalledByTour()).toBe(false)
    releaseAll()
    await settle()
    expect(count('hello-map:installed')).toBe(1)
  })

  it('never uninstalls a Hello Map it did not install', async () => {
    row.installed = true
    render()
    for (const stage of STAGES) {
      run(stage)
      await settle()
    }
    releaseAll()
    await settle()
    expect(count('hello-map:installed')).toBe(0)
    expect(count('confirm')).toBe(0)
    expect(row.installed).toBe(true)
  })

  it('flips a switch it changed back on leave', async () => {
    row.installed = true
    row.expanded = true
    render()
    run('controls')
    toggleHelloMapControl('user-run')
    expect(row.switches['user-run']).toBe(true)
    releaseAll()
    await settle()
    expect(count('hello-map:user-run')).toBe(2)
    expect(row.switches['user-run']).toBe(false)
  })

  it('does not touch organization switches on a Hello Map it did not install', () => {
    row.installed = true
    row.expanded = true
    render()
    run('controls')
    toggleHelloMapControl('org-enabled')
    expect(presses).toEqual([])
  })

  it('flips organization switches on the Hello Map it installed, and back on leave', async () => {
    run('open')
    await settle()
    run('install')
    await settle()
    run('controls')
    toggleHelloMapControl('org-enabled')
    expect(row.switches['org-enabled']).toBe(true)
    releaseAll()
    await settle()
    expect(count('hello-map:org-enabled')).toBe(2)
    expect(presses.filter(press => press.startsWith('other'))).toEqual([])
  })
})
