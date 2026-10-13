"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { BoxSelect } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";
import { toast } from 'sonner'

import { useBuildings } from '../../../../../../../hooks/buildings/buildings'
import { useCreateSite } from '../../../../../../../hooks/sites/sites'
import { MapContext, useMapSitesContext } from '../../../../../../../store'
import { Input, Label } from '../../../../../../ui/'
import { AddItemDialog } from '../../../../../../ui/AddItemDialog'
import { Button } from '../../../../../../ui/Button'
import { polygonCentroid, filterPointsInRing } from '../../../MapLayers/src/SiteLayer/siteGeometry'
import { toolDrawLabels, usePolygonDraw } from '../shared/usePolygonDraw'

import { AssociateBuildingsDialog } from './AssociateBuildingsDialog'
import { persistDrawnSite } from './persistSite'

import type { Building } from '../../../../../../../types/dbTypes'
import type { Ring } from '../../../MapLayers/src/SiteLayer/siteGeometry'

interface SiteAdderProps {
  isOpen?: boolean
  onCancel?: () => void
}

const DRAW_TOAST_ID = 'site-adder-draw'

export const SiteAdder = ({ isOpen = false, onCancel }: SiteAdderProps) => {
  const t = useTranslations('SiteAdder')

  const [siteName, setSiteName] = React.useState<string>('')
  const { state: mapState } = React.useContext(MapContext)
  const { map, mapClickManager } = mapState.map!

  const { createSite } = useCreateSite()
  const { dispatch: mapSitesDispatch } = useMapSitesContext()

  const { buildings, isLoading: buildingsLoading } = useBuildings()

  // State, not a ref, so detection re-runs once the buildings list loads.
  const [pendingDetection, setPendingDetection] = React.useState<
    { siteId: number, siteName: string, ring: Ring } | null
  >(null)

  const [associateState, setAssociateState] = React.useState<
    { siteId: number, siteName: string, buildings: Building[] } | null
  >(null)

  const persistRing = async (ring: Ring) => {
    const name = siteName.trim() || t('unnamedSite')
    const toastId = toast.loading(t('savingSite'))
    try {
      const { siteId, assetId, fileId } = await persistDrawnSite({ name, ring, centroid: polygonCentroid(ring), createSite })
      mapSitesDispatch({ type: 'SHOW_SITE', payload: { site: { id: siteId, name, ring, assetId, fileId } } })
      toast.success(t('siteCreated', { name }), { id: toastId })
      setSiteName('')
      setPendingDetection({ siteId, siteName: name, ring })
      onCancel?.()
    }
    catch (error) {
      toast.error(t('siteCreateFailed'), { id: toastId })
      throw error
    }
  }

  const { isDrawing, start: startDrawing } = usePolygonDraw({
    map,
    mapClickManager,
    enabled: isOpen,
    toastId: DRAW_TOAST_ID,
    onFinish: persistRing,
    labels: toolDrawLabels(t),
  })

  React.useEffect(() => {
    if (!pendingDetection) return
    if (buildingsLoading && buildings.length === 0) return
    const inside = filterPointsInRing(pendingDetection.ring, buildings, b =>
      (typeof b.buildingLongitude === 'number' && typeof b.buildingLatitude === 'number')
        ? [b.buildingLongitude, b.buildingLatitude]
        : null)
    if (inside.length > 0) {
      setAssociateState({
        siteId: pendingDetection.siteId,
        siteName: pendingDetection.siteName,
        buildings: inside,
      })
    }
    setPendingDetection(null)
  }, [pendingDetection, buildings, buildingsLoading])

  if (isDrawing) return null

  return (
    <>
      {associateState && (
        <AssociateBuildingsDialog
          siteId={associateState.siteId}
          siteName={associateState.siteName}
          buildings={associateState.buildings}
          onClose={() => setAssociateState(null)}
        />
      )}
      <AddItemDialog
        open={isOpen}
        onOpenChange={open => !open && onCancel?.()}
        title={t('title')}
        icon={BoxSelect}
      >
      <div className="flex flex-col gap-3 pointer-events-auto">
        <div className="flex flex-col gap-2">
          <Label htmlFor="site-name">{t('nameLabel')}</Label>
          <Input
            id="site-name"
            type="text"
            placeholder={t('namePlaceholder')}
            value={siteName}
            onChange={e => setSiteName(e.target.value)}
          />
        </div>

        <ol className="list-decimal pl-4 text-xs text-muted-foreground space-y-1">
          <li>{t('step1')}</li>
          <li>{t('step2')}</li>
          <li>{t('step3')}</li>
        </ol>

        <div className="flex gap-2">
          <Button onClick={() => startDrawing()}>
            <BoxSelect className="size-4" />
            {t('startDrawing')}
          </Button>
        </div>
      </div>
      </AddItemDialog>
    </>
  )
}
