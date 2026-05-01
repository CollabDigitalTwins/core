import * as THREE from 'three'
import * as OBC from '@thatopen/components'
import { DxfViewer } from 'dxf-viewer'
import { TransformControls } from 'three/examples/jsm/Addons.js'
import { CurrentWorld } from '../CurrentWorld'

export interface Position {
  x: number
  y: number
  z: number
}

export class DXFManager extends OBC.Component {
  static uuid = '2cf1b746-3b3d-4988-960b-ea640e0e8925' as const

  enabled = true

  onDXFImported = new OBC.Event<THREE.Group>()

  onDXFTransformed = new OBC.Event()

  private _world: OBC.World | null = null

  private _scale: number = 1

  private _id: string | null = null

  get scale() {
    return this._scale
  }

  set scale(scale: number) {
    this._scale = scale
  }

  private _rotation: number = 0

  get rotation() {
    return this._rotation
  }

  set rotation(rotation: number) {
    this._rotation = rotation
  }

  private _origin: THREE.Vector3 = new THREE.Vector3()

  get origin() {
    return this._origin
  }

  set origin(value: THREE.Vector3) {
    this._origin = value
  }

  private _dxfViewer: DxfViewer

  private _rotationMatrix = new THREE.Matrix4().makeRotationX(
    THREE.MathUtils.degToRad(-90),
  )

  private _list: {
    [id: string]: {
      drawing: THREE.Group
      matrix: THREE.Matrix4
      controls?: TransformControls
    }
  } = {}

  readonly container = document.createElement('bim-viewport')

  constructor(components: OBC.Components) {
    super(components)
    components.add(DXFManager.uuid, this)
    this._dxfViewer = new DxfViewer(this.container, null)
    this.container.addEventListener('resize', () => {
      const { width, height } = this.container.getBoundingClientRect()
      this._dxfViewer.SetSize(width, height)
    })

    this.setupDxfViewer()
    this._world = components.get(CurrentWorld).world
  }

  private setupDxfViewer() {
    const scene = this._dxfViewer.GetScene()
    const camera = this._dxfViewer.GetCamera()
    const canvas = this._dxfViewer.GetCanvas()
    const mouse = new OBC.Mouse(canvas)
    const raycaster = new THREE.Raycaster()
    raycaster.params.Line.threshold = 3

    const geometry = new THREE.SphereGeometry(5)
    const material = new THREE.MeshBasicMaterial({ color: 0xFF_00_00 })

    const sphere = new THREE.Mesh(geometry, material)
    sphere.visible = false
    scene.add(sphere)

    document.addEventListener('mousemove', () => {
      if (scene.children.length === 0) return
      raycaster.setFromCamera(mouse.position, camera)
      const result = raycaster.intersectObjects(scene.children, true)
      if (result.length > 0) {
        const element = result[0]
        sphere.position.copy(element.point)
        if (element instanceof THREE.Line) console.log(element)
      }
    })
  }

  async load(url: string, id: string, name: string, origin?: Position) {
    const existingDrawing = this._list[name]
    this._id = id

    await this._dxfViewer.Load({
      url,
      fonts: ['/fonts/Roboto-LightItalic.ttf'],
      progressCbk: null,
      workerFactory: null,
    })

    const dxfGroup = existingDrawing
      ? existingDrawing.drawing
      : new THREE.Group()

    if (existingDrawing) {
      // Remove existing from scene if present
      if (this._world?.scene.three.children.includes(existingDrawing.drawing)) {
        this._world.scene.three.remove(existingDrawing.drawing)
      }
    }
    else {
      dxfGroup.name = name
      this._list[name] = {
        drawing: dxfGroup,
        matrix: new THREE.Matrix4().set(
          1, 0, 0, 0,
          0, 1, 0, 0,
          0, 0, 1, 0,
          0, 0, 0, 1,
        ),
      }
    }

    const dxfScene = this._dxfViewer.GetScene()
    for (const child of dxfScene.children) {
      this.setPosition(child)
      dxfGroup.add(child)
    }

    // Apply transformations
    const clone = dxfGroup.clone()
    clone.scale.set(this._scale, this._scale, this._scale)

    if (origin) {
      clone.position.x = origin.x
      clone.position.z = origin.y
      clone.position.y = -origin.z
    }

    clone.rotateZ(THREE.MathUtils.degToRad(this._rotation))

    if (!this._world) return

    clone.name = this._id

    // Add to world scene
    this._world.scene.three.add(clone)

    const rotationMatrix = new THREE.Matrix4().makeRotationX(
      THREE.MathUtils.degToRad(-90),
    )
    clone.applyMatrix4(rotationMatrix)

    for (const child of clone.children) {
      // @ts-ignore
      this._world.meshes.add(child)
    }

    // Setup transform controls (gizmo)
    this.setupTransformControls(clone, name)

    this.onDXFImported.trigger(clone)

    return clone
  }

