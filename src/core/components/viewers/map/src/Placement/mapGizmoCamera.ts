// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

const FINITE_EYE_W_RATIO = 1e9
const MIN_FOV_DEGREES = 1e-3
const FALLBACK_FOV_DEGREES = 50

const _inv = new THREE.Matrix4()
const _eye4 = new THREE.Vector4()
const _eye = new THREE.Vector3()
const _nearCentre = new THREE.Vector3()
const _farCentre = new THREE.Vector3()
const _nearTop = new THREE.Vector3()
const _farTop = new THREE.Vector3()
const _nearBottom = new THREE.Vector3()
const _forward = new THREE.Vector3()
const _up = new THREE.Vector3()
const _topRay = new THREE.Vector3()
const _pullback = new THREE.Vector3()
const _target = new THREE.Vector3()
const _basis = new THREE.Matrix4()

function writeClipInverse(out: THREE.Matrix4, clip: THREE.Matrix4): boolean {
  // A mercator clip matrix has a legitimately tiny determinant (~1e-14), so only exact singularity can be rejected here.
  const determinant = clip.determinant()
  if (determinant === 0 || !Number.isFinite(determinant)) return false

  out.copy(clip).invert()
  return out.elements.every((element: number) => Number.isFinite(element))
}

function unprojectNdc(out: THREE.Vector3, inv: THREE.Matrix4, x: number, y: number, z: number): THREE.Vector3 {
  return out.set(x, y, z).applyMatrix4(inv)
}

function writeForward(out: THREE.Vector3, inv: THREE.Matrix4): THREE.Vector3 {
  unprojectNdc(_nearCentre, inv, 0, 0, -1)
  unprojectNdc(_farCentre, inv, 0, 0, 1)
  return out.copy(_farCentre).sub(_nearCentre).normalize()
}

function writeUp(out: THREE.Vector3, inv: THREE.Matrix4): THREE.Vector3 {
  unprojectNdc(_nearTop, inv, 0, 1, -1)
  unprojectNdc(_nearBottom, inv, 0, -1, -1)
  return out.copy(_nearTop).sub(_nearBottom).normalize()
}

function writeTopRay(out: THREE.Vector3, inv: THREE.Matrix4): THREE.Vector3 {
  unprojectNdc(_nearTop, inv, 0, 1, -1)
  unprojectNdc(_farTop, inv, 0, 1, 1)
  return out.copy(_farTop).sub(_nearTop).normalize()
}

function writeEye(out: THREE.Vector3, inv: THREE.Matrix4): THREE.Vector3 {
  _eye4.set(0, 0, 1, 0).applyMatrix4(inv)
  if (!(Math.abs(_eye4.w) * FINITE_EYE_W_RATIO > Math.hypot(_eye4.x, _eye4.y, _eye4.z))) {
    unprojectNdc(_nearCentre, inv, 0, 0, -1)
    unprojectNdc(_farCentre, inv, 0, 0, 1)
    return out.copy(_nearCentre).sub(_pullback.copy(_farCentre).sub(_nearCentre))
  }
  return out.set(_eye4.x / _eye4.w, _eye4.y / _eye4.w, _eye4.z / _eye4.w)
}

function fovDegreesBetweenRays(forward: THREE.Vector3, inv: THREE.Matrix4): number {
  writeTopRay(_topRay, inv)
  const half = Math.acos(THREE.MathUtils.clamp(forward.dot(_topRay), -1, 1))
  const fov = THREE.MathUtils.radToDeg(2 * half)
  return Number.isFinite(fov) && fov > MIN_FOV_DEGREES ? fov : FALLBACK_FOV_DEGREES
}

/**
 * Eye position in model space of a combined clip matrix `C = P * V * M`. An
 * orthographic-like `C` has no finite eye and falls back one frustum depth behind the near plane.
 */
export function cameraCentreFromClip(clip: THREE.Matrix4): THREE.Vector3 {
  if (!writeClipInverse(_inv, clip)) return new THREE.Vector3()
  return writeEye(new THREE.Vector3(), _inv)
}

/** Vertical field of view in degrees of a combined clip matrix `C = P * V * M`. */
export function verticalFovFromClip(clip: THREE.Matrix4): number {
  if (!writeClipInverse(_inv, clip)) return FALLBACK_FOV_DEGREES
  return fovDegreesBetweenRays(writeForward(_forward, _inv), _inv)
}

/**
 * Rewrites `camera` to project exactly as `clip` does, with a real world transform
 * `TransformControls` and `Raycaster` can read. Call once per frame from the layer's render.
 */
export function syncGizmoCamera(camera: THREE.PerspectiveCamera, clip: THREE.Matrix4, aspect?: number): void {
  if (!writeClipInverse(_inv, clip)) return

  writeEye(_eye, _inv)
  writeForward(_forward, _inv)
  writeUp(_up, _inv)
  if (!Number.isFinite(_eye.x) || _forward.lengthSq() === 0 || _up.lengthSq() === 0) return

  _basis.lookAt(_eye, _target.copy(_eye).add(_forward), _up)
  camera.position.copy(_eye)
  camera.quaternion.setFromRotationMatrix(_basis)
  camera.updateMatrixWorld(true)

  camera.fov = fovDegreesBetweenRays(_forward, _inv)
  if (aspect !== undefined) camera.aspect = aspect

  // updateProjectionMatrix() must not be called after this: it would rebuild the matrix from fov/aspect/near/far.
  camera.projectionMatrix.multiplyMatrices(clip, camera.matrixWorld)
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
}
