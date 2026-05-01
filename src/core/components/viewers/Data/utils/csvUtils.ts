import type { Building } from '../../../../types/dbTypes'

/**
 * Generate a CSV schema file with headers and example row
 */
export function generateBuildingSchemaCSV(schemaTemplate: Record<string, string>, fieldNames: string[]): string {
  const headers = fieldNames.join(',')
  
  const example = fieldNames.map(field => {
    const value = schemaTemplate[field]
    // Wrap in quotes if it contains comma or quotes
    if (value && (value.includes(',') || value.includes('"'))) {
      return `"${value.replaceAll('"', '""')}"`
    }
    return value || ''
  }).join(',')
  
  return `${headers}\n${example}`
}

/**
 * Export buildings to CSV format
 */
export function exportBuildingsToCSV(buildings: Building[]): string {
  if (!buildings || buildings.length === 0) {
    throw new Error('No buildings to export')
  }

  // Get all field names from the first building
  const buildingFields = Object.keys(buildings[0])
  
  // Create headers
  const headers = buildingFields.join(',')

  // Extract values for each building
  const rows = buildings.map(building => {
    return buildingFields.map(field => {
      const value = building[field as keyof Building]
      
      // Handle different data types
      if (value == null) return ''
      if (Array.isArray(value)) return `"${value.join(';')}"`
      if (typeof value === 'string') return `"${value.replaceAll('"', '""')}"`
      if (typeof value === 'object') return `"${JSON.stringify(value).replaceAll('"', '""')}"`
      return value
    }).join(',')
  }).join('\n')

  // Combine headers and data
  return `${headers}\n${rows}`
}

/**
 * Parse CSV text into building objects
 */
export function parseCSVToBuildings(csvText: string): any[] {
  // Parse CSV manually
  const lines = csvText.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    throw new Error('CSV file is empty')
  }

  // Extract headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  
  // Check if buildingAddress exists
  if (!headers.includes('buildingAddress')) {
    throw new Error('CSV must include buildingAddress column')
  }

  // Parse each row (skip header)
  const buildings = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    // Simple CSV parsing
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    
    const building: any = {}
    headers.forEach((header, index) => {
      const value = values[index]
      if (value) {
        building[header] = value
      }
    })

    // Only validate that buildingAddress exists
    if (!building.buildingAddress || !building.buildingAddress.trim()) {
      console.warn(`Skipping row ${i + 1}: missing buildingAddress`)
      continue
    }

    buildings.push(building)
  }

  if (buildings.length === 0) {
    throw new Error('No valid buildings found in CSV')
  }

  return buildings
}

/**
 * Process building imports - create new or update existing
 */
export async function processBuildingImports(
  buildingsToImport: any[],
  existingBuildings: Building[] | undefined,
  createBuilding: (params: { buildingData: any; organizationId: string }) => Promise<any>,
  updateBuilding: (params: { buildingId: string; buildingData: any }) => Promise<any>,
  organizationId: string
): Promise<{ created: number; updated: number; failed: number }> {
  let created = 0
  let updated = 0
  let failed = 0

  for (const buildingData of buildingsToImport) {
    try {
      // Check if building already exists by address
      const existingBuilding = existingBuildings?.find(
        b => b.buildingAddress?.toLowerCase().trim() === buildingData.buildingAddress?.toLowerCase().trim()
      )

      if (existingBuilding) {
        // Update existing building
        await updateBuilding({
          buildingId: existingBuilding.id.toString(),
          buildingData,
        })
        updated++
      } else {
        // Create new building
        await createBuilding({
          buildingData,
          organizationId,
        })
        created++
      }
    } catch (error) {
      console.error('Error processing building:', buildingData.buildingAddress, error)
      failed++
    }
  }

  return { created, updated, failed }
}

/**
 * Download a CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

/**
 * Generate timestamped filename for exports
 */
export function generateTimestampedFilename(prefix: string, extension: string = 'csv'): string {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-').slice(0, 19)
  return `${prefix}_${timestamp}.${extension}`
}