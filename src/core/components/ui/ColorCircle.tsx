// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import React from 'react'

interface ColorCircleProps {
  color: string // default to '#73cee2'
  size?: number // default to 16
}

export default function ColorCircle({ color = '#73cee2', size = 16 }: ColorCircleProps) {
  return (
    <span
      className="inline-block rounded-full mr-2 align-middle"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
        backgroundColor: color,
        display: 'inline-block',
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
      }}
    />
  )
}
