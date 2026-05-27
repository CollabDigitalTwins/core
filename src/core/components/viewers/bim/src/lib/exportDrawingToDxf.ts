import * as OBC from '@thatopen/components'
import * as THREE from 'three'

/**
 * Serialize a {@link OBC.TechnicalDrawing} to DXF and trigger a browser
 * download. Each per-IFC-class drawing layer becomes a DXF layer, so the
 * downloaded file is editable layer-by-layer in CAD software.
 *
 * `rotationDeg` rotates the exported geometry around the drawing's local Y
 * axis (XZ plane) so the DXF lands in the same orientation the user sees
 * on screen — typically the building's true-north angle. The transform is
 * applied to a temporary clone of each `LineSegments`'s position buffer
 * and reverted before the function returns, so the live drawing is never
 * mutated.
 *
 * Uses {@link OBC.DxfManager}'s exporter — see the `OBC.DxfExporter` class
 * documentation for the full set of supported entities.
 */
export function exportDrawingToDxf(
  components: OBC.Components,
  drawing: OBC.TechnicalDrawing,
  fileName: string,
  rotationDeg = 0,
) {
  const restore = applyRotationInPlace(drawing, rotationDeg)
  try {
    const manager = components.get(OBC.DxfManager)
    // Export the full drawing (no viewport clipping).
    const dxf = manager.exporter.export([{ drawing, viewports: [{}] }])
    triggerDownload(dxf, fileName)
  } finally {
    restore?.()
  }
}

function triggerDownload(dxf: string, fileName: string) {
  const blob = new Blob([dxf], { type: 'application/dxf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.toLowerCase().endsWith('.dxf')
    ? fileName
    : `${fileName}.dxf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Rotate every `LineSegments` position attribute on the drawing by
 * `degrees` around the drawing's local Y axis, returning a `restore()`
 * callback that puts the original buffers back. The rotation matches
 * `controls.rotateAzimuthTo` direction (positive degrees → CCW when
 * viewed from above), so the DXF reads as the on-screen orientation.
 *
 * Returns `null` for the no-rotation case so callers can skip the
 * try/finally bookkeeping.
 */
function applyRotationInPlace(
  drawing: OBC.TechnicalDrawing,
  degrees: number,
): null | (() => void) {
  if (!degrees) return null
  const rad = (degrees * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const restorers: Array<() => void> = []

  drawing.three.traverse((child) => {
    if (!(child instanceof THREE.LineSegments)) return
    const pos = child.geometry.attributes.position as
      | THREE.BufferAttribute
      | undefined
    if (!pos) return
    const arr = pos.array as Float32Array
    const original = new Float32Array(arr.length)
    original.set(arr)
    for (let i = 0; i < pos.count; i++) {
      const x = arr[i * 3]
      const z = arr[i * 3 + 2]
      arr[i * 3] = x * cos + z * sin
      arr[i * 3 + 2] = -x * sin + z * cos
    }
    pos.needsUpdate = true
    restorers.push(() => {
      arr.set(original)
      pos.needsUpdate = true
    })
  })

  return () => {
    for (const r of restorers) r()
  }
}
