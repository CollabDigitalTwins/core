'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { useUpdateFile } from '../../../../hooks/files/files'
import { BimContext, MapContext } from '../../../../store'
import { CRS_OPTIONS, WGS84 } from '../../../../utils/geo/crsDefinitions'
import {
  georeferenceToPlacement,
  hasGeoreference,
  isOverridden,
  manualGeoreference,
  sourcePlacementPatch,
} from '../../../../utils/geo/georeference'
import { Button } from '../../../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../ui/Dialog'
import { Input } from '../../../ui/Input'
import { LabelledSelect } from '../../../ui/LabelledSelect'

import type { DbFile } from '../../../../types/dbTypes'

const CUSTOM_CRS = 'custom'

interface GeolocationForm {
  crs: string
  proj4Def: string
  easting: string
  northing: string
  height: string
  rotation: string
}

type FormKey = keyof GeolocationForm

const toInputText = (value: number | null | undefined) => (value == null ? '' : String(value))

function initialForm(file: DbFile): GeolocationForm {
  if (!hasGeoreference(file)) {
    return { crs: WGS84, proj4Def: '', easting: toInputText(file.lng), northing: toInputText(file.lat), height: '', rotation: toInputText(file.rotation ?? 0) }
  }
  const known = CRS_OPTIONS.some(option => option.code === file.fileProjectedCRS)
  return {
    crs: known && !file.sourceProj4Def ? file.fileProjectedCRS as string : CUSTOM_CRS,
    proj4Def: file.sourceProj4Def ?? '',
    easting: toInputText(file.mapConversionEastings),
    northing: toInputText(file.mapConversionNorthings),
    height: toInputText(file.mapConversionOrthogonalHeight),
    rotation: toInputText(georeferenceToPlacement(file)?.rotation),
  }
}

function formToColumns(form: GeolocationForm) {
  const easting = Number(form.easting)
  const northing = Number(form.northing)
  if (form.easting.trim() === '' || form.northing.trim() === '' || !Number.isFinite(easting) || !Number.isFinite(northing)) return null
  const isCustom = form.crs === CUSTOM_CRS
  return manualGeoreference({
    crs: isCustom ? '' : form.crs,
    proj4Def: isCustom ? form.proj4Def : undefined,
    easting,
    northing,
    height: form.height.trim() === '' ? null : Number(form.height),
    rotation: Number(form.rotation) || 0,
  })
}

function previewOf(form: GeolocationForm) {
  try {
    const columns = formToColumns(form)
    return columns ? { columns, placement: georeferenceToPlacement(columns) } : null
  }
  catch {
    return null
  }
}

function ResetButton({ label, onClick }: { label: string, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <LR.RotateCcw className="h-3 w-3" />
    </button>
  )
}

function Field({ label, resetLabel, onReset, children }: { label: string, resetLabel: string, onReset?: () => void, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-4 items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {onReset && <ResetButton label={resetLabel} onClick={onReset} />}
      </div>
      {children}
    </div>
  )
}

interface GeolocationFormBodyProps {
  file: DbFile
  onClose: () => void
}

