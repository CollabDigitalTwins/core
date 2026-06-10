import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import { CurrentWorld } from '../../../CurrentWorld'
import * as THREE from 'three'

interface Sensor {
  id: string
  position: THREE.Vector3
  modelId: string
}

export class AddSensor extends OBC.Component {
  static readonly uuid = '93b460f1-cc7d-44cc-b1ee-55f0cd89acaf' as const

  private _enabled = false

  private world: OBC.World | null = null

  private fragments: OBC.FragmentsManager | null = null

  set enabled(value: boolean) {
    this._enabled = value
    if (!value && this._previewElement) {
      this._previewElement.visible = false
    }
  }

  get enabled() {
    return this._enabled
  }

  readonly onSensorAdded = new OBC.Event<Sensor[]>()

  constructor(components: OBC.Components) {
    super(components)
    components.add(AddSensor.uuid, this)
    this.world = components.get(CurrentWorld).world
    if (this.world) {
      this.createPreviewElement(this.world)
      // this.setEvents(this.world, true);
    }

    this.fragments = components.get(OBC.FragmentsManager)
  }

  private _previewElement: OBF.Mark | null = null

  private createPreviewElement = (world: OBC.World) => {
    const icon = document.createElement('a')

    icon.className = 'bg-white text-black rounded-full w-10 h-10 flex items-center justify-center shadow-md cursor-pointer'
    icon.id = 'sensor-preview'

    icon.innerHTML = '<i data-lucide="radio"></i>'

    if (world) return
    const preview = new OBF.Mark(world as any, icon)
    preview.visible = false
    this._previewElement = preview
  }
}
