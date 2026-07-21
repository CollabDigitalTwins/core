// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../../utils/utils'

import { Button } from './Button'

const badgeVariants = cva(
  'inline-flex items-center rounded-xl border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

  const ItemsBadgeButton: React.FC<{ count: number, onClick: () => void }> = ({ count, onClick }) => (
    <>
      {count > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 mx-2 opacity-70 hover:opacity-100 right-2 "
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClick}
        >
          <Badge variant="outline" className="text-xs">
            {count}
          </Badge>
        </Button>
      )}
    </>
  )

export { Badge, badgeVariants, ItemsBadgeButton }
export type { BadgeProps }
