"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { useMenusContext, usePermissions } from '../../../../store'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

// Shadcn components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '../../../ui/Dialog'
import { Button } from '../../../ui/Button'

// Icons
import * as LR from 'lucide-react'

// Custom components
import { DropdownMenuItem } from '@radix-ui/react-dropdown-menu'

interface AddInfrastructureProps {
  newInfrastructureFields: any
  setNewInfrastructureFields: (fields: any) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddInfrastructure({
  newInfrastructureFields,
  setNewInfrastructureFields,
  open,
  onOpenChange,
}: AddInfrastructureProps) {
  // Translations
  const t = useTranslations('AddInfrastructure')
  // Permissions
  const { ability } = usePermissions()

  const { setSelectedItem, setView } = useMenusContext()

  const handleGeocoderSelect = (fields) => {
    setNewInfrastructureFields(fields)
  }

  const handleGetStarted = () => {
    if (!newInfrastructureFields.infrastructureAddress?.trim()) {
      toast.error(t('toastErr'))
      return
    }

    const blankInfrastructure = {
      id: -1,
      ...newInfrastructureFields,
    }

    setSelectedItem(blankInfrastructure as any)
    setView('detail')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-foreground">{t('label')}</div>
          {newInfrastructureFields.infrastructureAddress && (
            <div className="text-xs text-muted-foreground mt-1">
              {t('label2')}
              {' '}
              {newInfrastructureFields.infrastructureAddress}
            </div>
          )}
        </div>
        <div className="w-full flex justify-end">
          <Button
            variant="secondary"
            className="w-fit"
            onClick={handleGetStarted}
            disabled={!newInfrastructureFields.infrastructureAddress?.trim() || !ability.can('create', 'Infrastructure')}
          >
            {t('submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}