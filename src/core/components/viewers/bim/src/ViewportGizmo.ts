import { CurrentCamera } from './CurrentCamera'
import * as OBC from '@thatopen/components'
import { CurrentWorld } from './CurrentWorld'
import { ViewportGizmo as ThreeViewportGizmo } from 'three-viewport-gizmo'

export class ViewportGizmo extends OBC.Component implements OBC.Disposable {
  static readonly uuid = 'c51594f0-68af-4318-ac86-c2e0e7ee62df' as const

  readonly onDisposed = new OBC.Event()

  private _enabled = false

  get enabled(): boolean {
    return this._enabled
  }

  set enabled(value: boolean) {
    this._enabled = value
    const gizmoDom = (this.gizmo as any)?.domElement
    if (gizmoDom) {
      gizmoDom.style.pointerEvents = this._enabled ? 'auto' : 'none'
    }
  }

  private _labels = {
    top: 'TOP',
    right: 'RIGHT',
    bottom: 'BOTTOM',
    left: 'LEFT',
    front: 'FRONT',
    back: 'BACK'
  }

  setLabels(labels: {
    top: string
    right: string
    bottom: string
    left: string
    front: string
    back: string
  }) {
    const labelsChanged =
      this._labels.top !== labels.top ||
      this._labels.right !== labels.right ||
      this._labels.bottom !== labels.bottom ||
      this._labels.left !== labels.left ||
      this._labels.front !== labels.front ||
      this._labels.back !== labels.back

    if (!labelsChanged) {
      return
    }

    this._labels = labels
    // If gizmo is already created, recreate it with new labels
    if (this.gizmo) {
      this.remove()
      this.add()
    }
  }

  private camera: OBC.OrthoPerspectiveCamera | null = null
  private world: OBC.World | null = null
  private gizmo: ThreeViewportGizmo | null = null
  private restoreRenderHook: (() => void) | null = null
  private isRenderingFromHook = false

  constructor(components: OBC.Components) {
    super(components)
    components.add(ViewportGizmo.uuid, this)
    this.camera = components.get(CurrentCamera).camera
    this.world = components.get(CurrentWorld).world
    // Reset to Three.js default
  }

  add() {
    if (this.gizmo) {
      return
    }

    if (this.camera && this.world && this.world.renderer) {
      const gizmoConfig = this.getGizmoConfig()

      this.gizmo = new ThreeViewportGizmo(
        this.camera.three,
        this.world.renderer.three,
        gizmoConfig,
      )

      if (this.gizmo) {
        this.hookRenderer()

        // Store references to event handlers for proper cleanup
        const startHandler = () => {
          if (this.world?.camera.controls) {
            this.world.camera.controls.enabled = false
          }
        };

        const endHandler = () => {
          if (this.world?.camera.controls) {
            this.world.camera.controls.enabled = true
          }
        };

        const changeHandler = () => {
          if (this.world?.camera.controls && this.camera) {
            const position = this.camera.three.position.toArray() as [number, number, number]
            this.world.camera.controls.setPosition(...position)
          }
        };

        const updateHandler = () => {
          if (this.gizmo && this.enabled && this.world?.camera.controls) {
            this.world.camera.controls.getTarget(this.gizmo.target)
            this.gizmo.update()
          }
        };

        // Store handlers on the gizmo for cleanup
        (this.gizmo as any)._startHandler = startHandler;
        (this.gizmo as any)._endHandler = endHandler;
        (this.gizmo as any)._changeHandler = changeHandler;
        (this.gizmo as any)._updateHandler = updateHandler;

        // Add event listeners
        (this.gizmo as any).addEventListener('start', startHandler);
        (this.gizmo as any).addEventListener('end', endHandler);
        (this.gizmo as any).addEventListener('change', changeHandler);

        this.world.camera.controls.addEventListener('update', updateHandler);

        if (this.world.camera.controls) {
          const targetArray = this.gizmo.target.set(0, 0, 0).toArray() as [number, number, number]
          this.world.camera.controls.setTarget(...targetArray)
          this.camera.three.lookAt(this.gizmo.target)
        }

        // Set initial pointer events based on enabled state
        const gizmoDom = (this.gizmo as any).domElement;
        if (gizmoDom) {
          gizmoDom.style.pointerEvents = this._enabled ? 'auto' : 'none';
        }
      }
    }
  }

  remove() {
    if (this.gizmo) {
      // Store references to the actual event listener functions for proper cleanup
      const gizmoStartHandler = (this.gizmo as any)._startHandler;
      const gizmoEndHandler = (this.gizmo as any)._endHandler;
      const gizmoChangeHandler = (this.gizmo as any)._changeHandler;
      const controlsUpdateHandler = (this.gizmo as any)._updateHandler;

      // Remove all event listeners if they exist
      if (gizmoStartHandler) {
        (this.gizmo as any).removeEventListener('start', gizmoStartHandler);
      }
      if (gizmoEndHandler) {
        (this.gizmo as any).removeEventListener('end', gizmoEndHandler);
      }
      if (gizmoChangeHandler) {
        (this.gizmo as any).removeEventListener('change', gizmoChangeHandler);
      }

      // Remove camera controls event listener
      if (this.world?.camera?.controls && controlsUpdateHandler) {
        this.world.camera.controls.removeEventListener('update', controlsUpdateHandler);
      }

      if (this.restoreRenderHook) {
        this.restoreRenderHook()
        this.restoreRenderHook = null
      }

      // Remove the DOM element from the document
      const gizmoElement = (this.gizmo as any).domElement
      if (gizmoElement && gizmoElement.parentNode) {
        gizmoElement.remove()
      }

      // Dispose of the gizmo
      if (this.gizmo.dispose) {
        this.gizmo.dispose()
      }

      // Remove all references
      this.gizmo = null
    }
  }

  dispose() {
    // Use remove for cleanup
    this.remove()

    // Trigger disposal event and reset
    this.onDisposed.trigger()
    this.onDisposed.reset()
  }

  render() {
    if (this.gizmo && this.enabled) {
      this.gizmo.render()
    }
  }

  update() {
    // Keep this empty to avoid duplicate updates with controls 'update' events.
  }

  private getGizmoConfig() {
    return {
      size: 75,
      placement: 'top-right' as const,
      type: 'cube' as const,
      top: {label: this._labels.top},
      right: {label: this._labels.right},
      bottom: {label: this._labels.bottom},
      left: {label: this._labels.left},
      front: {label: this._labels.front},
      back: {label: this._labels.back},
    }
  }

  private hookRenderer() {
    if (this.restoreRenderHook || !this.world?.renderer?.three) {
      return
    }

    const renderer = this.world.renderer.three as any
    const originalRender = renderer.render
    const self = this

    renderer.render = function (...args: any[]) {
      const result = originalRender.apply(this, args)

      if (self.gizmo && self.enabled && !self.isRenderingFromHook) {
        self.isRenderingFromHook = true
        try {
          self.gizmo.render()
        } finally {
          self.isRenderingFromHook = false
        }
      }

      return result
    }

    this.restoreRenderHook = () => {
      renderer.render = originalRender
    }
  }
}
