// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as FRAGS from '@thatopen/fragments'

export class IfcToFragments extends OBC.Component {
  static readonly uuid = 'ef6bd7b0-0903-4621-bc35-b0c7516576f9' as const

  enabled = true

  // Events for loading states
  onLoadingStateChanged = new OBC.Event<{ isLoading: boolean, message: string, progress?: number }>()

  private serializer: FRAGS.IfcImporter | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(IfcToFragments.uuid, this)
    void this.initializeSerializer()
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

  /** `onProgress` reports the conversion as a 0-1 fraction; a large IFC takes minutes. */
  async loadFromFile(file: File, onProgress?: (progress: number) => void): Promise<Uint8Array> {

    try {
      const fileBuffer = await file.arrayBuffer()

      // Handle only IFC files - convert to fragments first
      this.onLoadingStateChanged.trigger({ isLoading: true, message: 'Converting IFC to fragments...', progress: 0 })

      if (this.serializer) {
        const ifcBytes = new Uint8Array(fileBuffer)
        const report = (progress: number) => {
          onProgress?.(progress)
          this.onLoadingStateChanged.trigger({ isLoading: true, message: 'Converting IFC to fragments...', progress })
        }
        const fragmentBytes = await this.serializer.process({ bytes: ifcBytes, progressCallback: report })

        if (fragmentBytes) {
          // Update loading message
          this.onLoadingStateChanged.trigger({ isLoading: true, message: 'Loading BIM Model...' })

          // Convert Uint8Array to ArrayBuffer
          const fragmentBuffer = new ArrayBuffer(fragmentBytes.byteLength)
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
