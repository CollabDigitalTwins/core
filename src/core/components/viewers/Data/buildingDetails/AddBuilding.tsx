"use client"

import * as React from "react";
import { useMenusContext } from '../../../../store'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

// Shadcn components
import { AddItemDialog } from '../../../ui/AddItemDialog'
import { Button } from '../../../ui/Button'

// Icons
import * as LR from 'lucide-react'

// Custom components
import GeocoderInput from './GeocoderInput'
import { DropdownMenuItem } from '@radix-ui/react-dropdown-menu'

interface AddBuildingProps {
  newBuildingFields: any
  setNewBuildingFields: (fields: any) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddBuilding({
  newBuildingFields,
  setNewBuildingFields,
  open,
  onOpenChange,
}: AddBuildingProps) {
  // Translations
  const t = useTranslations('AddBuilding')

  const { setSelectedItem, setView } = useMenusContext()

  const handleGeocoderSelect = (fields) => {
    setNewBuildingFields(fields)
  }

  const handleGetStarted = () => {
    if (!newBuildingFields.buildingAddress?.trim()) {
      toast.error(t('toastErr'))
      return
    }

    const blankBuilding = {
      id: -1,
      ...newBuildingFields,
    }

    setSelectedItem(blankBuilding as any)
    setView('detail')
    onOpenChange(false)
  }

  return (
    <AddItemDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('description')}
      icon={LR.Building2}
    >
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-foreground">{t('label')}</div>
        <GeocoderInput onSelect={handleGeocoderSelect} />
        {newBuildingFields.buildingAddress && (
          <div className="text-xs text-muted-foreground mt-1">
            {t('label2')}
            {' '}
            {newBuildingFields.buildingAddress}
          </div>
        )}
      </div>
      <div className="w-full flex justify-end">
        <Button
          variant="secondary"
          className="w-fit"
          onClick={handleGetStarted}
          disabled={!newBuildingFields.buildingAddress?.trim()}
        >
          {t('submit')}
        </Button>
      </div>
    </AddItemDialog>
  )
}