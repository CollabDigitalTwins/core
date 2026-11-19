// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

const TYPING_DELAY_MS = 70
const EXPAND_DELAY_MS = 150

export const findToolButton = (toolId: string, root: ParentNode = document) =>
  root.querySelector<HTMLButtonElement>(`[data-tour="tool-${toolId}"] button`)

const isExpanded = (button: HTMLElement) => button.getAttribute('aria-expanded') === 'true'

/** What a tool step spotlights: the dropdown or card the tool opened, else its toolbar button. */
export function findToolTarget(toolId: string, root: Document = document): Element | null {
  const button = findToolButton(toolId, root)
  const panelId = button && isExpanded(button) ? button.getAttribute('aria-controls') : null
  return (panelId && root.getElementById(panelId)) || root.querySelector(`[data-tour="tool-${toolId}"]`)
}

/** Opens or closes a toolbar tool's dropdown or card; tools without `aria-expanded` are left alone. */
export function setToolOpen(toolId: string, open: boolean, root: ParentNode = document): void {
  const button = findToolButton(toolId, root)
  if (!button?.hasAttribute('aria-expanded') || isExpanded(button) === open) return
  // Radix triggers toggle on pointerdown and ignore click; plain toggles do the opposite.
  const Pointer = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent
  button.dispatchEvent(new Pointer('pointerdown', { bubbles: true, cancelable: true, button: 0 }))
  button.click()
}

const setNativeValue = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Types `text` into a React-controlled input one letter at a time, then calls `onTyped`; returns a cancel. */
export function typeInto(input: HTMLInputElement, text: string, onTyped: () => void, delay = TYPING_DELAY_MS): () => void {
  let typed = 0
  const timer = window.setInterval(() => {
    setNativeValue(input, text.slice(0, ++typed))
    if (typed < text.length) return
    window.clearInterval(timer)
    onTyped()
  }, delay)
  return () => window.clearInterval(timer)
}

/** Expands the collapsed search in `container` if needed, then types `text` into it; returns a cancel. */
export function searchFor(container: Element | null, text: string, onTyped: () => void): () => void {
  const input = container?.querySelector('input')
  if (!input) return () => {}
  if (input.getBoundingClientRect().width > 0) return typeInto(input, text, onTyped)
  container?.querySelector('button')?.click()
  let cancelTyping = () => {}
  const timer = window.setTimeout(() => { cancelTyping = typeInto(input, text, onTyped) }, EXPAND_DELAY_MS)
  return () => {
    window.clearTimeout(timer)
    cancelTyping()
  }
}

const WAIT_FRAMES = 120

const press = (element: HTMLElement) => {
  // Radix tabs select on mousedown, menu items on click.
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }))
  element.click()
}

export const MEASURE_REGION = 'measure-demo-region'

/** Presses the `data-tour` control, or the button inside it, as soon as it renders; returns a cancel. */
export function pressWhenShown(anchor: string, root: ParentNode = document): () => void {
  let frame = 0
  let frames = 0
  const attempt = () => {
    const control = root.querySelector<HTMLElement>(`[data-tour="${anchor}"]`)
    const input = control?.querySelector('input')
    if (input) input.focus()
    else if (control) press(control.querySelector('button') ?? control)
    else if (++frames < WAIT_FRAMES) frame = requestAnimationFrame(attempt)
  }
  attempt()
  return () => cancelAnimationFrame(frame)
}

/** Runs each action the given milliseconds after the one before it; returns a cancel. */
export function runTimeline(actions: [delay: number, action: () => void][]): () => void {
  const timers: number[] = []
  let at = 0
  for (const [delay, action] of actions) {
    at += delay
    timers.push(window.setTimeout(action, at))
  }
  return () => timers.forEach(timer => window.clearTimeout(timer))
}

export type LngLat = [lng: number, lat: number]

interface ProjectingMap {
  project: (lngLat: LngLat) => { x: number; y: number }
  getContainer: () => HTMLElement
  on: (type: 'move', listener: () => void) => unknown
  off: (type: 'move', listener: () => void) => unknown
}

/** An invisible `data-tour` box that tracks `coords` on the map, so a step can spotlight part of the map. */
export function anchorMapRegion(map: ProjectingMap, coords: LngLat[], anchor: string, padding = 24): () => void {
  const box = document.createElement('div')
  box.dataset.tour = anchor
  box.style.cssText = 'position:absolute;pointer-events:none;'
  const place = () => {
    const points = coords.map(coord => map.project(coord))
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    Object.assign(box.style, {
      left: `${Math.min(...xs) - padding}px`,
      top: `${Math.min(...ys) - padding}px`,
      width: `${Math.max(...xs) - Math.min(...xs) + padding * 2}px`,
      height: `${Math.max(...ys) - Math.min(...ys) + padding * 2}px`,
    })
  }
  place()
  map.getContainer().append(box)
  map.on('move', place)
  return () => {
    map.off('move', place)
    box.remove()
  }
}

/** Puts focus back on the tour card, so its arrow keys work after a demo typed into the page. */
export function focusTourCard(root: Document = document): void {
  root.querySelector<HTMLElement>('.cdt-tour-card .cdt-tour-next')?.focus({ preventScroll: true })
}

/** Runs `action` once no dropdown menu is open, so a closing menu cannot dismiss the one it opens; returns a cancel. */
export function afterMenusClose(action: () => void, root: ParentNode = document): () => void {
  let frame = 0
  let frames = 0
  const attempt = () => {
    if (!root.querySelector('[role="menu"]') || ++frames >= WAIT_FRAMES) action()
    else frame = requestAnimationFrame(attempt)
  }
  frame = requestAnimationFrame(attempt)
  return () => cancelAnimationFrame(frame)
}

/** Expands the collapsible section marked with the `data-tour` anchor if it is collapsed. */
export function openSection(anchor: string, root: ParentNode = document): void {
  const header = root.querySelector<HTMLElement>(`[data-tour="${anchor}"] [aria-expanded]`)
  if (header?.getAttribute('aria-expanded') === 'false') header.click()
}

const DEMO_DELAY_MS = 700

const activeTab = (group: Element) => group.querySelector<HTMLElement>('[role="tab"][data-state="active"]')

/** Switches the tab group in the anchor to another enabled tab after a beat, and back when the step closes. */
export function demoTabs(anchor: string, root: ParentNode = document): () => void {
  let original: HTMLElement | null = null
  const timer = window.setTimeout(() => {
    const group = root.querySelector(`[data-tour="${anchor}"]`)
    original = group && activeTab(group)
    const other = group?.querySelector<HTMLElement>('[role="tab"][data-state="inactive"]:not([disabled])')
    if (other) press(other)
  }, DEMO_DELAY_MS)
  return () => {
    window.clearTimeout(timer)
    if (original?.isConnected && original.dataset.state !== 'active') press(original)
  }
}

/** Flips the first switch in the anchor after a beat, and back when the step closes. */
export function demoSwitch(anchor: string, root: ParentNode = document): () => void {
  let flipped: HTMLElement | null = null
  const timer = window.setTimeout(() => {
    flipped = root.querySelector<HTMLElement>(`[data-tour="${anchor}"] [role="switch"]:not([disabled])`)
    flipped?.click()
  }, DEMO_DELAY_MS)
  return () => {
    window.clearTimeout(timer)
    if (flipped?.isConnected) flipped.click()
  }
}
