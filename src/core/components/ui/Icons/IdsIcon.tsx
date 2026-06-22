// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import React from 'react'

export interface IdsIconProps {
  className?: string
  size?: number | string
  monochromatic?: boolean
}

// IDS logo icon
export const IdsIcon = ({ className = 'h-4 w-4', size, monochromatic = true }: IdsIconProps) => {
  return (
    <svg
      id="ids-logo"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 198.65 214.56"
      className={className}
      width={size}
      height={size}
    >
      <polygon fill={monochromatic ? "currentColor" : "#9f358b"} points="98.77 164.3 74.5 150.29 49.39 164.79 49.39 186.05 98.77 214.56 148.15 186.05 148.15 164.79 148.15 135.79 98.77 164.3"/>
      <polygon fill={monochromatic ? "currentColor" : "#f00023"} points="96.47 1.33 49.39 28.51 49.39 50.74 49.01 78.98 98.77 50.26 123.88 64.76 148.15 50.74 148.15 28.51 98.77 0 96.47 1.33"/>
      <polygon fill={monochromatic ? "currentColor" : "#004f9f"} points="0 79.26 0 136.28 49.39 164.79 74.5 150.29 49.38 135.79 49.39 79.26 49.39 78.77 49.39 50.74 0 79.26"/>
      <polygon fill={monochromatic ? "currentColor" : "#009eb0"} points="148.15 78.77 148.15 135.3 148.15 135.79 148.15 164.79 197.53 136.28 197.53 79.26 148.15 50.74 123.88 64.76 148.15 78.77"/>
      <path fill={monochromatic ? "currentColor" : "#1c1c1b"} d="m178.21,207.66h-1.07v-12.96h-3.98v-1.03h8.95v1.03h-3.9v12.96Zm20.44,0h-1.07l-1.55-12.48-.07-.33-.04-.18-.04-.04c-.07,0-.11.18-.22.55l-3.5,11.53c-.22.74-.55,1.07-1.07,1.07-.59,0-.92-.4-1.22-1.44l-3.35-11.49c-.04-.15-.07-.22-.15-.22-.04,0-.11.11-.11.22l-1.66,12.82h-1.1l1.69-12.56c.11-1.07.48-1.51,1.22-1.51.62,0,.96.37,1.22,1.25l3.39,11.53.04.15.04.11c.07-.15.07-.18.11-.29l3.46-11.38c.29-1.03.59-1.36,1.22-1.36.74,0,1.07.44,1.22,1.55l1.55,12.52Z"/>
    </svg>
  )
}
