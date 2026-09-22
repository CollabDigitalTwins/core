// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { writeModelMatrix } from '../../utils/modelMatrix'

import { cameraCentreFromClip, syncGizmoCamera, verticalFovFromClip } from './mapGizmoCamera'

const IDENTITY_MODEL = new THREE.Matrix4()

const MOVED_MODEL = new THREE.Matrix4().compose(
  new THREE.Vector3(1200.5, -340.25, 88),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, -1.1, 0.25)),
  new THREE.Vector3(3.5, 3.5, 3.5),
)

/** The mercator model matrix shape: uniform magnitude but mirrored on Y, so model space is left-handed. */
const MIRRORED_MODEL = new THREE.Matrix4()
  .makeTranslation(0.3, 0.7, 0)
  .scale(new THREE.Vector3(2.5e-5, -2.5e-5, 2.5e-5))
  .multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2))

const makeTruth = (fov: number, eye: [number, number, number], at: [number, number, number]) => {
  const camera = new THREE.PerspectiveCamera(fov, 1.6, 0.1, 1000)
  camera.position.set(...eye)
  camera.lookAt(new THREE.Vector3(...at))
  camera.updateMatrixWorld(true)
  return camera
}

const clipOf = (truth: THREE.PerspectiveCamera, model: THREE.Matrix4) =>
  new THREE.Matrix4()
    .multiplyMatrices(truth.projectionMatrix, new THREE.Matrix4().copy(truth.matrixWorld).invert())
    .multiply(model)

const eyeInModelSpace = (truth: THREE.PerspectiveCamera, model: THREE.Matrix4) =>
  truth.position.clone().applyMatrix4(new THREE.Matrix4().copy(model).invert())

const NDC_SAMPLES: [number, number, number][] = [
  [0, 0, -1],
  [0, 0, 1],
  [0.8, -0.6, -1],
  [-0.35, 0.9, 1],
  [1, 1, -1],
  [-1, -1, 0.2],
]

describe('cameraCentreFromClip', () => {
  it('recovers the eye through an identity model matrix', () => {
    const truth = makeTruth(50, [12.5, 30, -45], [3, 0, 7])
    const centre = cameraCentreFromClip(clipOf(truth, IDENTITY_MODEL))

    expect(centre.distanceTo(truth.position)).toBeLessThan(1e-6)
  })

  it('recovers the eye in model space through a translated, rotated and scaled model matrix', () => {
    const truth = makeTruth(50, [12.5, 30, -45], [3, 0, 7])
    const centre = cameraCentreFromClip(clipOf(truth, MOVED_MODEL))

    expect(centre.distanceTo(eyeInModelSpace(truth, MOVED_MODEL))).toBeLessThan(1e-6)
  })

  it('recovers the eye through the mirrored mercator model matrix', () => {
    const truth = makeTruth(35, [0.32, 0.71, 0.0004], [0.3, 0.7, 0])
    const expected = eyeInModelSpace(truth, MIRRORED_MODEL)
    const centre = cameraCentreFromClip(clipOf(truth, MIRRORED_MODEL))

    expect(centre.distanceTo(expected) / expected.length()).toBeLessThan(1e-6)
  })
})

describe('verticalFovFromClip', () => {
  it('recovers a 50 degree field of view', () => {
    const truth = makeTruth(50, [12.5, 30, -45], [3, 0, 7])

    expect(verticalFovFromClip(clipOf(truth, IDENTITY_MODEL))).toBeCloseTo(50, 8)
  })

  it('recovers a 35 degree field of view', () => {
    const truth = makeTruth(35, [-8, 120, 62], [0, 0, 0])

    expect(verticalFovFromClip(clipOf(truth, IDENTITY_MODEL))).toBeCloseTo(35, 8)
  })

  it('is unaffected by a uniformly scaled and rotated model matrix', () => {
    const truth = makeTruth(50, [12.5, 30, -45], [3, 0, 7])

    expect(verticalFovFromClip(clipOf(truth, MOVED_MODEL))).toBeCloseTo(50, 6)
  })

  it('survives a near-horizon pitch', () => {
    const truth = makeTruth(42, [0, 1.5, 0], [0, 1.5001, -900])

    expect(verticalFovFromClip(clipOf(truth, IDENTITY_MODEL))).toBeCloseTo(42, 6)
  })
})

