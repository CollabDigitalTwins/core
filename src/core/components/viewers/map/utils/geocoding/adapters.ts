import { Feature } from 'geojson'

// Map OSM place categories onto Pelias-style layer names (best effort, display-only).
export const osmCategoryToLayer = (category?: string): string => {
  switch (category) {
    case 'house':
    case 'building': return 'address'
    case 'street':
    case 'road': return 'street'
    case 'city':
    case 'town':
    case 'village':
    case 'hamlet':
    case 'locality': return 'locality'
    case 'district':
    case 'suburb':
    case 'neighbourhood': return 'neighbourhood'
    case 'county': return 'county'
    case 'state':
    case 'region': return 'region'
    case 'country': return 'country'
    default: return category || 'venue'
  }
}

// Normalize a Photon autocomplete feature into the Pelias feature shape.
export const normalizePhotonFeature = (feature: any): Feature => {
  const p = feature.properties || {}
  const region = p.state || ''
  const country = p.country || ''
  const country_a = (p.countrycode || '').toUpperCase()
  const locality = p.city || p.town || p.village || p.district || ''
  const name = p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || locality
  const label = [name, locality && locality !== name ? locality : null, region, country]
    .filter(Boolean)
    .join(', ')

  // Photon `extent` is [west, north, east, south]; Pelias bbox is [west, south, east, north].
  const bbox: [number, number, number, number] | undefined = Array.isArray(p.extent) && p.extent.length === 4
    ? [p.extent[0], p.extent[3], p.extent[2], p.extent[1]]
    : undefined

  return {
    type: 'Feature',
    geometry: feature.geometry,
    ...(bbox ? { bbox } : {}),
    properties: {
      name,
      label,
      housenumber: p.housenumber,
      street: p.street,
      locality,
      neighbourhood: p.district,
      county: p.county,
      region,
      region_a: '', // Photon does not expose ISO subdivision codes (ON, BC, ...)
      country,
      country_a,
      postalcode: p.postcode,
      gid: p.osm_id != null ? `osm:${p.osm_type}:${p.osm_id}` : undefined,
      layer: osmCategoryToLayer(p.type),
    },
  } as Feature
}

// Normalize a Nominatim reverse result into the Pelias feature shape.
export const normalizeNominatimResult = (data: any): Feature => {
  const a = data.address || {}
  // ISO3166-2-lvl4 looks like "CA-ON"; the suffix is the Pelias region_a abbreviation.
  const region_a = (a['ISO3166-2-lvl4'] || '').split('-')[1] || ''
  const locality = a.city || a.town || a.village || a.municipality || a.suburb || a.neighbourhood || a.county || ''
  const name = a.road ? [a.house_number, a.road].filter(Boolean).join(' ') : (locality || (data.display_name || '').split(',')[0])

  // Nominatim boundingbox is [minlat, maxlat, minlon, maxlon]; Pelias bbox is [west, south, east, north].
  const bb = data.boundingbox
  const bbox: [number, number, number, number] | undefined = Array.isArray(bb) && bb.length === 4
    ? [Number(bb[2]), Number(bb[0]), Number(bb[3]), Number(bb[1])]
    : undefined

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [Number(data.lon), Number(data.lat)] },
    ...(bbox ? { bbox } : {}),
    properties: {
      name,
      label: data.display_name || '',
      housenumber: a.house_number,
      street: a.road,
      locality,
      neighbourhood: a.neighbourhood || a.suburb,
      county: a.county,
      region: a.state,
      region_a,
      country: a.country,
      country_a: (a.country_code || '').toUpperCase(),
      postalcode: a.postcode,
      gid: data.osm_id != null ? `osm:${data.osm_type}:${data.osm_id}` : undefined,
      layer: osmCategoryToLayer(data.addresstype || data.type),
    },
  } as Feature
}
