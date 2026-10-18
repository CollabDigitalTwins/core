// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { ClassificationMethod } from '../../../../types/datasetTypes'

const JENKS_MAX_VALUES = 1_000

/** At most `size` items picked at an even stride, keeping their order. */
export function evenlySpaced<T>(items: T[], size: number): T[] {
  if (items.length <= size) return items
  const step = items.length / size
  return Array.from({ length: size }, (_, i) => items[Math.floor(i * step)])
}

function equalInterval(sorted: number[], classes: number): number[] {
  const min = sorted[0]
  const width = (sorted[sorted.length - 1] - min) / classes
  return Array.from({ length: classes - 1 }, (_, i) => min + width * (i + 1))
}

function quantile(sorted: number[], classes: number): number[] {
  return Array.from({ length: classes - 1 }, (_, i) => sorted[Math.floor(((i + 1) * sorted.length) / classes)])
}

function jenks(sorted: number[], classes: number): number[] {
  const data = evenlySpaced(sorted, JENKS_MAX_VALUES)
  const n = data.length
  const lowerClassLimits = Array.from({ length: n + 1 }, () => new Array<number>(classes + 1).fill(0))
  const variance = Array.from({ length: n + 1 }, () => new Array<number>(classes + 1).fill(Infinity))
  for (let k = 1; k <= classes; k++) {
    lowerClassLimits[1][k] = 1
    variance[1][k] = 0
  }
  for (let end = 2; end <= n; end++) {
    let sum = 0
    let sumSquares = 0
    let classVariance = 0
    for (let size = 1; size <= end; size++) {
      const start = end - size + 1
      const value = data[start - 1]
      sum += value
      sumSquares += value * value
      classVariance = sumSquares - (sum * sum) / size
      if (start === 1) continue
      for (let k = 2; k <= classes; k++) {
        const candidate = classVariance + variance[start - 1][k - 1]
        if (variance[end][k] >= candidate) {
          lowerClassLimits[end][k] = start
          variance[end][k] = candidate
        }
      }
    }
    lowerClassLimits[end][1] = 1
    variance[end][1] = classVariance
  }
  const thresholds: number[] = []
  let end = n
  for (let k = classes; k >= 2; k--) {
    const start = lowerClassLimits[end][k]
    thresholds.unshift(data[start - 1])
    end = start - 1
  }
  return thresholds
}

const METHODS: Record<ClassificationMethod, (sorted: number[], classes: number) => number[]> = { equalInterval, quantile, jenks }

/** Interior class thresholds, ascending and unique, ready for a MapLibre `step` expression. */
export function classBreaks(values: number[], classes: number, method: ClassificationMethod): number[] {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length < 2 || classes < 2 || sorted[0] === sorted[sorted.length - 1]) return []
  const thresholds = METHODS[method](sorted, Math.min(classes, sorted.length))
  return [...new Set(thresholds)].filter(t => t > sorted[0] && t <= sorted[sorted.length - 1])
}
