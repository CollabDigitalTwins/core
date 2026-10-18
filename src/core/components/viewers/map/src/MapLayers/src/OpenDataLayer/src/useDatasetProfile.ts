// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { DatasetsContext } from '../../../../../../../../store'
import { profileFields, propertyNormaliser } from '../../../../../datasets/src/fieldProfile'
import { defaultStyle } from '../../../../../utils/datasetStyle'

import { geometryFamilyOf, LAYER_TYPE_BY_FAMILY } from './geometryGroups'

import type { Dataset, DatasetStyle, LayerGeometryType, SourceStyle } from '../../../../../../../../types/datasetTypes'
import type { Feature, FeatureCollection } from 'geojson'

function singleLayerType(features: Feature[]): LayerGeometryType | undefined {
  let sharedLayerType: LayerGeometryType | undefined
  for (const feature of features) {
    const family = geometryFamilyOf(feature.geometry?.type)
    if (!family) continue
    const layerType = LAYER_TYPE_BY_FAMILY[family]
    if (sharedLayerType && layerType !== sharedLayerType) return undefined
    sharedLayerType = layerType
  }
  return sharedLayerType
}

function initialStyle(dataset: Dataset, source: SourceStyle | undefined, colourProperty: string | undefined, layerType?: LayerGeometryType): Partial<Dataset> {
  if (source) return { style: source.style, ...(source.layerColour && { layerColor: { ...dataset.layerColor, color: source.layerColour } }) }
  return { style: defaultStyle(colourProperty ? { kind: 'featureColour', property: colourProperty } : undefined, layerType) }
}

/** Profiles a dataset's fields from its first loaded features and gives it a starting style, once. */
export function useDatasetProfile(dataset: Dataset, featureCollection: FeatureCollection | null) {
  const { dispatch } = React.useContext(DatasetsContext)
  const datasetRef = React.useRef(dataset)
  React.useEffect(() => { datasetRef.current = dataset }, [dataset])
  const profiled = Boolean(dataset.fields)
  const features = featureCollection?.features

  React.useEffect(() => {
    if (profiled || !features?.length) return
    let cancelled = false
    void (async () => {
      const current = datasetRef.current
      const [declared, source] = await Promise.all([
        current.getFields().catch(() => []),
        current.style ? undefined : current.getSourceStyle?.().catch(() => undefined),
      ])
      const { fields, colourProperty } = profileFields(features, declared)
      const layerType = current.layerType ?? singleLayerType(features)
      const styleChanges = current.style ? {} : initialStyle(current, source, colourProperty, layerType)
      if (!cancelled) dispatch({ type: 'UPDATE_ADDED_DATASET', payload: { datasetName: current.name, changes: { fields, layerType, ...styleChanges } } })
    })()
    return () => { cancelled = true }
  }, [profiled, features, dispatch])
}

function colourProperty(style: DatasetStyle | undefined): string | undefined {
  return style?.renderer.kind === 'featureColour' ? style.renderer.property : undefined
}

/** Features with values coerced to their profiled types and tagged with the dataset name for click handling. */
export function useRenderableFeatures(dataset: Dataset, featureCollection: FeatureCollection | null): FeatureCollection | null {
  const { fields, name } = dataset
  const colourField = colourProperty(dataset.style)
  return React.useMemo(() => {
    if (!featureCollection) return null
    const normalise = propertyNormaliser(fields ?? [], colourField)
    const extras = { datasetName: name }
    return {
      type: 'FeatureCollection',
      features: featureCollection.features.map(feature => ({ ...feature, properties: normalise(feature.properties ?? {}, extras) })),
    }
  }, [featureCollection, fields, colourField, name])
}
