'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { PopoverContent } from '../../../../../ui/Popover'
import { Button, Skeleton } from '../../../../../ui/'
import * as LR from 'lucide-react'

export default function PopoverSkeleton() {
  return (
    <PopoverContent className="w-64 -m-1" side="top">
      <div className="grid gap-4">
        <Button
          variant="ghost"
          className="absolute top-1 right-2 p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <LR.X className="w-4 h-4" />
        </Button>

        {/* Building Name Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Building Details Skeleton */}
        <div className="grid gap-2">
          <div id="details">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-3 w-40 mb-1" />
            <Skeleton className="h-3 w-36" />
          </div>

          {/* BIM Toggle Skeleton */}
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-10" />
          </div>
        </div>
      </div>
    </PopoverContent>
  )
}
