// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { applyAnimationTo, DEFAULT_ANIMATION_STATE } from './modelAnimation'

const clipOf = (name: string) =>
  new THREE.AnimationClip(name, 1, [new THREE.VectorKeyframeTrack('.position', [0, 1], [0, 0, 0, 1, 1, 1])])

function setUp() {
  const clips = [clipOf('open'), clipOf('close')]
  return { mixer: new THREE.AnimationMixer(new THREE.Object3D()), clips }
}

describe('applyAnimationTo', () => {
  it('runs only the chosen clip, so two never play at once', () => {
    const { mixer, clips } = setUp()

    applyAnimationTo(mixer, clips, { ...DEFAULT_ANIMATION_STATE, clipIndex: 1 })

    expect(mixer.clipAction(clips[1]).isRunning()).toBe(true)
    expect(mixer.clipAction(clips[0]).isRunning()).toBe(false)
  })

  it('carries the speed and the paused state onto the running action', () => {
    const { mixer, clips } = setUp()

    applyAnimationTo(mixer, clips, { clipIndex: 0, playing: false, speed: 2 })

    const action = mixer.clipAction(clips[0])
    expect(action.timeScale).toBe(2)
    expect(action.paused).toBe(true)
  })

  it('stops everything when the state names a clip the model does not have', () => {
    const { mixer, clips } = setUp()
    applyAnimationTo(mixer, clips, DEFAULT_ANIMATION_STATE)

    applyAnimationTo(mixer, clips, { ...DEFAULT_ANIMATION_STATE, clipIndex: 9 })

    expect(mixer.clipAction(clips[0]).isRunning()).toBe(false)
  })
})
