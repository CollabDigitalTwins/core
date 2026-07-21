'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { cn } from '../../utils/utils'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './Dialog'

import type { LucideIcon } from 'lucide-react'

interface AddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  icon?: LucideIcon
  children: React.ReactNode
  contentClassName?: string
}

export function AddItemDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  children,
  contentClassName,
}: AddItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-lg', contentClassName)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon && <Icon size={18} className="text-muted-foreground shrink-0" />}
            <span>{title}</span>
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
