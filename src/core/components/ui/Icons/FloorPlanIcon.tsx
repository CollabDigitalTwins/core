// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { floorPlan } from '@lucide/lab'
import { Icon } from 'lucide-react'

interface FloorplanIconProps {
  className?: string
}

export const FloorplanIcon = ({ className = 'h-4 w-4' }: FloorplanIconProps) => {
  return (
    <Icon iconNode={floorPlan} className={className} />
  )
}
