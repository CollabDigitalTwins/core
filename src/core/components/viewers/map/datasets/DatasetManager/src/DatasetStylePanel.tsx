"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import * as React from 'react'

import { DatasetsContext } from '../../../../../../store'
import { normaliseColour } from '../../../../../../utils/colourUtils'
import { Button } from '../../../../../ui/Button'
import { LoadingSpinner } from '../../../../../ui/LoadingSpinner'
import { COLOUR_RAMPS, DEFAULT_COLOUR_RAMP, type ColourRampName } from '../../../utils/colourRamps'
import {
  booleanRenderer,
  categoricalRenderer,
  DEFAULT_CLASS_COUNT,
  datasetStyleOf,
  graduatedRenderer,
  hasNumericRange,
  heatmapRenderer,
  rampRenderer,
  rendererField,
  rendererForField,
} from '../../../utils/datasetStyle'
import { isStylableField } from '../../src/fieldProfile'
import { isRasterDataset } from '../../src/mapServices'

import { DatasetLegend } from './DatasetLegend'
import { fieldLabel, isOtherLanguageField } from './fieldLabel'
import { LayerStyleControls } from './LayerStyleControls'
import { LabelledSelect, OpacitySlider, SwatchRow } from './StyleRows'

import type { ClassificationMethod, Dataset, DatasetRenderer, DatasetStyle, FieldProfile } from '../../../../../../types/datasetTypes'

type RendererKind = DatasetRenderer['kind']

const ALL_FEATURES = '__all'
const CLASSIFICATION_METHODS: ClassificationMethod[] = ['quantile', 'equalInterval', 'jenks']
const CLASS_COUNTS = [3, 4, 5, 6, 7, 8, 9]

function holdsColours(profile: FieldProfile): boolean {
  return profile.distinctValues.length > 0 && profile.distinctValues.every(value => normaliseColour(value) !== null)
}

function rendererKinds(profile: FieldProfile | undefined, isPoints: boolean): RendererKind[] {
  if (!profile) return isPoints ? ['single', 'heatmap'] : ['single']
  if (profile.type === 'boolean') return ['boolean']
  if (hasNumericRange(profile)) return isPoints ? ['ramp', 'graduated', 'heatmap'] : ['ramp', 'graduated']
  return holdsColours(profile) ? ['featureColour', 'categorical'] : ['categorical']
}

function rendererOfKind(kind: RendererKind, profile: FieldProfile | undefined, dataset: Dataset): DatasetRenderer {
  if (!profile) return kind === 'heatmap' ? heatmapRenderer() : { kind: 'single' }
  switch (kind) {
    case 'featureColour': return { kind: 'featureColour', property: profile.name }
    case 'boolean': return booleanRenderer(profile, dataset.layerColor)
    case 'graduated': return graduatedRenderer(profile)
    case 'heatmap': return heatmapRenderer(profile)
    case 'ramp': return rampRenderer(profile, dataset.layerColor)
    default: return categoricalRenderer(profile)
  }
}

function GraduatedControls({ renderer, profile, onChange }: { renderer: Extract<DatasetRenderer, { kind: 'graduated' }>; profile: FieldProfile; onChange: (renderer: DatasetRenderer) => void }) {
  const t = useTranslations('DatasetStyle')
  const ramp = renderer.ramp ?? DEFAULT_COLOUR_RAMP
  const classes = renderer.colours.length || DEFAULT_CLASS_COUNT
  const rebuild = (method: ClassificationMethod, count: number, rampName: ColourRampName) => onChange(graduatedRenderer(profile, method, count, rampName))
  return (
    <>
      <LabelledSelect label={t('classification')} value={renderer.method} options={CLASSIFICATION_METHODS.map(method => ({ value: method, label: t(`method.${method}`) }))} onChange={method => rebuild(method as ClassificationMethod, classes, ramp)} />
      <LabelledSelect label={t('classes')} value={String(classes)} options={CLASS_COUNTS.map(count => ({ value: String(count), label: String(count) }))} onChange={count => rebuild(renderer.method, Number(count), ramp)} />
      <LabelledSelect
        label={t('colourRamp')}
        value={ramp}
        options={Object.keys(COLOUR_RAMPS).map(name => ({ value: name, label: t(`ramp.${name}`) }))}
        onChange={name => rebuild(renderer.method, classes, name as ColourRampName)}
      />
    </>
  )
}

