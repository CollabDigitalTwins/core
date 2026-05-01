import * as THREE from 'three'

/**
 * Fully disposes all GPU resources in a Three.js scene:
 * geometries, materials, and every texture referenced by those materials.
 * Call this before nulling out a scene to avoid WebGL memory leaks.
 */
export function disposeThreeScene(scene: THREE.Scene): void {
    scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (!mesh.isMesh) return

        mesh.geometry?.dispose()

        const materials: THREE.Material[] = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]

        for (const mat of materials) {
            if (!mat) continue
            // Dispose every texture property on the material
            for (const value of Object.values(mat)) {
                if (value instanceof THREE.Texture) (value as THREE.Texture).dispose()
            }
            mat.dispose()
        }
    })

    // Detach all children so the scene graph is clean
    while (scene.children.length > 0) scene.remove(scene.children[0])
}
