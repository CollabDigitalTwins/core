// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { IfcToFragments } from '../../../viewers/bim/src/IfcToFragments'

/**
 * Converts an IFC to a `(baseName)(ifc).frag` File; `onProgress` reports a 0-1 fraction.
 * Pulls in the web-ifc WASM bootstrap, so this module must only be imported dynamically.
 */
export async function convertIfcToFragmentsFile(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<File> {
  const bimComponents = new OBC.Components()
  const converter = bimComponents.get(IfcToFragments)
  const fragmentBytes = await converter.loadFromFile(file, onProgress)

  // Convert Uint8Array to ArrayBuffer slice to satisfy Blob typing.
  const arrayBuffer = (fragmentBytes.buffer as ArrayBuffer).slice(
    fragmentBytes.byteOffset,
    fragmentBytes.byteOffset + fragmentBytes.byteLength,
  )
  const fragBlob = new Blob([arrayBuffer], { type: 'application/octet-stream' })
  const baseName = file.name.replace(/\.[^.]+$/, '')
  const fragName = `${baseName}(ifc).frag`
  return new File([fragBlob], fragName, { type: 'application/octet-stream' })
}
