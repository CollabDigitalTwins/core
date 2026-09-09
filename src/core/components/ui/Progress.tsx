'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as ProgressPrimitive from '@radix-ui/react-progress'
import * as React from 'react'

import { cn } from '../../utils/utils'

type ProgressProps = Omit<
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
  'value'
> & { value?: number | null }

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, ...props }, ref) => {
  const indeterminate = value == null

  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={indeterminate ? undefined : value}
      data-indeterminate={indeterminate ? 'true' : undefined}
      className={cn(
        'relative h-1.5 w-full overflow-hidden rounded-full bg-muted',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="indicator"
        className={cn(
          'h-full w-full flex-1 rounded-full bg-primary transition-transform duration-300 ease-out',
          indeterminate && 'animate-pulse',
        )}
        style={{ transform: `translateX(-${indeterminate ? 60 : 100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
