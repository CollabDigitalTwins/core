'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Building2 } from 'lucide-react'
import { AddItemDialog } from '../../../../../../ui/AddItemDialog'
import { Button } from '../../../../../../ui/Button'
import { Checkbox } from '../../../../../../ui/Checkbox'
import { LoadingSpinner } from '../../../../../../ui/LoadingSpinner'
import { useSite } from '../../../../../../../hooks/sites/sites'
import type { Building } from '../../../../../../../types/dbTypes'

interface AssociateBuildingsDialogProps {
  siteId: number
  siteName: string
  buildings: Building[]
  onClose: () => void
  /** Called with the associated buildings after a successful connect. */
  onAssociated?: (buildings: Building[]) => void
}

/**
 * Shown after a site polygon is drawn when database buildings are detected
 * inside it. The user picks (multi-select) which buildings to associate with
 * the new site; selected buildings are connected via `updateSite`.
 */
export const AssociateBuildingsDialog = ({
  siteId, siteName, buildings, onClose, onAssociated,
}: AssociateBuildingsDialogProps) => {
  const t = useTranslations('AssociateBuildings')
  const tf = (key: string, fallback: string, values?: Record<string, string | number>) =>
    (t.has(key) ? t(key, values) : fallback)

  const { updateSite } = useSite(String(siteId))
  const [selected, setSelected] = React.useState<Set<number>>(
    () => new Set(buildings.map(b => b.id)),
  )
  const [isSaving, setIsSaving] = React.useState(false)

  const toggle = (id: number) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const allSelected = selected.size === buildings.length
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(buildings.map(b => b.id)))

  const handleAssociate = async () => {
    if (selected.size === 0) { onClose(); return }
    setIsSaving(true)
    try {
      await updateSite({ siteBuildings: { connect: [...selected].map(id => ({ id })) } })
      toast.success(tf('associated', `${selected.size} building(s) associated with "${siteName}".`, {
        count: selected.size,
        name: siteName,
      }))
      onAssociated?.(buildings.filter(b => selected.has(b.id)))
      onClose()
    }
    catch {
      toast.error(tf('associateFailed', 'Failed to associate the buildings. Please try again.'))
      setIsSaving(false)
    }
  }

  return (
    <AddItemDialog
      open
      onOpenChange={open => !open && !isSaving && onClose()}
      title={tf('title', 'Buildings found inside this site')}
      description={tf('subtitle', `These buildings fall within "${siteName}". Choose which to associate with it.`, { name: siteName })}
      icon={Building2}
    >
      <div className="flex flex-col gap-3 pointer-events-auto">
        <button
          type="button"
          onClick={toggleAll}
          className="self-start text-xs text-primary hover:underline"
        >
          {allSelected ? tf('deselectAll', 'Deselect all') : tf('selectAll', 'Select all')}
        </button>

        <div className="max-h-64 overflow-y-auto flex flex-col gap-1 rounded-md border p-1">
          {buildings.map(b => (
            <label
              key={b.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
            >
              <Checkbox checked={selected.has(b.id)} onCheckedChange={() => toggle(b.id)} />
              <div className="flex flex-col min-w-0">
                <span className="text-sm truncate">{b.buildingName || tf('unnamed', 'Unnamed building')}</span>
                {b.buildingAddress && (
                  <span className="text-xs text-muted-foreground truncate">{b.buildingAddress}</span>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {tf('skip', 'Skip')}
          </Button>
          <Button onClick={handleAssociate} disabled={isSaving || selected.size === 0}>
            {isSaving && <LoadingSpinner />}
            {tf('associate', 'Associate')} ({selected.size})
          </Button>
        </div>
      </div>
    </AddItemDialog>
  )
}
