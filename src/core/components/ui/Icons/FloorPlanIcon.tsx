// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Icon } from 'lucide-react'
import { floorPlan } from '@lucide/lab'

interface FloorplanIconProps {
  className?: string
}

export const FloorplanIcon = ({ className = 'h-4 w-4' }: FloorplanIconProps) => {
  return (
    <Icon iconNode={floorPlan} className={className} />
  )
}
