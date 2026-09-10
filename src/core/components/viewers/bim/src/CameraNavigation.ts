// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { CurrentWorld } from './CurrentWorld'

export type NavigationMode = 'Orbit' | 'FirstPerson'

export const MIN_MOVE_SPEED = 1
export const MAX_MOVE_SPEED = 10
export const DEFAULT_MOVE_SPEED = 4

/** Drag speed scales with walk speed so the mouse and the keys stay in proportion. */
const TRUCK_SPEED_PER_UNIT = 2

const MAX_FRAME_SECONDS = 1 / 15

// camera-controls has no type declarations reachable from core, so name only what is used.
interface WalkControls {
  truckSpeed: number
  forward: (distance: number, enableTransition?: boolean) => unknown
  truck: (x: number, y: number, enableTransition?: boolean) => unknown
  elevate: (height: number, enableTransition?: boolean) => unknown
  getPosition: (out: THREE.Vector3) => THREE.Vector3
  getTarget: (out: THREE.Vector3) => THREE.Vector3
  setLookAt: (
    positionX: number, positionY: number, positionZ: number,
    targetX: number, targetY: number, targetZ: number,
    enableTransition?: boolean,
  ) => unknown
}

type OnDemandRenderer = OBC.BaseRenderer & { needsUpdate: boolean }

const FORWARD_KEYS = new Set(['w', 'W', 'ArrowUp'])
const BACKWARD_KEYS = new Set(['s', 'S', 'ArrowDown'])
const LEFT_KEYS = new Set(['a', 'A', 'ArrowLeft'])
const RIGHT_KEYS = new Set(['d', 'D', 'ArrowRight'])
// Q/E is the editor convention for down/up, and neither collides with the movement keys.
const DOWN_KEYS = new Set(['q', 'Q'])
const UP_KEYS = new Set(['e', 'E'])

const WALK_KEYS = new Set([
  ...FORWARD_KEYS, ...BACKWARD_KEYS, ...LEFT_KEYS, ...RIGHT_KEYS, ...DOWN_KEYS, ...UP_KEYS,
])

/** Below this the change is not worth a re-render of the elevation field. */
const ELEVATION_EPSILON = 0.01

function isTyping(): boolean {
  const active = document.activeElement as HTMLElement | null
  if (!active) return false
  if (active.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)
}

export interface CameraNavigationState {
  mode: NavigationMode
  moveSpeed: number
  lockElevation: boolean
}

/**
 * Walk-mode navigation for the BIM camera: the mode, the walk speed, an elevation lock and
 * WASD/arrow movement. Owns the loop so a closed sidebar cannot strand a held key.
 */
export class CameraNavigation extends OBC.Component implements OBC.Disposable {
  static readonly uuid = '6a4f1c92-7d38-4b5e-9f21-0c7ab3e5d184' as const

  readonly onChanged = new OBC.Event<CameraNavigationState>()
  readonly onElevationChanged = new OBC.Event<number>()
  readonly onDisposed = new OBC.Event()

  enabled = true

  private currentMode: NavigationMode = 'Orbit'
  private currentMoveSpeed = DEFAULT_MOVE_SPEED
  private elevationLocked = false

