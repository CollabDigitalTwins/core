// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { Skeleton } from '../Skeleton'

function SensorGroupSkeleton() {
  return (
    <div className="w-full flex flex-col">
      {/* Matches CollapsibleSection header: px-3, flex gap-2, p-1 */}
      <div className="px-3">
        <div className="flex items-center gap-2 p-1">
          {/* icon */}
          <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
          {/* title */}
          <Skeleton className="h-4 w-28" />
          {/* item count badge */}
          <Skeleton className="h-4 w-5 rounded-full" />
          {/* spacer */}
          <div className="ml-auto flex items-center gap-2">
            {/* switch */}
            <Skeleton className="h-5 w-9 rounded-full" />
            {/* chevron */}
            <Skeleton className="h-4 w-4 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function SensorsSectionSkeleton() {
  return (
    <div className="flex-1 flex flex-col space-y-1 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <SensorGroupSkeleton key={i} />
      ))}
    </div>
  )
}
