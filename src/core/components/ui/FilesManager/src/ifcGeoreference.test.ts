// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { georeferenceFromEntities, parseStepEntities, readIfcGeoreference, splitStepArgs } from './ifcGeoreference'

const PETAWAWA_LINES = [
  "#1469612=IFCPROJECTEDCRS('EPSG:2951',$,$,$,$,$,$);",
  '#1469613=IFCMAPCONVERSION(#22,#1469612,242177.285039641,5085871.80253713,0.,0.798635510047293,0.601815023152048,$);',
].join('\n')

describe('splitStepArgs', () => {
  it('keeps quoted commas and nested lists together', () => {
    expect(splitStepArgs("'a,b',(1,2),$,#4")).toEqual(["'a,b'", '(1,2)', '$', '#4'])
  })
})

describe('georeferenceFromEntities', () => {
  it('reads the map conversion and its projected CRS', () => {
    expect(georeferenceFromEntities(parseStepEntities(PETAWAWA_LINES))).toMatchObject({
      fileProjectedCRS: 'EPSG:2951',
      mapConversionEastings: 242177.285039641,
      mapConversionNorthings: 5085871.80253713,
      mapConversionOrthogonalHeight: 0,
      mapConversionXAxisAbscissa: 0.798635510047293,
      mapConversionXAxisOrdinate: 0.601815023152048,
      mapConversionScale: null,
      georeferenceSource: 'ifc',
    })
  })

  it('normalizes a bare EPSG number', () => {
    const text = PETAWAWA_LINES.replace("'EPSG:2951'", "'2951'")
    expect(georeferenceFromEntities(parseStepEntities(text))?.fileProjectedCRS).toBe('EPSG:2951')
  })

  it('returns null for a model with no map conversion', () => {
    expect(georeferenceFromEntities(parseStepEntities("#1=IFCSITE('x',$);"))).toBeNull()
  })
})

describe('readIfcGeoreference', () => {
  it('scans a file blob', async () => {
    const blob = new Blob([`ISO-10303-21;\nDATA;\n${PETAWAWA_LINES}\nENDSEC;`])
    expect((await readIfcGeoreference(blob))?.fileProjectedCRS).toBe('EPSG:2951')
  })
})