describe('syncGizmoCamera', () => {
  it.each([
    ['identity', IDENTITY_MODEL],
    ['transformed', MOVED_MODEL],
    ['mirrored mercator', MIRRORED_MODEL],
  ])('unprojects identically to the raw clip inverse through a %s model matrix', (_label, model) => {
    const truth = makeTruth(50, [12.5, 30, -45], [3, 0, 7])
    const clip = clipOf(truth, model)
    const inverse = clip.clone().invert()
    const camera = new THREE.PerspectiveCamera()
    syncGizmoCamera(camera, clip, 1.6)

    for (const [x, y, z] of NDC_SAMPLES) {
      const viaCamera = new THREE.Vector3(x, y, z).unproject(camera)
      const viaInverse = new THREE.Vector3(x, y, z).applyMatrix4(inverse)
      const scale = Math.max(1, viaInverse.length())

      expect(viaCamera.distanceTo(viaInverse) / scale).toBeLessThan(1e-9)
    }
  })

  it('places the camera at the recovered eye looking down the centre ray', () => {
    const truth = makeTruth(50, [12.5, 30, -45], [3, 0, 7])
    const clip = clipOf(truth, IDENTITY_MODEL)
    const camera = new THREE.PerspectiveCamera()
    syncGizmoCamera(camera, clip, 1.6)

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    const truthForward = new THREE.Vector3(0, 0, -1).applyQuaternion(truth.quaternion)

    expect(camera.position.distanceTo(truth.position)).toBeLessThan(1e-6)
    expect(forward.dot(truthForward)).toBeCloseTo(1, 9)
    expect(camera.fov).toBeCloseTo(50, 8)
    expect(camera.aspect).toBe(1.6)
  })

  it('does not drift when called repeatedly with the same clip matrix', () => {
    const truth = makeTruth(50, [12.5, 30, -45], [3, 0, 7])
    const clip = clipOf(truth, MOVED_MODEL)
    const camera = new THREE.PerspectiveCamera()

    syncGizmoCamera(camera, clip, 1.6)
    const first = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      fov: camera.fov,
      projection: camera.projectionMatrix.clone(),
    }

    syncGizmoCamera(camera, clip, 1.6)
    syncGizmoCamera(camera, clip, 1.6)

    expect(camera.position.distanceTo(first.position)).toBe(0)
    expect(camera.quaternion.angleTo(first.quaternion)).toBe(0)
    expect(camera.fov).toBe(first.fov)
    expect(camera.projectionMatrix.elements).toEqual(first.projection.elements)
  })

  it('leaves the camera usable when the clip matrix is not invertible', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
    const before = camera.projectionMatrix.clone()
    const singular = new THREE.Matrix4().set(...(Array.from({ length: 16 }, () => 0) as never))

    expect(() => { syncGizmoCamera(camera, singular) }).not.toThrow()
    expect(camera.projectionMatrix.elements).toEqual(before.elements)
    expect(camera.matrixWorld.elements.every((element: number) => Number.isFinite(element))).toBe(true)
  })

  it('stays finite and correct for an orthographic clip matrix with no eye', () => {
    const ortho = new THREE.OrthographicCamera(-50, 50, 30, -30, 0.1, 500)
    ortho.position.set(20, 80, 40)
    ortho.lookAt(0, 0, 0)
    ortho.updateMatrixWorld(true)
    const clip = new THREE.Matrix4()
      .multiplyMatrices(ortho.projectionMatrix, new THREE.Matrix4().copy(ortho.matrixWorld).invert())
    const inverse = clip.clone().invert()
    const camera = new THREE.PerspectiveCamera()

    expect(() => { syncGizmoCamera(camera, clip) }).not.toThrow()
    expect(camera.position.toArray().every((value: number) => Number.isFinite(value))).toBe(true)
    expect(camera.fov).toBeGreaterThan(0)

    const viaCamera = new THREE.Vector3(0.4, -0.7, -1).unproject(camera)
    const viaInverse = new THREE.Vector3(0.4, -0.7, -1).applyMatrix4(inverse)

    expect(viaCamera.distanceTo(viaInverse)).toBeLessThan(1e-9)
  })
})

describe('against the real map model matrix', () => {
  it('unprojects identically to the clip inverse for a matrix writeModelMatrix built', () => {
    const model = writeModelMatrix(new THREE.Matrix4(), [-75.695, 45.42], 74)

    const truth = new THREE.PerspectiveCamera(36.87, 1.777, 0.1, 5000)
    truth.position.set(0.2601, 0.3604, 0.0004)
    truth.lookAt(0.26, 0.36, 0)
    truth.updateMatrixWorld(true)

    const clip = new THREE.Matrix4()
      .multiplyMatrices(truth.projectionMatrix, new THREE.Matrix4().copy(truth.matrixWorld).invert())
      .multiply(model)

    const camera = new THREE.PerspectiveCamera()
    syncGizmoCamera(camera, clip)

    const inverse = clip.clone().invert()
    for (const ndc of [[0, 0, -1], [0.7, -0.4, -1], [-0.9, 0.9, 1], [0, 0, 1]] as const) {
      const viaCamera = new THREE.Vector3(...ndc).unproject(camera)
      const viaInverse = new THREE.Vector3(...ndc).applyMatrix4(inverse)
      expect(viaCamera.distanceTo(viaInverse)).toBeLessThan(1e-6 * Math.max(1, viaInverse.length()))
    }
  })
})