  private setupTransformControls(dxfGroup: THREE.Group, name: string) {
    if (!this._world?.camera || !this._world?.renderer) return

    const controls = new TransformControls(
      this._world.camera.three, // Use .three to get the actual THREE.Camera
      this._world.renderer.three.domElement,
    )

    // Set the initial mode to translate (move)
    controls.setMode('translate') // This allows X, Y, Z movement

    // You can also switch modes programmatically:
    // controls.setMode('rotate'); // For rotation
    // controls.setMode('scale'); // For scaling

    controls.addEventListener('dragging-changed', (event: any) => {
      if (this._world?.camera?.controls) {
        this._world.camera.controls.enabled = !event.value
      }
    })

    controls.addEventListener('change', () => {
      dxfGroup.updateMatrixWorld(true)
      this.onDXFTransformed.trigger()
    })

    // Add keyboard shortcuts for switching modes
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'g': // G for grab/translate
          controls.setMode('translate')
          break
        case 'r': // R for rotate
          controls.setMode('rotate')
          break
        case 's': // S for scale
          controls.setMode('scale')
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    controls.attach(dxfGroup)

    // Get the gizmo helper and add it to the scene
    const gizmo = controls.getHelper()
    this._world.scene.three.add(controls)
    this._world.scene.three.add(gizmo)

    // Store controls reference
    if (this._list[name]) {
      this._list[name].controls = controls;
      // Store the gizmo helper reference for cleanup
      (this._list[name] as any).gizmo = gizmo;
      // Store the cleanup function for the keyboard listener
      (this._list[name] as any).keydownHandler = handleKeyDown
    }
  }

  transform(
    dxfName: string,
    baseA: THREE.Vector3,
    baseB: THREE.Vector3,
    targetA: THREE.Vector3,
    targetB: THREE.Vector3,
    targetPlaneNormal: THREE.Vector3,
  ) {
    const existingDrawing = this._list[dxfName]?.drawing
    if (!existingDrawing) {
      console.warn(`There is no dxf drawing called ${dxfName}`)
      return
    }
    const matrix = this.getTransformMatrix(
      baseA,
      baseB,
      targetA,
      targetB,
      targetPlaneNormal,
    )
    this._list[dxfName].matrix = matrix
    for (const child of existingDrawing.children) {
      // @ts-ignore
      child.geometry.getAttribute('position').applyMatrix4(matrix)
    }
    this.onDXFTransformed.trigger(matrix)
  }

  private setPosition(object: THREE.Object3D) {
    if (!('geometry' in object)) return
    const geometry = object.geometry as THREE.BufferGeometry
    const position = geometry.getAttribute('position')
    const array: number[] = []
    for (let i = 0; i < position.array.length; i += position.itemSize) {
      array.push(position.array[i], position.array[i + 1], 0)
    }
    const newPosition = new THREE.BufferAttribute(new Float32Array(array), 3)
    geometry.setAttribute('position', newPosition)
  }

  private getTransformMatrix(
    baseA: THREE.Vector3,
    baseB: THREE.Vector3,
    targetA: THREE.Vector3,
    targetB: THREE.Vector3,
    targetPlaneNormal: THREE.Vector3,
  ) {
    const matrix = new THREE.Matrix4()

    baseB.sub(baseA)
    targetB.sub(targetA)

    // Scale
    const scaleFactor = targetB.length() / baseB.length()
    const scaleVector = new THREE.Vector3(1, 1, 1).multiplyScalar(scaleFactor)

    // Rotation
    const angle = targetB.angleTo(baseB)
    const axis = baseB.clone().cross(targetB).normalize()
    const rotationMatrix = new THREE.Matrix4().makeRotationAxis(axis, angle)

    // Additional rotation to align object's up direction with target plane normal
    const upDirection = new THREE.Vector3(0, 1, 0)
    const upAngle = upDirection.angleTo(targetPlaneNormal)
    const upAxis = upDirection.clone().cross(targetPlaneNormal).normalize()
    const upRotationMatrix = new THREE.Matrix4().makeRotationAxis(
      upAxis,
      upAngle,
    )

    const finalRotation = upRotationMatrix.multiply(rotationMatrix)

    // Transform matrix
    matrix.multiply(finalRotation)
    matrix.scale(scaleVector)
    const finalPosition = baseA
      .multiplyScalar(scaleFactor * -1)
      .applyMatrix4(finalRotation.clone().setPosition(targetA))
    matrix.setPosition(
      finalPosition.add(
        new THREE.Vector3().addScalar(this._scale).multiply(targetPlaneNormal),
      ),
    )

    return matrix
  }

