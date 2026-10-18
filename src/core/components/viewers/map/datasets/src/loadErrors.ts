// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export type LoadErrorReason = 'forbidden' | 'notFound' | 'unreachable' | 'notAMap' | 'tooLarge' | 'noData' | 'unknown'

export interface LoadErrorDescription {
  reason: LoadErrorReason
  permanent: boolean
}

const PERMANENT_REASONS = new Set<LoadErrorReason>(['forbidden', 'notFound', 'notAMap', 'tooLarge', 'noData'])

const MESSAGE_REASONS: Array<[RegExp, LoadErrorReason]> = [
  [/forbidden|unauthori[sz]ed|token required|invalid token/i, 'forbidden'],
  [/not found/i, 'notFound'],
  [/answered with an error instead of a map|lists no named layers|offers no web mercator|no layers that can be drawn/i, 'notAMap'],
  [/publish it as vector tiles|too large/i, 'tooLarge'],
  [/no features|is empty/i, 'noData'],
  [/failed to fetch|could not be reached|network ?error|took too long|timed? ?out|aborted/i, 'unreachable'],
]

const STATUS_IN_MESSAGE = /\bHTTP\s+(\d{3})\b|\((\d{3})\)/i

function messageOf(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return ''
}

function statusOf(error: unknown, message: string): number | undefined {
  const declared = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : NaN
  if (Number.isInteger(declared) && declared > 0) return declared
  const match = STATUS_IN_MESSAGE.exec(message)
  return match ? Number(match[1] ?? match[2]) : undefined
}

function reasonForStatus(status: number | undefined): LoadErrorReason | undefined {
  if (status === undefined) return undefined
  if (status === 401 || status === 403 || status === 498 || status === 499) return 'forbidden'
  if (status === 404 || status === 410) return 'notFound'
  if (status === 408 || status === 429 || status >= 500) return 'unreachable'
  return undefined
}

/** Why a dataset failed to load, in terms a user can act on, and whether retrying could ever help. */
export function describeLoadError(error: unknown): LoadErrorDescription {
  const message = messageOf(error)
  const reason = reasonForStatus(statusOf(error, message))
    ?? MESSAGE_REASONS.find(([pattern]) => pattern.test(message))?.[1]
    ?? 'unknown'
  return { reason, permanent: PERMANENT_REASONS.has(reason) }
}

/** The toast id for a dataset's notices, so a newer notice replaces the last one instead of stacking. */
export function datasetNoticeId(datasetName: string): string {
  return `viewport-dataset-${datasetName}`
}