function GeolocationFormBody({ file, onClose }: GeolocationFormBodyProps) {
  const t = useTranslations('Geolocation')
  const updateFile = useUpdateFile()
  const { state: bimState } = React.useContext(BimContext)
  const { state: mapState } = React.useContext(MapContext)
  const [origin] = React.useState(() => initialForm(file))
  const [form, setForm] = React.useState(origin)
  const [saving, setSaving] = React.useState(false)

  const setValue = (key: FormKey, value: string) => setForm(prev => ({ ...prev, [key]: value }))
  const resetFor = (...keys: FormKey[]) => keys.some(key => form[key] !== origin[key])
    ? () => setForm(prev => ({ ...prev, ...Object.fromEntries(keys.map(key => [key, origin[key]])) }))
    : undefined
  const isEdited = (Object.keys(origin) as FormKey[]).some(key => form[key] !== origin[key])

  const preview = previewOf(form)
  const isLonLat = form.crs === WGS84
  const canRevert = isOverridden(file)
  const resetLabel = t('resetField')

  const write = async (patch: Partial<DbFile>, successKey: 'saved' | 'reverted') => {
    setSaving(true)
    try {
      await updateFile(file.id, patch)
      Object.assign(file, patch)
      // The map layer reads its own copy of the row every frame, so it moves only once that copy does.
      const onMap = bimState.bim.bimModelsAddedToMap.find(model => model.bimFile.id === file.id)
      if (onMap) Object.assign(onMap.bimFile, patch)
      mapState.map.map?.triggerRepaint()
      toast.success(t(successKey, { name: file.name }))
      onClose()
    }
    catch (error) {
      console.error('Could not save the geolocation:', error)
      toast.error(t('saveFailed', { name: file.name }))
    }
    finally {
      setSaving(false)
    }
  }

  const save = () => {
    if (!preview?.placement) return
    void write({ ...preview.columns, ...sourcePlacementPatch(preview.columns) }, 'saved')
  }
  const revert = () => {
    const patch = sourcePlacementPatch(file)
    if (patch) void write(patch, 'reverted')
  }

  const crsOptions = [
    ...CRS_OPTIONS.map(option => ({ value: option.code, label: `${option.label} (${option.code})` })),
    { value: CUSTOM_CRS, label: t('customCrs') },
  ]
  const resetCrs = resetFor('crs', 'proj4Def')

  return (
    <>
      <DialogHeader>
        <DialogTitle className="break-words pr-6">{t('title', { name: file.name })}</DialogTitle>
        <DialogDescription>{t('description')}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-1">
          <LabelledSelect label={t('crs')} value={form.crs} options={crsOptions} onChange={crs => setValue('crs', crs)} />
          {resetCrs && <div className="pb-2"><ResetButton label={resetLabel} onClick={resetCrs} /></div>}
        </div>
        {form.crs === CUSTOM_CRS && (
          <Field label={t('proj4Def')} resetLabel={resetLabel} onReset={resetFor('proj4Def')}>
            <Input aria-label={t('proj4Def')} value={form.proj4Def} onChange={e => setValue('proj4Def', e.target.value)} placeholder="+proj=utm +zone=18 +datum=NAD83 +units=m" />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          {([
            ['easting', isLonLat ? t('longitude') : t('easting')],
            ['northing', isLonLat ? t('latitude') : t('northing')],
            ['height', t('sourceHeight')],
            ['rotation', t('rotation')],
          ] as const).map(([key, label]) => (
            <Field key={key} label={label} resetLabel={resetLabel} onReset={resetFor(key)}>
              <Input aria-label={label} inputMode="decimal" value={form[key]} onChange={e => setValue(key, e.target.value)} />
            </Field>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t('sourceHeightHint')}</p>
        <p className="rounded-md bg-muted px-2 py-1.5 font-mono text-xs" role="status">
          {preview?.placement
            ? t('preview', { lat: preview.placement.lat.toFixed(6), lng: preview.placement.lng.toFixed(6) })
            : t('invalid')}
        </p>
      </div>

      <DialogFooter className="flex-wrap gap-2 sm:space-x-0">
        {isEdited && (
          <Button variant="ghost" onClick={() => setForm(origin)} disabled={saving}>{t('resetAll')}</Button>
        )}
        {canRevert && (
          <Button variant="outline" onClick={revert} disabled={saving}>{t('revert')}</Button>
        )}
        <Button onClick={save} disabled={saving || !preview?.placement}>{t('save')}</Button>
      </DialogFooter>
    </>
  )
}

interface GeolocationDialogProps {
  file: DbFile
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GeolocationDialog({ file, open, onOpenChange }: GeolocationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg grid-cols-[minmax(0,1fr)]">
        <GeolocationFormBody file={file} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
