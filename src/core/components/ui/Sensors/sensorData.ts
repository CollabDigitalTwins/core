// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { SensorDataFormat } from '../../../types/dbTypes'

export interface SensorSeries {
  points: { time: string; value: number }[]
  /** Unit symbol from an STA Datastream's unitOfMeasurement, when present. */
  unit?: string
  /** For category sensors: ordinal index -> original label, for the chart tooltip. */
  valueLabels?: Record<number, string>
}

/** ISO 8601 -> "H:MM:SS" UTC, matching the synthetic API's CSV time column. */
function isoToClock(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${d.getUTCHours()}:${mm}:${ss}`
}

/**
 * Coerce an OGC result to a chart number. number -> as-is; boolean -> 0/1;
 * numeric string -> its number; category string -> stable first-seen ordinal
 * (recorded in `labels`). Anything else -> NaN (dropped by callers).
 */
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
      return { time: (time ?? '').trim(), value: parseFloat((valueStr ?? '').trim()) }
    })
    .filter(p => !Number.isNaN(p.value))
  return { points }
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
  const withLabels = (points: SensorSeries['points'], unit?: string): SensorSeries => ({
    points,
    unit,
    valueLabels: Object.keys(labels).length ? labels : undefined,
  })

  // dataArray form: { components, dataArray: [[phenomenonTime, result], ...] }
  if (doc && Array.isArray(doc.dataArray)) {
    const comps: string[] = Array.isArray(doc.components) ? doc.components : ['phenomenonTime', 'result']
    const tIdx = comps.indexOf('phenomenonTime') === -1 ? 0 : comps.indexOf('phenomenonTime')
    const rIdx = comps.indexOf('result') === -1 ? 1 : comps.indexOf('result')
    const points = doc.dataArray
      .map((row: unknown[]) => ({
        time: isoToClock(String(row[tIdx])),
        value: coerceResult(row[rIdx], labels, labelToIndex),
      }))
      .filter((p: { value: number }) => !Number.isNaN(p.value))
    return withLabels(points)
  }

  // STA Datastream: { unitOfMeasurement, Observations: [{ phenomenonTime, result }] }
  if (doc && Array.isArray(doc.Observations)) {
    const unit: string | undefined = doc.unitOfMeasurement?.symbol ?? undefined
    const points = doc.Observations
      .map((obs: any) => ({
        time: isoToClock(String(obs.phenomenonTime)),
        value: coerceResult(obs.result, labels, labelToIndex),
      }))
      .filter((p: { value: number }) => !Number.isNaN(p.value))
    return withLabels(points, unit)
  }

  // Single reading. ?format=reading emits { type, unit, timestamp, value, ... };
  // an STA-style single reading would use { phenomenonTime, result }. Handle both.
  const single = doc?.result ?? doc?.value
  if (single !== undefined) {
    const value = coerceResult(single, labels, labelToIndex)
    if (Number.isNaN(value)) return { points: [] }
    const iso = doc.phenomenonTime ?? doc.timestamp
    const time = iso ? isoToClock(String(iso)) : ''
    const unit: string | undefined = doc.unit ?? doc.unitOfMeasurement?.symbol ?? undefined
    return withLabels([{ time, value }], unit)
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