function RendererColours({ renderer, profile, baseColour, onRenderer, onBaseColour }: {
  renderer: DatasetRenderer
  profile?: FieldProfile
  baseColour: string
  onRenderer: (renderer: DatasetRenderer) => void
  onBaseColour: (colour: string) => void
}) {
  const t = useTranslations('DatasetStyle')
  switch (renderer.kind) {
    case 'single':
      return <SwatchRow label={t('colour')} colour={baseColour} onChange={onBaseColour} />
    case 'categorical':
      return (
        <>
          {renderer.categories.map((category, i) => (
            <SwatchRow
              key={category.value}
              label={category.value}
              colour={category.colour}
              onChange={colour => onRenderer({ ...renderer, categories: renderer.categories.map((c, j) => (j === i ? { ...c, colour } : c)) })}
            />
          ))}
          <SwatchRow label={t('other')} colour={renderer.otherColour} onChange={otherColour => onRenderer({ ...renderer, otherColour })} />
        </>
      )
    case 'boolean':
      return (
        <>
          <SwatchRow label={t('yes')} colour={renderer.trueColour} onChange={trueColour => onRenderer({ ...renderer, trueColour })} />
          <SwatchRow label={t('no')} colour={renderer.falseColour} onChange={falseColour => onRenderer({ ...renderer, falseColour })} />
          <SwatchRow label={t('noData')} colour={renderer.nullColour} onChange={nullColour => onRenderer({ ...renderer, nullColour })} />
        </>
      )
    case 'ramp':
      return (
        <>
          <SwatchRow label={t('min')} colour={renderer.minColour} onChange={minColour => onRenderer({ ...renderer, minColour })} />
          <SwatchRow label={t('max')} colour={renderer.maxColour} onChange={maxColour => onRenderer({ ...renderer, maxColour })} />
        </>
      )
    case 'graduated':
      return profile ? <GraduatedControls renderer={renderer} profile={profile} onChange={onRenderer} /> : null
    default:
      return null
  }
}

/** Colouring, border, labels and legend for one dataset on the map, offering only what suits each field's type. */
export function DatasetStylePanel({ dataset }: { dataset: Dataset }) {
  const t = useTranslations('DatasetStyle')
  const locale = useLocale()
  const { dispatch } = React.useContext(DatasetsContext)
  const [showsMore, setShowsMore] = React.useState(false)
  const isRaster = isRasterDataset(dataset)
  const style = datasetStyleOf(dataset)

  const updateDataset = (changes: Partial<Dataset>) => dispatch({ type: 'UPDATE_ADDED_DATASET', payload: { datasetName: dataset.name, changes } })
  const updateStyle = (changes: Partial<DatasetStyle>) => updateDataset({ style: { ...style, ...changes } })

  const fields = React.useMemo(
    () => (dataset.fields ?? []).filter(field => isStylableField(field) && !isOtherLanguageField(field.name, locale)),
    [dataset.fields, locale],
  )

  if (isRaster) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <OpacitySlider opacity={style.opacity} onChange={opacity => updateStyle({ opacity })} />
        <div className="max-h-64 overflow-auto">
          <DatasetLegend dataset={dataset} />
        </div>
      </div>
    )
  }

  if (!dataset.fields && dataset.datasetType !== 'MVT') {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-sm">
        <LoadingSpinner />
        <span>{t('loading')}</span>
      </div>
    )
  }

  const selectedName = rendererField(style.renderer)
  const selectedProfile = fields.find(field => field.name === selectedName)
  const isPoints = dataset.layerType === 'circle'
  const kinds = rendererKinds(selectedProfile, isPoints)

  const selectField = (name: string) => {
    const profile = fields.find(field => field.name === name)
    updateStyle({ renderer: profile ? rendererForField(profile, dataset.layerColor) : { kind: 'single' } })
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex gap-2">
        <LabelledSelect
          label={t('colourBy')}
          value={selectedProfile?.name ?? ALL_FEATURES}
          options={[{ value: ALL_FEATURES, label: t('allFeatures') }, ...fields.map(field => ({ value: field.name, label: fieldLabel(field) }))]}
          onChange={selectField}
        />
        {kinds.length > 1 && (
          <LabelledSelect
            label={t('display')}
            value={style.renderer.kind}
            options={kinds.map(kind => ({ value: kind, label: t(`renderer.${kind}`) }))}
            onChange={kind => updateStyle({ renderer: rendererOfKind(kind as RendererKind, selectedProfile, dataset) })}
          />
        )}
      </div>
      <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto pr-2 [scrollbar-gutter:stable]">
        <RendererColours
          renderer={style.renderer}
          profile={selectedProfile}
          baseColour={dataset.layerColor.color}
          onRenderer={renderer => updateStyle({ renderer })}
          onBaseColour={color => updateDataset({ layerColor: { ...dataset.layerColor, color } })}
        />
      </div>
      {style.renderer.kind === 'graduated' && <DatasetLegend dataset={dataset} />}
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={showsMore}
        onClick={() => setShowsMore(shown => !shown)}
        className="h-7 gap-1.5 self-start px-2 text-xs text-muted-foreground"
      >
        <LR.SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
        {t(showsMore ? 'lessStyle' : 'moreStyle')}
        <LR.ChevronDown className={`h-3.5 w-3.5 transition-transform ${showsMore ? 'rotate-180' : ''}`} aria-hidden />
      </Button>
      {showsMore && (
        <div className="border-t pt-3">
          <LayerStyleControls style={style} fields={fields} layerType={dataset.layerType} onChange={updateStyle} />
        </div>
      )}
    </div>
  )
}
