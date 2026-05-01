export async function getOsmId(
  latitude: number,
  longitude: number,
): Promise<number | null> {
  const nominatimApiUrl = 'https://nominatim.openstreetmap.org/reverse'

  const url = new URL(nominatimApiUrl)
  url.searchParams.append('format', 'json')
  url.searchParams.append('lat', latitude.toString())
  url.searchParams.append('lon', longitude.toString())

  // Set User-Agent and Referer headers
  const headers = {
    'User-Agent': 'CDT-NA/1.0 (narellano@cims.carleton.ca)',
  }

  console.log(url.toString())

  // Wait at least 1000ms between requests
  await new Promise(resolve => setTimeout(resolve, 2000))

  try {
    const response = await fetch(url.toString(), { headers })

    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status}`)
      return null
    }

    const data = await response.json()
    console.log('Nominatim response:', data) // Debug: see full response

    if (data && (typeof data.osm_id === 'string' || typeof data.osm_id === 'number')) {
      const osmIdNum = Number(data.osm_id)
      if (isNaN(osmIdNum)) {
        console.warn('OSM ID is not a valid number:', data.osm_id)
        return null
      }
      else {
        return osmIdNum
      }
    }
    else {
      console.warn('No OSM ID found for the given coordinates in the response:', data)
      return null
    }
  }
  catch (error) {
    console.error('Error fetching OSM ID:', error)
    return null
  }
}

// Attribution: Data © OpenStreetMap contributors, ODbL license.
