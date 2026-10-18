// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { describeLoadError } from './loadErrors'

describe('describeLoadError', () => {
  it.each([
    ['AJAXError: Forbidden (403): https://maps.example.org/arcgis/rest/services/Parks/MapServer/tile/3/2/1', 'forbidden'],
    ['The map service refused map requests: HTTP 401', 'forbidden'],
    ['ArcGIS query failed: Token Required', 'forbidden'],
    ['ArcGIS query failed: HTTP 499', 'forbidden'],
    ['Unauthorized', 'forbidden'],
    ['The map service refused map requests: HTTP 404', 'notFound'],
    ['CKAN datastore_search failed: HTTP 410', 'notFound'],
    ['AJAXError: Not Found (404): https://tiles.example.org/0/0/0.pbf', 'notFound'],
    ['The map service answered with an error instead of a map', 'notAMap'],
    ['This WMS service lists no named layers', 'notAMap'],
    ['This WMTS service offers no Web Mercator layer', 'notAMap'],
    ['This service has no layers that can be drawn', 'notAMap'],
    ['This file is 120.0 MB. Publish it as vector tiles to view it.', 'tooLarge'],
    ['The dataset has no features', 'noData'],
  ])('treats "%s" as a permanent %s', (message, reason) => {
    expect(describeLoadError(new Error(message))).toEqual({ reason, permanent: true })
  })

  it.each([
    ['TypeError: Failed to fetch', 'unreachable'],
    ['The map service could not be reached', 'unreachable'],
    ['The request took too long', 'unreachable'],
    ['ArcGIS query failed: HTTP 503', 'unreachable'],
    ['AJAXError: Bad Gateway (502): https://maps.example.org/wms', 'unreachable'],
    ['Something odd happened', 'unknown'],
  ])('treats "%s" as a transient %s', (message, reason) => {
    expect(describeLoadError(new Error(message))).toEqual({ reason, permanent: false })
  })

  it('reads an abort, a status on the error and a bare string', () => {
    expect(describeLoadError(new DOMException('The operation was aborted.', 'AbortError'))).toEqual({ reason: 'unreachable', permanent: false })
    expect(describeLoadError(Object.assign(new Error('AJAXError'), { status: 403 }))).toEqual({ reason: 'forbidden', permanent: true })
    expect(describeLoadError('HTTP 404')).toEqual({ reason: 'notFound', permanent: true })
    expect(describeLoadError(undefined)).toEqual({ reason: 'unknown', permanent: false })
  })

  it('does not mistake a number inside a URL for a status', () => {
    expect(describeLoadError(new Error('Something odd at https://x.org/layers/404/tiles'))).toEqual({ reason: 'unknown', permanent: false })
  })
})