  dispose() {
    // Clean up transform controls and keyboard listeners
    for (const { controls, drawing } of Object.values(this._list)) {
      if (controls && this._world?.scene.three) {
        this._world.scene.three.remove(controls)

        // Remove gizmo helper
        const gizmo = (controls as any).gizmo
        if (gizmo) {
          this._world.scene.three.remove(gizmo)
        }

        controls.dispose()
      }
      if (drawing && this._world?.scene.three) {
        this._world.scene.three.remove(drawing)
      }
      // Clean up keyboard event listener
      const keydownHandler = (this._list as any).keydownHandler
      if (keydownHandler) {
        document.removeEventListener('keydown', keydownHandler)
      }
    }
    this._list = {}
  }

  removeTransformControls(name: string) {
    const dxfData = this._list[name]
    if (dxfData?.controls && this._world?.scene.three) {
      // Remove the controls from the scene
      this._world.scene.three.remove(dxfData.controls)

      // Remove the gizmo helper from the scene
      const gizmo = (dxfData as any).gizmo
      if (gizmo) {
        this._world.scene.three.remove(gizmo)
      }

      // Dispose of the controls
      dxfData.controls.dispose()

      // Remove keyboard event listener
      const keydownHandler = (dxfData as any).keydownHandler
      if (keydownHandler) {
        document.removeEventListener('keydown', keydownHandler)
      }

      // Clear the controls and gizmo references
      delete dxfData.controls
      delete (dxfData as any).gizmo
      delete (dxfData as any).keydownHandler
    }
  }

  enableEditMode(name: string) {
    const dxfData = this._list[name]
    if (!dxfData?.drawing || !this._world?.camera || !this._world?.renderer) {
      console.warn(`Cannot enable edit mode: DXF "${name}" not found or world not available`)
      return false
    }

    // If controls already exist, don't recreate them
    if (dxfData.controls) {
      console.log(`Edit mode already enabled for DXF "${name}"`)
      return true
    }

    console.log(`Enabling edit mode for DXF "${name}"`)

    // Create new transform controls
    const controls = new TransformControls(
      this._world.camera.three,
      this._world.renderer.three.domElement,
    )

    // Set the initial mode to translate
    controls.setMode('translate')

    controls.addEventListener('dragging-changed', (event: any) => {
      if (this._world?.camera?.controls) {
        this._world.camera.controls.enabled = !event.value
      }
    })

    controls.addEventListener('change', () => {
      dxfData.drawing.updateMatrixWorld(true)
      this.onDXFTransformed.trigger()
    })

    // Add keyboard shortcuts for switching modes
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'g': // G for grab/translate
          controls.setMode('translate')
          break
        case 'r': // R for rotate
          controls.setMode('rotate')
          break
        case 's': // S for scale
          controls.setMode('scale')
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // Attach controls to the DXF group
    controls.attach(dxfData.drawing)

    // Get the gizmo helper and add both to the scene
    const gizmo = controls.getHelper()
    this._world.scene.three.add(controls)
    this._world.scene.three.add(gizmo)

    // Store references for cleanup
    dxfData.controls = controls;
    (dxfData as any).gizmo = gizmo;
    (dxfData as any).keydownHandler = handleKeyDown

    console.log(`Edit mode enabled for DXF "${name}"`)
    return true
  }

  isInEditMode(name: string): boolean {
    const dxfData = this._list[name]
    return Boolean(dxfData?.controls)
  }

  getDxfList(): string[] {
    return Object.keys(this._list)
  }

  getDxfInfo(name: string) {
    const dxfData = this._list[name]
    if (!dxfData) return null

    return {
      name,
      hasControls: Boolean(dxfData.controls),
      drawing: dxfData.drawing,
      matrix: dxfData.matrix,
    }
  }
}
