// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { normaliseColour } from '../../../../../utils/colourUtils'
import { toDisplayString } from '../../../../../utils/utils'
import { isBlank, parseBooleanValue, parseNumericValue } from '../../../../../utils/valueParsing'
import { evenlySpaced } from '../../utils/classBreaks'

import type { DatasetField, FieldProfile, FieldType } from '../../../../../types/datasetTypes'
import type { Feature } from 'geojson'

type Properties = Record<string, unknown>

const SAMPLE_SIZE = 2_000
const NUMERIC_SAMPLE_SIZE = 1_000
const MAX_DISTINCT_VALUES = 50
const MAX_TRACKED_VALUES = 1_000
const TYPED_SHARE = 0.95
const COLOUR_SHARE = 0.9

const ID_NAME = /^(object_?id|fid|ogc_fid|global_?id|guid|uuid|_?id|gid|oid|rowid|_rowid)$/i
const ID_AFFIX = /(^id_|_id$)/i
const COORDINATE_NAME = /^(lat|lng|lon|long|latitude|longitude|x|y|z|coordinates?|easting|northing|shape_(area|length|leng)|st_(area|length)\(.*\))$/i
const UUID = /^[{(]?[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}[)}]?$/i
const DATE_LIKE = /^\d{4}-\d{2}-\d{2}([T ][\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$|^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/
const COLOUR_NAME = /^(marker[-_]?colou?r|fill([-_]?colou?r)?|stroke([-_]?colou?r)?|colou?r([-_]?(hex|code|rgb))?|couleur|hex([-_]?colou?r)?|rgb)$/i

export function isIdName(name: string): boolean {
  return ID_NAME.test(name) || ID_AFFIX.test(name)
}

/** Ids and coordinates carry no meaning worth colouring, so they are left out of the style pickers. */
export function isStylableField(profile: FieldProfile): boolean {
  return !profile.isId && !COORDINATE_NAME.test(profile.name) && profile.type !== 'object' && profile.distinctValues.length > 0
}

function fieldNames(sample: Properties[], declared: DatasetField[]): string[] {
  const names = new Set(declared.map(field => field.name))
  for (const properties of sample) {
    for (const key of Object.keys(properties)) names.add(key)
  }
  return [...names]
}

function isSequentialIntegers(values: number[]): boolean {
  if (values.length < 20 || !values.every(Number.isInteger)) return false
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.every((value, i) => i === 0 || value - sorted[i - 1] === 1)
}

function topValues(counts: Map<string, number>): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_DISTINCT_VALUES)
    .map(([value]) => value)
}

function inferType(values: unknown[], numbers: number[], booleans: number, distinct: number, hint?: FieldType): FieldType {
  if (values.length === 0) return hint ?? 'string'
  if (values.some(value => typeof value === 'object')) return 'object'
  const share = (count: number) => count / values.length
  if (share(booleans) === 1 && distinct <= 2) return 'boolean'
  if (share(numbers.length) >= TYPED_SHARE) return hint === 'datetime' ? 'datetime' : 'number'
  const dates = values.filter(value => typeof value === 'string' && DATE_LIKE.test(value.trim()))
  if (share(dates.length) >= TYPED_SHARE) return 'datetime'
  return 'string'
}

function profileField(name: string, sample: Properties[], declared?: DatasetField): FieldProfile {
  const values: unknown[] = []
  const numbers: number[] = []
  const counts = new Map<string, number>()
  let booleans = 0
  for (const properties of sample) {
    const value = properties[name]
    if (isBlank(value)) continue
    values.push(value)
    const numeric = parseNumericValue(value)
    if (numeric !== null) numbers.push(numeric)
    if (parseBooleanValue(value) !== null) booleans++
    const key = toDisplayString(value)
    if (counts.has(key) || counts.size < MAX_TRACKED_VALUES) counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const type = inferType(values, numbers, booleans, counts.size, declared?.type)
  const allUnique = counts.size === values.length
  const looksLikeUuid = allUnique && values.length > 0 && values.every(value => UUID.test(toDisplayString(value)))
  const isNumeric = type === 'number' || type === 'datetime'

  return {
    name,
    type,
    alias: declared?.alias,
    description: declared?.description,
    isId: isIdName(name) || looksLikeUuid || (type === 'number' && allUnique && isSequentialIntegers(numbers)),
    nullCount: sample.length - values.length,
    distinctValues: topValues(counts),
    ...(isNumeric && numbers.length > 0 && {
      numericSample: evenlySpaced(numbers, NUMERIC_SAMPLE_SIZE),
      min: Math.min(...numbers),
      max: Math.max(...numbers),
    }),
  }
}

function findColourProperty(sample: Properties[], profiles: FieldProfile[]): string | undefined {
  return profiles
    .filter(profile => COLOUR_NAME.test(profile.name))
    .find(profile => {
      const values = sample.map(properties => properties[profile.name]).filter(value => !isBlank(value))
      const colours = values.filter(value => normaliseColour(value) !== null)
      return values.length > 0 && colours.length / values.length >= COLOUR_SHARE
    })?.name
}

/** Profiles every sampled property, with `declared` provider fields only as hints, and names the per-feature colour property if any. */
export function profileFields(features: Feature[], declared: DatasetField[] = []): { fields: FieldProfile[]; colourProperty?: string } {
  const sample = evenlySpaced(features, SAMPLE_SIZE).map(feature => (feature.properties ?? {}) as Properties)
  const declaredByName = new Map(declared.map(field => [field.name, field]))
  const fields = fieldNames(sample, declared).map(name => profileField(name, sample, declaredByName.get(name)))
  return { fields, colourProperty: findColourProperty(sample, fields) }
}

/** A rewriter of values to their profiled type, so map expressions can compare them directly; `extras` are merged in last. */
export function propertyNormaliser(profiles: FieldProfile[], colourProperty?: string): (properties: Properties, extras?: Properties) => Properties {
  const typed = profiles.filter(profile => profile.type === 'number' || profile.type === 'boolean')
  return (properties, extras) => {
    const normalised = { ...properties }
    for (const profile of typed) {
      const value = normalised[profile.name]
      if (isBlank(value)) continue
      normalised[profile.name] = (profile.type === 'number' ? parseNumericValue(value) : parseBooleanValue(value)) ?? value
    }
    if (colourProperty) normalised[colourProperty] = normaliseColour(normalised[colourProperty]) ?? normalised[colourProperty]
    return extras ? Object.assign(normalised, extras) : normalised
  }
}
