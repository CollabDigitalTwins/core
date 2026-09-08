// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

// `Material.dispose` does not cascade to the maps it references, so walk them first.
function disposeMaterial(material: THREE.Material) {
  for (const value of Object.values(material)) {
    const texture = value as THREE.Texture | null
    if (texture?.isTexture) texture.dispose()
  }
  material.dispose()
}

/** Detaches an object and frees its geometry, materials and textures. Three.js frees none of them. */
export function disposeObject3D(object: THREE.Object3D) {
  object.removeFromParent()

  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    mesh.geometry?.dispose()

    const material = mesh.material
    if (material) {
      for (const single of Array.isArray(material) ? material : [material]) disposeMaterial(single)
    }

    const skinned = child as THREE.SkinnedMesh
    if (skinned.isSkinnedMesh) skinned.skeleton?.dispose()

    const instanced = child as THREE.InstancedMesh
    if (instanced.isInstancedMesh) instanced.dispose()
  })

  object.clear()
}
