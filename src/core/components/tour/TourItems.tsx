// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import type { TourItem } from './tourTypes'

function ItemContent({ item }: { item: TourItem }) {
  const Icon = item.icon
  return (
    <>
      <span className="cdt-tour-item-icon" aria-hidden>{Icon && <Icon />}</span>
      <span className="cdt-tour-item-text">
        <strong>{item.term}</strong>
        <span>{item.description}</span>
      </span>
      {item.onSelect && <span className="cdt-tour-item-go" aria-hidden>›</span>}
    </>
  )
}

/** A step's items as icon rows; rows with `onSelect` are buttons. */
export function TourItems({ items }: { items: TourItem[] }) {
  return (
    <ul className="cdt-tour-items">
      {items.map(item => (
        <li key={item.id}>
          {item.onSelect
            ? <button type="button" className="cdt-tour-item" onClick={item.onSelect}><ItemContent item={item} /></button>
            : <div className="cdt-tour-item"><ItemContent item={item} /></div>}
        </li>
      ))}
    </ul>
  )
}
