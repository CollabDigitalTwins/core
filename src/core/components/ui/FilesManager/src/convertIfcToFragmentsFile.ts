// Audit Phase 1.A (F-1d): isolated IFC->fragments conversion so the
// @thatopen runtime can be code-split out of the eager bundle.
//
// This file is only imported via a dynamic `import()` inside
// useFileUploadHandler. Map-only and non-IFC sessions never load it.
import * as OBC from '@thatopen/components'
import { IfcToFragments } from '../../../viewers/bim/src/IfcToFragments'

/**
 * Convert an IFC file to a fragments .frag file. The returned File is a
 * `(baseName)(ifc).frag` blob ready to upload via `performUploadFile`.
 *
 * Lazy: this module brings in `@thatopen/components`, `@thatopen/fragments`,
 * and the `web-ifc` WASM bootstrap, so it is intentionally not imported
 * statically by any UI code.
 */
export async function convertIfcToFragmentsFile(file: File): Promise<File> {
  const bimComponents = new OBC.Components()
  const converter = bimComponents.get(IfcToFragments)
  const fragmentBytes = await converter.loadFromFile(file)

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
