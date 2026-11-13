// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import proj4 from 'proj4'

export const WGS84 = 'EPSG:4326'

export interface CrsOption {
  code: string
  label: string
}

const UTM_ZONES = Array.from({ length: 16 }, (_, index) => index + 7)
const CSRS_UTM_CODES: Record<number, number> = {
  7: 3154, 8: 3155, 9: 3156, 10: 3157, 11: 2955, 12: 2956, 13: 2957, 14: 3158,
  15: 3159, 16: 3160, 17: 2958, 18: 2959, 19: 2960, 20: 2961, 21: 2962,
}
const CSRS_MTM_CODES: Record<number, number> = { 3: 2945, 4: 2946, 5: 2947, 6: 2948, 7: 2949, 8: 2950, 9: 2951, 10: 2952 }

const CSRS_ELLIPSOID = '+ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
const mtmCentralMeridian = (zone: number) => -(49.5 + 3 * zone)

function buildDefinitions(): Array<CrsOption & { def: string }> {
  const nad83Utm = UTM_ZONES.map(zone => ({
    code: `EPSG:${26900 + zone}`,
    label: `NAD83 / UTM zone ${zone}N`,
    def: `+proj=utm +zone=${zone} +datum=NAD83 +units=m +no_defs`,
  }))
  const csrsUtm = Object.entries(CSRS_UTM_CODES).map(([zone, epsg]) => ({
    code: `EPSG:${epsg}`,
    label: `NAD83(CSRS) / UTM zone ${zone}N`,
    def: `+proj=utm +zone=${zone} ${CSRS_ELLIPSOID}`,
  }))
  const csrsMtm = Object.entries(CSRS_MTM_CODES).map(([zone, epsg]) => ({
    code: `EPSG:${epsg}`,
    label: `NAD83(CSRS) / MTM zone ${zone}`,
    def: `+proj=tmerc +lat_0=0 +lon_0=${mtmCentralMeridian(Number(zone))} +k=0.9999 +x_0=304800 +y_0=0 ${CSRS_ELLIPSOID}`,
  }))
  return [...nad83Utm, ...csrsUtm, ...csrsMtm]
}

const BUNDLED = buildDefinitions()
let registered = false

/** Registers the Canadian projected systems proj4 does not ship, so their EPSG codes resolve. */
export function registerBundledCrs(): void {
  if (registered) return
  for (const { code, def } of BUNDLED) proj4.defs(code, def)
  registered = true
}

const WGS84_UTM_OPTIONS: CrsOption[] = UTM_ZONES.map(zone => ({ code: `EPSG:${32600 + zone}`, label: `WGS 84 / UTM zone ${zone}N` }))

export const CRS_OPTIONS: CrsOption[] = [
  { code: WGS84, label: 'WGS 84 (latitude / longitude)' },
  ...BUNDLED.map(({ code, label }) => ({ code, label })),
  ...WGS84_UTM_OPTIONS,
]
