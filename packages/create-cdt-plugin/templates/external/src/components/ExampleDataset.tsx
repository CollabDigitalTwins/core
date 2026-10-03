// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { DatasetRegistration } from '{{SURFACE_ENTRY}}'

// Listed under Organizational. `live: true` moves it to Live Data; omit `source` to draw it yourself.
export const dataset: Omit<DatasetRegistration, 'id'> = {
  name: '{{NAME}}',
  description: 'Two sample points. Replace getFeatures with your own source.',
  source: {
    type: 'geojson',
    getFeatures: async () => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-75.6972, 45.4215] },
          properties: { name: 'Ottawa' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-73.5674, 45.5019] },
          properties: { name: 'Montréal' },
        },
      ],
    }),
  },
}
