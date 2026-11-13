"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { useBuildingAssociations, useBuildings, useRemoveBuilding } from '../../../../hooks/buildings/buildings'
import { buildingDisplayName } from '../../../../utils/buildingDisplayName'
import { Button } from '../../../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../ui/Dialog'
import { LoadingSpinner } from '../../../ui/LoadingSpinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/Select'
import { Switch } from '../../../ui/Switch'

import type { Building, BuildingRemoval } from '../../../../types/dbTypes'

interface DeleteBuildingDialogProps {
  building: Building
  open: boolean
  onOpenChange: (open: boolean) => void
  onRemoved: (result: BuildingRemoval) => void
}

const displayName = (building: Building) => buildingDisplayName(building) ?? `#${building.id}`

export default function DeleteBuildingDialog({ building, open, onOpenChange, onRemoved }: DeleteBuildingDialogProps) {
  const t = useTranslations('DeleteBuildingDialog')
  const { associations, isLoading, error } = useBuildingAssociations(open ? building.id : null)
  const { buildings } = useBuildings()
  const { removeBuilding, isMutating } = useRemoveBuilding()
  const [transfer, setTransfer] = React.useState(false)
  const [targetId, setTargetId] = React.useState('')

  const hasAssociations = !!associations
    && (associations.files + associations.sensors + associations.comments > 0 || associations.isDefaultLocation)
  const isDefaultLocation = String(!!associations?.isDefaultLocation)
  const targets = React.useMemo(
    () => (buildings ?? [])
      .filter(candidate => candidate.id !== building.id)
      .sort((a, b) => displayName(a).localeCompare(displayName(b))),
    [buildings, building.id],
  )
  const target = targets.find(candidate => String(candidate.id) === targetId)
  const transferring = hasAssociations && transfer

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTransfer(false)
      setTargetId('')
    }
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    try {
      const result = await removeBuilding(building.id, transferring && target ? { transferToBuildingId: target.id } : undefined)
      toast.success(t('removed'))
      handleOpenChange(false)
      onRemoved(result)
    } catch (err) {
      console.error('Building removal failed:', err)
      toast.error(t('failed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent onClick={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{t('title', { name: displayName(building) })}</DialogTitle>
          <DialogDescription>{t('body')}</DialogDescription>
        </DialogHeader>
        {isLoading && <LoadingSpinner />}
        {error && <p className="text-sm text-destructive">{t('loadFailed')}</p>}
        {hasAssociations && (
          <div className="flex flex-col gap-3 text-sm">
            <p>{t('associated', { files: associations.files, sensors: associations.sensors, comments: associations.comments })}</p>
            <label className="flex items-center gap-2">
              <Switch checked={transfer} onCheckedChange={setTransfer} />
              {t('transferToggle')}
            </label>
            {transfer && (
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger><SelectValue placeholder={t('transferPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {targets.map(candidate => (
                    <SelectItem key={candidate.id} value={String(candidate.id)}>{displayName(candidate)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-muted-foreground">
              {transfer && target
                ? t('transferOutcome', { target: displayName(target), isDefaultLocation })
                : t('defaultOutcome', { isDefaultLocation })}
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>{t('cancel')}</Button>
          <Button
            variant="destructive"
            disabled={isMutating || isLoading || !!error || (transferring && !target)}
            onClick={() => void handleConfirm()}
          >
            {t('confirm')}
            {isMutating && <LoadingSpinner />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
