// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { GeoreferenceSource } from '../../../../types/dbTypes'

import type { GeoreferenceColumns } from '../../../../utils/geo/georeference'

const CHUNK_BYTES = 8 * 1024 * 1024
const CHUNK_OVERLAP_BYTES = 64 * 1024
const ENTITY = /#(\d+)\s*=\s*(IFCMAPCONVERSION|IFCPROJECTEDCRS)\s*\(([^;]*)\)\s*;/gi

interface StepEntity {
  type: string
  args: string[]
}

/** Splits a STEP argument list at top-level commas, leaving quoted strings and nested lists intact. */
export function splitStepArgs(list: string): string[] {
  const args: string[] = []
  let depth = 0
  let inString = false
  let current = ''
  for (const char of list) {
    if (char === "'") inString = !inString
    else if (!inString && char === '(') depth++
    else if (!inString && char === ')') depth--
    if (char === ',' && depth === 0 && !inString) {
      args.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  args.push(current.trim())
  return args
}

const stepNumber = (arg?: string): number | null => {
  if (!arg || arg === '$') return null
  const value = Number(arg)
  return Number.isFinite(value) ? value : null
}
const stepString = (arg?: string): string | null => (arg?.startsWith("'") ? arg.slice(1, -1) : null)
const stepRef = (arg?: string): string | null => (arg?.startsWith('#') ? arg.slice(1) : null)

// EPSG codes arrive as 'EPSG:2951', 'epsg:2951' or a bare '2951'.
function normalizeCrsName(name: string | null): string | null {
  const code = name?.match(/^(?:EPSG:)?\s*(\d+)$/i)?.[1]
  return code ? `EPSG:${code}` : name
}

export function georeferenceFromEntities(entities: Map<string, StepEntity>): GeoreferenceColumns | null {
  const conversion = [...entities.values()].find(entity => entity.type === 'IFCMAPCONVERSION')
  if (!conversion) return null
  const [, targetCrs, eastings, northings, height, abscissa, ordinate, scale] = conversion.args
  const crsRef = stepRef(targetCrs)
  const crs = crsRef ? entities.get(crsRef) : undefined
  const crsName = normalizeCrsName(stepString(crs?.args[0]))
  if (!crsName || stepNumber(eastings) == null || stepNumber(northings) == null) return null

  return {
    fileProjectedCRS: crsName,
    mapConversionEastings: stepNumber(eastings),
    mapConversionNorthings: stepNumber(northings),
    mapConversionOrthogonalHeight: stepNumber(height),
    mapConversionXAxisAbscissa: stepNumber(abscissa),
    mapConversionXAxisOrdinate: stepNumber(ordinate),
    mapConversionScale: stepNumber(scale),
    georeferenceSource: GeoreferenceSource.ifc,
  }
}

export function parseStepEntities(text: string, into = new Map<string, StepEntity>()): Map<string, StepEntity> {
  for (const [, id, type, args] of text.matchAll(ENTITY)) {
    into.set(id, { type: type.toUpperCase(), args: splitStepArgs(args) })
  }
  return into
}

/** Reads IfcMapConversion and its IfcProjectedCRS by scanning the STEP text in chunks, so a large IFC never becomes one string. */
export async function readIfcGeoreference(file: Blob): Promise<GeoreferenceColumns | null> {
  const decoder = new TextDecoder()
  const entities = new Map<string, StepEntity>()
  for (let start = 0; start < file.size; start += CHUNK_BYTES) {
    const chunk = file.slice(start, Math.min(file.size, start + CHUNK_BYTES + CHUNK_OVERLAP_BYTES))
    parseStepEntities(decoder.decode(await chunk.arrayBuffer()), entities)
  }
  return georeferenceFromEntities(entities)
}