  private readonly pressed = new Set<string>()
  private frameHandle = 0
  private lastFrame = 0
  private lockedElevation: number | null = null
  private reportedElevation: number | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(CameraNavigation.uuid, this)
  }

  get state(): CameraNavigationState {
    return { mode: this.currentMode, moveSpeed: this.currentMoveSpeed, lockElevation: this.elevationLocked }
  }

  get mode(): NavigationMode {
    return this.currentMode
  }

  /** First person cannot run under an orthographic lens, so it is refused rather than half-applied. */
  canUse(mode: NavigationMode): boolean {
    if (mode !== 'FirstPerson') return true
    return this.camera()?.projection.current !== 'Orthographic'
  }

  setMode(mode: NavigationMode) {
    const camera = this.camera()
    if (!camera || !this.canUse(mode)) return

    camera.set(mode)
    this.currentMode = mode
    // OBC's mode setter writes truckSpeed itself, so ours has to land after it.
    this.applyMoveSpeed()
    this.lockedElevation = null
    this.reportedElevation = null
    this.reportElevation(this.elevation)

    if (mode === 'FirstPerson') this.startLoop()
    else this.stopLoop()

    this.publish()
  }

  setMoveSpeed(moveSpeed: number) {
    const clamped = Math.min(Math.max(moveSpeed, MIN_MOVE_SPEED), MAX_MOVE_SPEED)
    this.currentMoveSpeed = Number.isFinite(clamped) ? clamped : DEFAULT_MOVE_SPEED
    this.applyMoveSpeed()
    this.publish()
  }

  setLockElevation(lockElevation: boolean) {
    this.elevationLocked = lockElevation
    this.lockedElevation = null
    this.publish()
  }

  /** Metres in world space, which for a Y-up scene is the camera's height. */
  get elevation(): number | null {
    const controls = this.controls()
    return controls ? controls.getPosition(new THREE.Vector3()).y : null
  }

  setElevation(metres: number) {
    const controls = this.controls()
    if (!controls || !Number.isFinite(metres)) return

    const position = controls.getPosition(new THREE.Vector3())
    const target = controls.getTarget(new THREE.Vector3())
    const rise = metres - position.y

    // The target rises with the camera so typing a height pans rather than tilting the view.
    controls.setLookAt(position.x, metres, position.z, target.x, target.y + rise, target.z, false)
    if (this.lockedElevation !== null) this.lockedElevation = metres
    this.reportElevation(metres)
    this.wake()
  }

  dispose() {
    this.stopLoop()
    this.pressed.clear()
    this.onChanged.reset()
    this.onElevationChanged.reset()
    this.onDisposed.trigger()
    this.onDisposed.reset()
  }

  private publish() {
    this.onChanged.trigger(this.state)
  }

  private camera(): OBC.OrthoPerspectiveCamera | null {
    const camera = this.components.get(CurrentWorld).world?.camera
    return camera instanceof OBC.OrthoPerspectiveCamera ? camera : null
  }

  private controls(): WalkControls | null {
    return (this.camera()?.controls as unknown as WalkControls | undefined) ?? null
  }

  private applyMoveSpeed() {
    const controls = this.controls()
    if (controls) controls.truckSpeed = this.currentMoveSpeed * TRUCK_SPEED_PER_UNIT
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.enabled || this.currentMode !== 'FirstPerson') return
    if (!WALK_KEYS.has(event.key) || isTyping()) return

    event.preventDefault()
    this.pressed.add(event.key)
  }

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.pressed.delete(event.key)
  }

  // A key held while the tab loses focus never reports keyup, so it would walk forever.
  private readonly releaseKeys = () => {
    this.pressed.clear()
  }

  // Listeners live only as long as walk mode, so orbiting costs no global handlers.
  private startLoop() {
    if (this.frameHandle) return
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.releaseKeys)
    this.lastFrame = performance.now()
    this.frameHandle = requestAnimationFrame(this.step)
  }

  private stopLoop() {
    if (this.frameHandle) cancelAnimationFrame(this.frameHandle)
    this.frameHandle = 0
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.releaseKeys)
    this.pressed.clear()
  }

  private readonly step = () => {
    this.frameHandle = requestAnimationFrame(this.step)

    // Switching to an orthographic lens mid-walk leaves a mode the camera cannot run.
    if (!this.canUse('FirstPerson')) {
      this.setMode('Orbit')
      return
    }

    const now = performance.now()
    // A backgrounded tab resumes with a huge delta, which would teleport the camera.
    const seconds = Math.min((now - this.lastFrame) / 1000, MAX_FRAME_SECONDS)
    this.lastFrame = now

    // Both run: the lock has to correct the drift the walk just introduced.
    const walked = this.walk(seconds)
    const held = this.holdElevation()

    // Reported every frame, not only when walking, so a mouse drag updates the field too.
    this.reportElevation(this.elevation)
    if (walked || held) this.wake()
  }

  // The BIM renderer draws on demand, so a held key would otherwise freeze the view.
  private wake() {
    const renderer = this.components.get(CurrentWorld).world?.renderer as OnDemandRenderer | undefined
    if (renderer) renderer.needsUpdate = true
  }

  private reportElevation(metres: number | null) {
    if (metres === null) return
    if (this.reportedElevation !== null && Math.abs(metres - this.reportedElevation) < ELEVATION_EPSILON) return
    this.reportedElevation = metres
    this.onElevationChanged.trigger(metres)
  }

  private walk(seconds: number): boolean {
    if (this.pressed.size === 0) return false

    const controls = this.controls()
    if (!controls) return false

    const distance = this.currentMoveSpeed * seconds
    let ahead = 0
    let sideways = 0
    let vertical = 0

    for (const key of this.pressed) {
      if (FORWARD_KEYS.has(key)) ahead += distance
      if (BACKWARD_KEYS.has(key)) ahead -= distance
      if (RIGHT_KEYS.has(key)) sideways += distance
      if (LEFT_KEYS.has(key)) sideways -= distance
      if (UP_KEYS.has(key)) vertical += distance
      if (DOWN_KEYS.has(key)) vertical -= distance
    }

    if (ahead !== 0) controls.forward(ahead, false)
    if (sideways !== 0) controls.truck(sideways, 0, false)
    if (vertical !== 0) {
      controls.elevate(vertical, false)
      // Deliberate vertical input re-bases the lock rather than being cancelled by it.
      if (this.lockedElevation !== null) this.lockedElevation += vertical
    }

    return ahead !== 0 || sideways !== 0 || vertical !== 0
  }

  private holdElevation(): boolean {
    if (!this.elevationLocked) {
      this.lockedElevation = null
      return false
    }

    const controls = this.controls()
    if (!controls) return false

    const position = controls.getPosition(new THREE.Vector3())
    const target = controls.getTarget(new THREE.Vector3())

    if (this.lockedElevation === null) {
      this.lockedElevation = position.y
      return false
    }

    const height = this.lockedElevation
    if (position.y === height && target.y === height) return false

    controls.setLookAt(position.x, height, position.z, target.x, height, target.z, false)
    return true
  }
}
