"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { Button, Input } from '../../../../components/ui/'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '../../../../components/ui/Dialog'
import { useMenusContext } from '../../../../store'
import { usePermissions } from '../../../../store'


// Shadcn components

// Icons

interface AddSiteProps {
  newItemName: string
  setNewItemName: React.Dispatch<React.SetStateAction<string>>
}

export default function AddSite({ newItemName, setNewItemName }: AddSiteProps) {
// Translations
  const t = useTranslations('AddSite')

  // Permissions
  const { ability } = usePermissions()

  const [open, setOpen] = React.useState(false)
  const { setSelectedSite, setView } = useMenusContext()

  const handleInputChange = (e) => {
    setNewItemName(e.target.value)
  }

  const handleGetStarted = () => {
    if (!newItemName.trim()) {
      toast.error(t('toastErrorNoSite'))
      return
    }

    const blankSite = {
      // Use temporary ID
      id: -1,
      siteName: newItemName,
    }

    // Set as selected site
    setSelectedSite(blankSite as any)

    // Switch to detail view
    setView('detail')

    // Close the dialog
    setOpen(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default" disabled={!ability.can('create', 'Site')}>
            <LR.CirclePlus className="" />
            {t('add')}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>
              {t('description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col">
            <div className="text-sm font-medium text-foreground">{t('label1')}</div>
            <Input
              value={newItemName || ''}
              onChange={e => handleInputChange(e)}
              placeholder={t('labelPlaceholder1')}
            />
          </div>
          <div className="w-full flex justify-end">
            <Button
              variant="secondary"
              className="w-fit"
              onClick={handleGetStarted}
              disabled={!newItemName.trim()}
            >
              {t('submit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
