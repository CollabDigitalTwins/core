/**
 * Camera restoration utility for PointCloud viewer
 */

import { ReadonlyURLSearchParams } from 'next/navigation'

/**
 * Restores camera position from URL parameters
 * Returns true if camera was restored, false otherwise
 */
export function restoreCameraFromUrl(
  viewer: any,
  searchParams: ReadonlyURLSearchParams
): boolean {
  const camX = searchParams.get('camX')
  const camY = searchParams.get('camY')
  const camZ = searchParams.get('camZ')
  const tarX = searchParams.get('tarX')
  const tarY = searchParams.get('tarY')
  const tarZ = searchParams.get('tarZ')

  if (camX && camY && camZ && tarX && tarY && tarZ) {
    // Restore camera position from URL
    viewer.scene.view.position.set(
      parseFloat(camX),
      parseFloat(camY),
      parseFloat(camZ)
    )
    viewer.scene.view.lookAt(
      parseFloat(tarX),
      parseFloat(tarY),
      parseFloat(tarZ)
    )
    return true
  }

  return false
}
