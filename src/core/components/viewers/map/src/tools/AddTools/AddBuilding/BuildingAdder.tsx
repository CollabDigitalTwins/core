"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { useBuildings, useCreateBuilding } from '../../../../../../../hooks/buildings/buildings'
import { MapContext } from '../../../../../../../store'
import { Input, Label } from '../../../../../../ui/'
import { AddItemDialog } from '../../../../../../ui/AddItemDialog'
import { Button } from '../../../../../../ui/Button'
import GeocoderInput from '../../../../../Data/buildingDetails/GeocoderInput'
import { addressFieldsFromPlace, getDetailedAddress } from '../../../../utils/geocoder'
import { polygonCentroid } from '../../../MapLayers/src/SiteLayer/siteGeometry'
import { BUILDINGS_LAYER_ID, buildingWithOsmId, footprintAt } from '../../../Placement/resolveClickPlacement'
import { useMapToolSession } from '../shared/useMapToolSession'
import { usePolygonDraw } from '../shared/usePolygonDraw'

import { newBuildingData } from './newBuilding'

import type { BuildingPlacement } from './newBuilding'
import type { AddressFields } from '../../../../utils/geocoder'
import type { Ring } from '../../../MapLayers/src/SiteLayer/siteGeometry'
import type * as maplibregl from 'maplibre-gl'

interface BuildingAdderProps {
  isOpen: boolean
  onClose: () => void
  geocodeEarthApiKey?: string
  geocoderUrl?: string
}

interface SearchedAddress {
  fields: AddressFields
  lng: number
  lat: number
}

const DRAW_TOAST_ID = 'building-adder-draw'
const PICK_TOAST_ID = 'building-adder-pick'

export function BuildingAdder({ isOpen, onClose, geocodeEarthApiKey, geocoderUrl }: BuildingAdderProps) {
  const t = useTranslations('BuildingAdder')
  const { data: session } = useSession()
  const organizationId = session?.user?.organizationId

  const { state: mapState } = React.useContext(MapContext)
  const { map, mapClickManager, organizationCountry } = mapState.map

  const { createBuilding } = useCreateBuilding()
  const { buildings } = useBuildings()

  const [name, setName] = React.useState('')
  const [searched, setSearched] = React.useState<SearchedAddress | null>(null)
  const [isPicking, setIsPicking] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const close = () => {
    setName('')
    setSearched(null)
    setIsPicking(false)
    onClose()
  }

  const addressAt = async (lng: number, lat: number): Promise<AddressFields> => {
    const properties = (await getDetailedAddress([lng, lat], organizationCountry))?.properties
    return addressFieldsFromPlace(properties, String(properties?.label ?? properties?.name ?? ''))
  }

  const create = async (placement: BuildingPlacement, address?: AddressFields) => {
    if (!organizationId) {
      toast.error(t('noOrganization'))
      throw new Error('No organization in session')
    }
    setIsSaving(true)
    const toastId = toast.loading(t('saving'))
    try {
      const fields = address ?? await addressAt(placement.lng, placement.lat)
      const buildingData = newBuildingData({ name, placement, address: fields })
      await createBuilding({ buildingData, organizationId: String(organizationId) })
      toast.success(t('created', { name: buildingData.buildingName ?? t('unnamed') }), { id: toastId })
      close()
    }
    catch (error) {
      console.error('Failed to create building:', error)
      toast.error(t('createFailed'), { id: toastId })
      throw error
    }
    finally {
      setIsSaving(false)
    }
  }

  const { isDrawing, start: startDrawing } = usePolygonDraw({
    map,
    mapClickManager,
    enabled: isOpen,
    toastId: DRAW_TOAST_ID,
    onFinish: (ring: Ring) => {
      const [lng, lat] = polygonCentroid(ring)
      return create({ lng, lat, ring })
    },
    labels: {
      mapNotReady: t('mapNotReady'),
      cancelled: t('drawCancelled'),
      needThreePoints: t('needThreePoints'),
      title: t('drawTitle'),
      readyTitle: t('drawReadyTitle'),
      hint: count => t('drawHint', { count }),
      readyHint: count => t('drawReadyHint', { count }),
      finish: t('finish'),
      cancel: t('cancel'),
    },
  })

  const startPicking = () => {
    if (!map?.getLayer(BUILDINGS_LAYER_ID)) {
      toast.error(t('footprintsUnavailable'))
      return
    }
    setIsPicking(true)
  }

  const pickFootprint = (e: maplibregl.MapMouseEvent) => {
    const osmId = map ? footprintAt(map, e.point) : null
    if (!osmId) {
      toast.warning(t('pickMissed'))
      return
    }
    if (buildingWithOsmId(buildings, osmId)) {
      toast.warning(t('pickTaken'))
      return
    }
    setIsPicking(false)
    create({ lng: e.lngLat.lng, lat: e.lngLat.lat, osmId }).catch(() => setIsPicking(true))
  }

  useMapToolSession({
    map,
    mapClickManager,
    active: isPicking,
    cursor: 'pointer',
    onClick: pickFootprint,
    onKeyDown: (e) => { if (e.key === 'Escape') setIsPicking(false) },
  })

  React.useEffect(() => {
    if (!isPicking) return
    toast.info(t('pickTitle'), {
      id: PICK_TOAST_ID,
      description: t('pickHint'),
      duration: Infinity,
      cancel: { label: t('cancel'), onClick: () => setIsPicking(false) },
    })
    return () => { toast.dismiss(PICK_TOAST_ID) }
  }, [isPicking, t])

  React.useEffect(() => {
    if (!isOpen) setIsPicking(false)
  }, [isOpen])

  if (isDrawing || isPicking) return null

  return (
    <AddItemDialog
      open={isOpen}
      onOpenChange={open => { if (!open) close() }}
      title={t('title')}
      description={t('description')}
      icon={LR.Building2}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="building-adder-name">{t('nameLabel')}</Label>
          <Input
            id="building-adder-name"
            placeholder={t('namePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-foreground">{t('addressLabel')}</div>
          <GeocoderInput
            geocodeEarthApiKey={geocodeEarthApiKey}
            geocoderUrl={geocoderUrl}
            onSelect={({ buildingLongitude, buildingLatitude, ...fields }) =>
              setSearched({ fields, lng: buildingLongitude, lat: buildingLatitude })}
          />
          {searched && (
            <div className="text-xs text-muted-foreground">
              {t('selected', { address: searched.fields.buildingAddress ?? '' })}
            </div>
          )}
          <Button
            variant="secondary"
            className="w-fit self-end"
            disabled={!searched || isSaving}
            onClick={() => {
              if (searched) create({ lng: searched.lng, lat: searched.lat }, searched.fields).catch(() => undefined)
            }}
          >
            {t('createAtAddress')}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          {t('or')}
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={isSaving} onClick={startPicking}>
            <LR.MousePointerClick className="size-4" />
            {t('pickFootprint')}
          </Button>
          <Button variant="outline" disabled={isSaving} onClick={() => startDrawing()}>
            <LR.PenTool className="size-4" />
            {t('drawFootprint')}
          </Button>
        </div>
      </div>
    </AddItemDialog>
  )
}
