"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import { useTranslations, useLocale } from 'next-intl'
import * as React from 'react'

// Shadcn components
import { Checkbox, Input, LoadingSpinner } from '../../../../../../components/ui/'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../../../components/ui/Table'
import { DatasetsContext } from '../../../../../../store'
import { formatName } from '../../utils'

import type { ColorType, Dataset, DatasetField } from '../../../../../../types/datasetTypes'

interface FieldsTableProps {
  dataset: Dataset
}

export function FieldsTable({ dataset }: FieldsTableProps) {
  const t = useTranslations('FieldsTable')
  const locale = useLocale()
  const datasetId = dataset.id
  const { dispatch: datasetDispatch } = React.useContext(DatasetsContext)

  const [fields, setFields] = React.useState<DatasetField[]>([])
  const [loading, setLoading] = React.useState(false)
  const [fieldColors, setFieldColors] = React.useState<Record<string, { single?: string; min?: string; max?: string }>>({})
  const [selectedField, setSelectedField] = React.useState<string>('All features')

  const getEffectiveColor = (fieldName: string, colorType: 'min' | 'max' | 'single') => {
    const userColor = fieldColors[fieldName]?.[colorType]
    if (userColor) return userColor
    if (colorType === 'single') return dataset.layerColor.color
    if (colorType === 'min') return dataset.layerColor.minColor || dataset.layerColor.color
    if (colorType === 'max') return dataset.layerColor.maxColor || dataset.layerColor.color
    return '#cccccc'
  }

  const onSelectingField = (field: DatasetField) => {
    datasetDispatch({ type: 'SET_SELECTED_FIELD', payload: { datasetName: dataset.name, fieldName: field.name } })
    setSelectedField(field.name)
  }

  const debouncedDispatchRef = React.useRef<NodeJS.Timeout | null>(null)
  const handleColorChange = React.useCallback((fieldName: string, color: string, colorType: 'single' | 'min' | 'max') => {
    setFieldColors(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], [colorType]: color },
    }))
    if (fieldName === selectedField) {
      if (debouncedDispatchRef.current) clearTimeout(debouncedDispatchRef.current)
      debouncedDispatchRef.current = setTimeout(() => {
        const layerColor = {
          ...dataset.layerColor,
          ...(colorType === 'single' && { color }),
          ...(colorType === 'min' && { minColor: color }),
          ...(colorType === 'max' && { maxColor: color }),
        }
        datasetDispatch({ type: 'DATASET_COLOR', payload: { datasetId, layerColor } })
        datasetDispatch({ type: 'SET_FIELD_COLOR', payload: { datasetName: dataset.name, fieldName: fieldName, layerColor } })
      }, 200)
    }
  }, [selectedField, dataset.layerColor, datasetId, datasetDispatch])

  React.useEffect(() => () => { if (debouncedDispatchRef.current) clearTimeout(debouncedDispatchRef.current) }, [])

  const filteredFields = React.useMemo<DatasetField[]>(() => {
    const result: DatasetField[] = fields.filter(field => {
      const t = (field as any).type
      if (t === 'id') return false
      const key = field.name || 'unnamed'
      const lowerKey = key.toLowerCase()
      const coordinateKeys = ['globalid', 'latitude', 'lat', 'longitude', 'lng', 'lon', 'coordinates', 'coordina', 'x', 'y', 'z']
      if (coordinateKeys.includes(lowerKey)) return false
      const hasIdWord = /(^|[\s_-])id($|[\s_-])/i.test(lowerKey) || lowerKey.endsWith('id')
      if (hasIdWord) return false
      if (locale === 'En') {
        const fr = ['fr', 'fre', 'french']
        const es = ['es', 'esp', 'spanish']
        if (fr.some(ind => lowerKey === ind || lowerKey.endsWith(`_${ind}`) || lowerKey.startsWith(`${ind}_`))) return false
        if (es.some(ind => lowerKey === ind || lowerKey.endsWith(`_${ind}`) || lowerKey.startsWith(`${ind}_`))) return false
      } else if (locale === 'Fr') {
        const en = ['en', 'eng', 'engl', 'english']
        const es = ['es', 'esp', 'spanish']
        if (en.some(ind => lowerKey === ind || lowerKey.endsWith(`_${ind}`) || lowerKey.startsWith(`${ind}_`))) return false
        if (es.some(ind => lowerKey === ind || lowerKey.endsWith(`_${ind}`) || lowerKey.startsWith(`${ind}_`))) return false
      } else if (locale === 'Es') {
        const en = ['en', 'eng', 'engl', 'english']
        const fr = ['fr', 'fre', 'french']
        if (en.some(ind => lowerKey === ind || lowerKey.endsWith(`_${ind}`) || lowerKey.startsWith(`${ind}_`))) return false
        if (fr.some(ind => lowerKey === ind || lowerKey.endsWith(`_${ind}`) || lowerKey.startsWith(`${ind}_`))) return false
      }
      return true
    })
    if (!result.some(f => (f as any).name === 'All features')) {
      // Insert All features synthetic row with explicit colorType so it can show a single color picker
      result.unshift({ name: 'All features', type: 'single', colorType: 'single' } as any)
    }
    return result
  }, [fields, locale])

  // Simple categorization relying solely on pre-inferred field.type (includes 'datetime')
  const colorType = (field: DatasetField): 'single' | 'minMax' | 'boolean' => {
    const t = typeof field.type === 'string' ? field.type.toLowerCase() : field.type
    if (t === 'number' || t === 'datetime') return 'minMax'
    if (t === 'boolean') return 'boolean'
    return 'single'
  }

  interface RowConfig {
    showMinMax?: boolean
    showSingleColor?: boolean
    selectable: boolean
    minLabel?: string
    maxLabel?: string
  }

  const buildConfig = (rowCat: ColorType): RowConfig => {
    switch (rowCat) {
      case 'single': return { showSingleColor: true, selectable: true }
      case 'minMax': return { showMinMax: true, selectable: true, minLabel: 'min', maxLabel: 'max' }
      case 'boolean': return { showMinMax: true, selectable: true, minLabel: 'No', maxLabel: 'Yes' }
      default: return { selectable: true }
    }
  }

  const renderColorControls = (field: DatasetField, rowConfig: RowConfig, isSelected: boolean) => {
    if (!isSelected) return null
    if (rowConfig.showSingleColor) {
      return (
        <div className="flex gap-1">
          <div className="w-5 h-5 rounded-md overflow-hidden border border-gray-300 shadow-sm">
            <Input
              type="color"
              value={getEffectiveColor(field.name, 'single')}
              onChange={e => handleColorChange(field.name, e.target.value, 'single')}
              className="w-full h-full p-0 border-0 cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-none"
              title={t('fieldColor')}
            />
          </div>
        </div>
      )
    }
  if (rowConfig.showMinMax) {
      return (
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1">
            {rowConfig.minLabel && <span className="text-xs text-muted-foreground">{rowConfig.minLabel}</span>}
            <div className="w-5 h-5 rounded-sm overflow-hidden border border-gray-300 shadow-sm">
              <Input
                type="color"
                value={getEffectiveColor(field.name, 'min')}
                onChange={e => handleColorChange(field.name, e.target.value, 'min')}
                className="w-full h-full p-0 border-0 cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-none"
                title={rowConfig.minLabel}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {rowConfig.maxLabel && <span className="text-xs text-muted-foreground">{rowConfig.maxLabel}</span>}
            <div className="w-5 h-5 rounded-sm overflow-hidden border border-gray-300 shadow-sm">
              <Input
                type="color"
                value={getEffectiveColor(field.name, 'max')}
                onChange={e => handleColorChange(field.name, e.target.value, 'max')}
                className="w-full h-full p-0 border-0 cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-none"
                title={rowConfig.maxLabel}
              />
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  React.useEffect(() => {
    let mounted = true
    if (!dataset.getFields) setFields(dataset.fields || [])
    async function fetchFields() {
      setLoading(true)
      if (dataset && typeof dataset.getFields === 'function') {
        const result = await dataset.getFields()
        const datasetFields: DatasetField[] = result.map(f => ({
          name: f.name,
          datasetName: dataset.name,
          colorType: colorType(f),
          type: f.type,
          layerColor: dataset.layerColor,
          selected: false
        }))
        datasetDispatch({ type: 'SET_DATASET_FIELDS', payload: { datasetName: dataset.name, datasetFields } })
        if (mounted && Array.isArray(result)) setFields(datasetFields)
      }
      if (mounted) setLoading(false)
    }
    fetchFields()
    return () => { mounted = false }
  }, [dataset.name])

  React.useEffect(() => {
    if (selectedField === 'All features') {
      const allField = filteredFields.find(f => f.name === 'All features')
      if (allField) onSelectingField(allField as DatasetField)
    }
  }, [filteredFields, selectedField, dataset.name])

  return (
    <div className="mt-4">
      {loading ? (
        <div className="flex items-center gap-2 py-4 justify-center">
          <LoadingSpinner />
          <span className="text-sm">{t('loadingText')}</span>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="w-16 text-xs"></TableHead>
              <TableHead className="text-xs">{t('fieldName')}</TableHead>
              <TableHead className="text-xs">{t('color')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFields.map(field => {
              const fieldColorType = field.colorType
              const rowConfig = buildConfig(fieldColorType as any)
              // Override: only show single color picker for the synthetic 'All features' row
              if (fieldColorType === 'single') {
                rowConfig.showSingleColor = field.name === 'All features'
              }
              const isSelected = selectedField === field.name
              const colorControls = renderColorControls(field, rowConfig, isSelected)
              return (
                <TableRow key={field.name} className="h-8">
                  <TableCell className="py-2">
                    {rowConfig.selectable && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onSelectingField(field)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-sm">{formatName(field.name)}</TableCell>
                  <TableCell className="py-2">{colorControls}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
