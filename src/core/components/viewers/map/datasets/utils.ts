// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Dataset } from '../../../../types/datasetTypes'

// Simple name formatting function
export function formatName(name: string): string {
  if (!name) return ''

  // If already a title (contains spaces), just capitalize first letter
  if (name.includes(' ')) {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  // Convert slug to title
  return name
    .replaceAll(/[__-]+/g, ' ')
    .replaceAll(/[_-]+/g, ' ')
    .replaceAll(/\b\w/g, char => char.toUpperCase())
    .trim()
}

// Format date to YYYY-MM-DD
export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toISOString().split('T')[0]
  }
  catch {
    return dateString
  }
}

export function stripHtml(html: string): string {
  return html?.replace(/<[^>]*>/g, '').trim() || ''
}
type Ordered = Pick<Dataset, 'name' | 'order'>

/** Applied datasets top layer first; one without an `order` is numbered from its list position, first on top. */
export function sortByOrder<T extends Ordered>(datasets: T[]): Array<T & { order: number }> {
  return datasets
    .map((dataset, index) => ({ ...dataset, order: dataset.order ?? datasets.length - 1 - index }))
    .sort((a, b) => b.order - a.order)
}

/** The display list after dragging `activeId` onto `overId`, renumbered top-down; undefined when nothing moved. */
export function reorderedDatasets<T extends Ordered>(datasets: T[], activeId: string, overId: string): T[] | undefined {
  const from = datasets.findIndex(dataset => dataset.name === activeId)
  const to = datasets.findIndex(dataset => dataset.name === overId)
  if (from < 0 || to < 0 || from === to) return undefined
  const moved = [...datasets]
  moved.splice(to, 0, ...moved.splice(from, 1))
  return moved.map((dataset, index) => ({ ...dataset, order: moved.length - 1 - index }))
}
