// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { SensorDataFormat } from '../../../types/dbTypes'

export interface SensorSeriesMeta {
  name?: string
  description?: string
  /** Short OGC observation type label, e.g. "OM_Measurement". */
  observationType?: string
  unit?: { name?: string; symbol?: string; definition?: string }
  observedProperty?: { name?: string; definition?: string; description?: string }
  phenomenonTime?: string
  resultTime?: string
  observationCount?: number
  sensor?: { name?: string; description?: string; metadata?: string }
  properties?: Record<string, unknown>
  selfLink?: string
}

export interface SensorSeries {
  points: { t: number; value: number }[]
  /** Unit symbol from an STA Datastream's unitOfMeasurement, when present. */
  unit?: string
  /** For category sensors: ordinal index -> original label, for the chart tooltip. */
  valueLabels?: Record<number, string>
  /** Full STA Datastream metadata, populated only for STA JSON (for the detail dialog). */
  meta?: SensorSeriesMeta
}

/**
 * ISO 8601 (or any Date-parseable) string -> epoch ms. Falls back for a bare
 * "H:MM:SS" clock (the synthetic CSV shape, no date) by assuming today's UTC date.
 * That fallback is a known limitation; STA/ISO inputs are exact.
 */
function toEpoch(value: string): number {
  const ms = Date.parse(value)
  if (!Number.isNaN(ms)) return ms
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!m) return NaN
  const now = new Date()
  return Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    Number(m[1]), Number(m[2]), Number(m[3] ?? 0),
  )
}

function coerceResult(
  result: unknown,
  labels: Record<number, string>,
  labelToIndex: Map<string, number>,
): number {
  if (typeof result === 'number') return result
  if (typeof result === 'boolean') return result ? 1 : 0
  if (typeof result === 'string') {
    const asNum = Number(result)
    if (result.trim() !== '' && !Number.isNaN(asNum)) return asNum
    let idx = labelToIndex.get(result)
    if (idx === undefined) {
      idx = labelToIndex.size
      labelToIndex.set(result, idx)
      labels[idx] = result
    }
    return idx
  }
  return NaN
}

function parseCsv(raw: string): SensorSeries {
  const points = raw
    .trim()
    .split('\n')
    .map(line => {
      const [time, valueStr] = line.split(',')
      return { t: toEpoch((time ?? '').trim()), value: parseFloat((valueStr ?? '').trim()) }
    })
    .filter(p => !Number.isNaN(p.value) && !Number.isNaN(p.t))
  return { points }
}

/** Short label from an OGC observationType IRI (".../OM_Measurement" -> "OM_Measurement"). */
function shortObservationType(iri: unknown): string | undefined {
  if (typeof iri !== 'string' || !iri) return undefined
  const tail = iri.split('/').pop()
  return tail || iri
}

function extractStaMeta(doc: any): SensorSeriesMeta {
  const uom = doc.unitOfMeasurement
  const op = doc.ObservedProperty
  const sensor = doc.Sensor
  return {
    name: doc.name,
    description: doc.description,
    observationType: shortObservationType(doc.observationType),
    unit: uom ? { name: uom.name, symbol: uom.symbol, definition: uom.definition } : undefined,
    observedProperty: op ? { name: op.name, definition: op.definition, description: op.description } : undefined,
    phenomenonTime: typeof doc.phenomenonTime === 'string' ? doc.phenomenonTime : undefined,
    resultTime: typeof doc.resultTime === 'string' ? doc.resultTime : undefined,
    observationCount: typeof doc['Observations@iot.count'] === 'number' ? doc['Observations@iot.count'] : undefined,
    sensor: sensor ? { name: sensor.name, description: sensor.description, metadata: sensor.metadata } : undefined,
    properties: doc.properties && typeof doc.properties === 'object' ? doc.properties : undefined,
    selfLink: typeof doc['@iot.selfLink'] === 'string' ? doc['@iot.selfLink'] : undefined,
  }
}

// JSON shapes are external (OGC SensorThings); typed as `any` since we sniff by shape.
function parseJson(raw: string): SensorSeries {
  let doc: any
  try {
    doc = JSON.parse(raw)
  } catch {
    return { points: [] }
  }

  const labels: Record<number, string> = {}
  const labelToIndex = new Map<string, number>()
  const withLabels = (
    points: SensorSeries['points'],
    unit?: string,
    meta?: SensorSeriesMeta,
  ): SensorSeries => ({
    points,
    unit,
    valueLabels: Object.keys(labels).length ? labels : undefined,
    meta,
  })

  // dataArray form: { components, dataArray: [[phenomenonTime, result], ...] }
  if (doc && Array.isArray(doc.dataArray)) {
    const comps: string[] = Array.isArray(doc.components) ? doc.components : ['phenomenonTime', 'result']
    const tIdx = comps.indexOf('phenomenonTime') === -1 ? 0 : comps.indexOf('phenomenonTime')
    const rIdx = comps.indexOf('result') === -1 ? 1 : comps.indexOf('result')
    const points = doc.dataArray
      .map((row: unknown[]) => ({
        t: toEpoch(String(row[tIdx])),
        value: coerceResult(row[rIdx], labels, labelToIndex),
      }))
      .filter((p: { t: number; value: number }) => !Number.isNaN(p.value) && !Number.isNaN(p.t))
    return withLabels(points)
  }

  // STA Datastream: { unitOfMeasurement, Observations: [{ phenomenonTime, result }] }
  if (doc && Array.isArray(doc.Observations)) {
    const unit: string | undefined = doc.unitOfMeasurement?.symbol ?? undefined
    const points = doc.Observations
      .map((obs: any) => ({
        t: toEpoch(String(obs.phenomenonTime)),
        value: coerceResult(obs.result, labels, labelToIndex),
      }))
      .filter((p: { t: number; value: number }) => !Number.isNaN(p.value) && !Number.isNaN(p.t))
    return withLabels(points, unit, extractStaMeta(doc))
  }

  // Single reading. ?format=reading emits { type, unit, timestamp, value, ... };
  // an STA-style single reading would use { phenomenonTime, result }. Handle both.
  const single = doc?.result ?? doc?.value
  if (single !== undefined) {
    const value = coerceResult(single, labels, labelToIndex)
    if (Number.isNaN(value)) return { points: [] }
    const iso = doc.phenomenonTime ?? doc.timestamp
    const t = iso ? toEpoch(String(iso)) : NaN
    const unit: string | undefined = doc.unit ?? doc.unitOfMeasurement?.symbol ?? undefined
    if (Number.isNaN(t)) return { points: [] }
    return withLabels([{ t, value }], unit)
  }

  return { points: [] }
}

/** Parse a sensor data payload into a chart-ready series. CSV is header-less time,value; JSON auto-detects STA / dataArray / single reading. */
export function parseSensorSeries(
  raw: string,
  dataFormat: SensorDataFormat | `${SensorDataFormat}`,
): SensorSeries {
  if (dataFormat === SensorDataFormat.Csv) return parseCsv(raw)
  return parseJson(raw)
}
