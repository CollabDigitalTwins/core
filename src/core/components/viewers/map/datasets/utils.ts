// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Dataset } from '../../../../types/datasetTypes'
import type * as React from "react";

export const handleFavouriteDataset = (
  dataset: Dataset,
  state: Dataset[],
  setter: React.Dispatch<React.SetStateAction<Dataset[]>>,
): React.MouseEventHandler<HTMLButtonElement> => {
  return (event) => {
    event.preventDefault()

    // If already in favourites, remove it
    if (state.some(item => item.name === dataset.name)) {
      setter(prev => prev.filter(item => item.name !== dataset.name))
    }
    else {
      // If not in favourites, add it
      setter(prev => [...prev, dataset])
    }
  }
}

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