// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as FRAGS from '@thatopen/fragments'
import { CurrentWorld } from './CurrentWorld'
import { LoadModels } from './LoadModels'

export class LoadIfcAsFragments extends OBC.Component {
  static readonly uuid = 'c1007187-c47b-47a5-8472-d2d06be83973' as const

  enabled = true

  // Events for loading states
  onLoadingStateChanged = new OBC.Event<{ isLoading: boolean, message: string }>()

  private world: OBC.World | null = null
  private fragments: OBC.FragmentsManager | null = null
  private loadModels: LoadModels | null = null
  private serializer: FRAGS.IfcImporter | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(LoadIfcAsFragments.uuid, this)
    this.world = components.get(CurrentWorld).world
    this.fragments = components.get(OBC.FragmentsManager)
    this.loadModels = components.get(LoadModels)
    this.initializeSerializer()
  }

  private async initializeSerializer() {
    try {
      this.serializer = new FRAGS.IfcImporter()
      // ⚠️⚠️ IMPORTANT: keep this web-ifc version in sync with the `web-ifc` version
      this.serializer.wasm = { absolute: true, path: 'https://unpkg.com/web-ifc@0.0.77/' }
    }
    catch (error) {
      console.warn('Could not initialize IFC serializer:', error)
      this.serializer = null
    }
  }

  async loadFromFile(file: File, modelId: string): Promise<Uint8Array> {
    if (!(this.fragments && this.world && this.loadModels)) {
      throw new Error('Missing required components.')
    }

    try {
      const fileBuffer = await file.arrayBuffer()

      // Handle only IFC files - convert to fragments first
      this.onLoadingStateChanged.trigger({ isLoading: true, message: 'Converting IFC to fragments...' })

      if (this.serializer) {
        const ifcBytes = new Uint8Array(fileBuffer)
        const fragmentBytes = await this.serializer.process({ bytes: ifcBytes })

        if (fragmentBytes) {
          // Update loading message
          this.onLoadingStateChanged.trigger({ isLoading: true, message: 'Loading BIM Model...' })

          // Convert Uint8Array to ArrayBuffer
          const fragmentBuffer = new ArrayBuffer(fragmentBytes.byteLength)
          new Uint8Array(fragmentBuffer).set(fragmentBytes)
          const model = await this.fragments.core.load(fragmentBuffer, { modelId })
          await this.loadModels.loadModel(model, modelId)

          // Conversion and loading complete
          this.onLoadingStateChanged.trigger({ isLoading: false, message: '' })

          // Return the bytes so the caller can upload a .frag file
          return fragmentBytes
        }
        else {
          this.onLoadingStateChanged.trigger({ isLoading: false, message: '' })
          throw new Error('Failed to serialize IFC to fragments')
        }
      }
      else {
        this.onLoadingStateChanged.trigger({ isLoading: false, message: '' })
        throw new Error('IFC serializer not available')
      }
    }
    catch (error) {
      // Make sure to clear loading state on error
      this.onLoadingStateChanged.trigger({ isLoading: false, message: '' })
      throw new Error(`Error loading file: ${error}`)
    }
  }
}
