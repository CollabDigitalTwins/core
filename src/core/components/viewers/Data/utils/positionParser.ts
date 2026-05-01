type LatLngPosition = {
  lng: number
  lat: number
  rotation?: number
  elevation?: number
}

type XYZPosition = {
  x: number
  y: number
  z: number
}

type Position = LatLngPosition | XYZPosition

export function parsePosition(position: string | null | undefined): Position | null {
  if (!position) return null
  
  try {
    const parsed = typeof position === 'string' ? JSON.parse(position) : position
    return parsed
  } catch {
    return null
  }
}

export function formatPosition(position: string | null | undefined): string {
  const parsed = parsePosition(position)
  if (!parsed) return ''
  
  // Check if it's lat/lng format
  if ('lat' in parsed && 'lng' in parsed) {
    const parts = [
      `Longitude: ${parsed.lng.toFixed(5)}`,
      `Latitude: ${parsed.lat.toFixed(5)}`
    ]
    
    if (parsed.elevation !== undefined) {
      parts.push(`Elevation: ${parsed.elevation}m`)
    }
    
    return parts.join(', ')
  }
  
  // Check if it's x/y/z format
  if ('x' in parsed && 'y' in parsed && 'z' in parsed) {
    return `X: ${parsed.x}, Y: ${parsed.y}, Z: ${parsed.z}`
  }
  
  return ''
}

export function isLatLngPosition(position: string | null | undefined): boolean {
  const parsed = parsePosition(position)
  return parsed !== null && 'lat' in parsed && 'lng' in parsed
}

export function isXYZPosition(position: string | null | undefined): boolean {
  const parsed = parsePosition(position)
  return parsed !== null && 'x' in parsed && 'y' in parsed && 'z' in parsed
}
