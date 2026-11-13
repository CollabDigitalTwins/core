// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import type * as FRAGS from '@thatopen/fragments'

/** Undoes the importer's ground-plane shift, so the georeferenced IFC origin sits on the map anchor. */
export async function ifcOriginOffset(model: FRAGS.FragmentsModel): Promise<THREE.Vector3> {
  const shift = new THREE.Vector3().setFromMatrixPosition(await model.getCoordinationMatrix())
  return new THREE.Vector3(shift.x, 0, shift.z)
}
