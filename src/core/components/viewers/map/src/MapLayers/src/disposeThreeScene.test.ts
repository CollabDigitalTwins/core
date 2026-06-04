import { describe, it, expect, vi } from 'vitest'
import * as THREE from 'three'
import { disposeThreeScene } from './disposeThreeScene'

describe('disposeThreeScene', () => {
  it('disposes geometry, material, and material textures of every mesh', () => {
    const scene = new THREE.Scene()
    const geometry = new THREE.BufferGeometry()
    const texture = new THREE.Texture()
    const material = new THREE.MeshBasicMaterial({ map: texture })
    scene.add(new THREE.Mesh(geometry, material))

    const geoSpy = vi.spyOn(geometry, 'dispose')
    const matSpy = vi.spyOn(material, 'dispose')
    const texSpy = vi.spyOn(texture, 'dispose')

    disposeThreeScene(scene)

    expect(geoSpy).toHaveBeenCalledOnce()
    expect(matSpy).toHaveBeenCalledOnce()
    expect(texSpy).toHaveBeenCalledOnce()
    expect(scene.children).toHaveLength(0)
  })

  it('disposes every material when mesh.material is an array', () => {
    const scene = new THREE.Scene()
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), [
      new THREE.MeshBasicMaterial(),
      new THREE.MeshStandardMaterial(),
    ])
    scene.add(mesh)
    const spies = (mesh.material as THREE.Material[]).map((m) => vi.spyOn(m, 'dispose'))

    disposeThreeScene(scene)

    spies.forEach((s) => expect(s).toHaveBeenCalledOnce())
  })

  it('skips non-mesh objects without throwing and still clears the graph', () => {
    const scene = new THREE.Scene()
    scene.add(new THREE.Group())
    scene.add(new THREE.AmbientLight())

    expect(() => disposeThreeScene(scene)).not.toThrow()
    expect(scene.children).toHaveLength(0)
  })
})
