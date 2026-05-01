'use client'
import * as React from 'react'
import {
  LayerProps,
} from 'react-map-gl/maplibre'
import { DatasetsContext } from '../../../../../../../store'
import { useTranslations } from 'next-intl'

// Sahadcn Components
import { Button, Input, Label } from '../../../../../../ui/'

import {
  Table,
  TableCell,
  TableRow,
} from '../../../../../../ui/Table'

// Icons
import * as LR from 'lucide-react'
import type { Dataset } from '../../../../../../../types/datasetTypes'
import { layerColorByName } from '../../../../utils/stringToColour'
import type { AllGeoJSON } from '@turf/turf'
import { DatasetGroup } from '../../../../../../../types/dbTypes'

const getPointLayerProps = (sourceID: string, layerStyles): LayerProps => ({
  id: `${sourceID}-points`,
  type: 'circle',
  filter: ['in', '$type', 'Point'],
  paint: {
    ...layerStyles, // override default values
  },
})

const getLineLayerProps = (sourceID: string, layerStyles): LayerProps => ({
  id: `${sourceID}-lines`,
  type: 'line',
  source: 'all-geometries',
  filter: ['in', '$type', 'LineString'],
  paint: {
    ...layerStyles,
  },
})

const getPolygonLayerProps = (sourceID: string, layerStyles): LayerProps => ({
  id: `${sourceID}-polygons`,
  type: 'fill',
  source: 'all-geometries',
  filter: ['in', '$type', 'Polygon'],
  paint: {
    ...layerStyles,
  },
})

enum GeojsonGeometry {
  LINES = 'lines',
  POLYGONS = 'polygons',
  POINTS = 'points',
}

export const DatasetAdder = () => {
  // Translation
  const t = useTranslations('DatasetAdder')

  const [selectedFile, setSelectedFile] = React.useState(null)
  const [geometryTypeSelected, setGeometryTypeSelected] = React.useState(null)
  const { state: datasetState, dispatch: datasetDispatch } = React.useContext(DatasetsContext)
  const { datasets } = datasetState.datasets

  // at the top of your component
  const [layerStyles, setLayerStyles] = React.useState({
    lineLayerStyle: {
      'line-color': '#0d9488',
      'line-width': 4,
    },
    pointLayerStyle: {
      'circle-color': '#0d9488',
      'circle-radius': 8,
    },
    polygonLayerStyle: {
      'fill-color': '#0d9488',
      'fill-opacity': 0.8,
    },
  })

  // handle the file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  // //how to read the file
  // React.useEffect(() => {
  //   if (selectedFile) {
  //     const reader = new FileReader();
  //     reader.onload = (event) => {
  //       try {
  //         const json = JSON.parse(event.target?.result as string);
  //         console.log("Parsed JSON:", json);
  //       } catch (e) {
  //         console.error("Invalid JSON file", e);
  //       }
  //     };
  //     reader.readAsText(selectedFile);
  //   }
  // }, [selectedFile]);

  const handleAddDataset = () => {
    if (!selectedFile) return
    if (!geometryTypeSelected) return

    let layerConstructor, styleConstructor
    if (geometryTypeSelected === GeojsonGeometry.LINES) {
      layerConstructor = getLineLayerProps
      styleConstructor = layerStyles.lineLayerStyle
    }
    else if (geometryTypeSelected === GeojsonGeometry.POINTS) {
      layerConstructor = getPointLayerProps
      styleConstructor = layerStyles.pointLayerStyle
    }
    else {
      layerConstructor = getPolygonLayerProps
      styleConstructor = layerStyles.polygonLayerStyle
    }

    const newDatasetURL = URL.createObjectURL(selectedFile)
    const randomID = Math.random() * 10_000_000

    const layerColor = layerColorByName(String(randomID))

    const getFields = async () => {
      return []
    }
    const getFeatures = async (): Promise<AllGeoJSON> => {
      // TODO: Implement actual file reading and parsing logic here
      return {
        type: 'FeatureCollection',
        features: [],
      }
    }

    const newDataset: Dataset = {
      id: String(randomID),
      name: 'Test adding dataset',
      type: 'Organizational',
      publisher: 'CDT',
      license: 'Unknown',
      contact: 'CDT@cims.ca',
      description:
        'This is a test dataset that is added through the dataset adder',
      dateReleased: 'Today',
      dateUpdated: 'Today',
      countrySubdivision: '',
      municipality: 'Ottawa',
      sourceUrl: newDatasetURL,
      clickable: true,
      properties: {},
      getFeatures,
      getFields,
      dataManagementSystem: 'other',
      datasetType: 'GeoJSON',
      group: DatasetGroup.Organizational,
      layerColor,
    }

    datasetDispatch({ type: 'ADD_DATASET', payload: { dataset: newDataset } })
    // reset fields
    setSelectedFile(null)
    setGeometryTypeSelected(null)
  }

  // handle style input selection
  const handleChange = (
    geomKey: keyof typeof layerStyles,
    styleName: string,
    rawValue: string | number,
  ) => {
    setLayerStyles({
      ...layerStyles,
      [geomKey]: {
        ...layerStyles[geomKey],
        [styleName]: rawValue,
      },
    })
  }

  return (
    <div className="flex flex-col gap-2 mt-2 pointer-events-auto">
      {!selectedFile && (
        <>
          <Label htmlFor="file-input">{t('fileLabel')}</Label>
          <Input
            id="file-input"
            type="file"
            accept=".geojson,application/geo+json"
            className="cursor-pointer"
            onChange={handleFileSelect}
          >
          </Input>
        </>
      )}

      {selectedFile && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground break-words">
            {t('dataset')}
            {' '}
            &quot;
            <span className="break-all">{selectedFile.name}</span>
            &quot;
            {' '}
            {t('selected')}
          </p>
          {/* Dataset default style setting */}
          <div className="flex flex-row items-start gap-2 items-center">
            <Label htmlFor="layer-type-select">{t('selectLayerLabel')}</Label>
            <select
              id="layer-type-select"
              className="max-w-20 border border-gray-300 rounded p-1 text-sm"
              value={geometryTypeSelected || ''}
              onChange={e =>
                setGeometryTypeSelected(e.target.value as GeojsonGeometry)}
            >
              <option value="" disabled>
                {t('chooseLayerType')}
              </option>
              <option value={GeojsonGeometry.POINTS}>{t('points')}</option>
              <option value={GeojsonGeometry.LINES}>{t('lines')}</option>
              <option value={GeojsonGeometry.POLYGONS}>{t('polygons')}</option>
            </select>
          </div>

          {geometryTypeSelected
            && (
              <div className="w-full flex flex-col items-center">
                <Table>
                  {/* <TableRow className="h-8">
                      <TableHead className="text-xs">Property Name</TableHead>
                      <TableHead className="text-xs">Value</TableHead>
                    </TableRow> */}
                  {(
                    Object.entries(layerStyles) as Array<
                        [
                          keyof typeof layerStyles,
                          Record<string, string | number>,
                        ]
                      >
                  ).filter(
                    ([geomKey, styles]) => {
                      if (geometryTypeSelected == GeojsonGeometry.POINTS) return geomKey == 'pointLayerStyle'
                      else if (geometryTypeSelected == GeojsonGeometry.POLYGONS) return geomKey == 'polygonLayerStyle'
                      else if (geometryTypeSelected == GeojsonGeometry.LINES) return geomKey == 'lineLayerStyle'
                    },
                  )

                    .map(([geomKey, styles]) =>
                      Object.entries(styles).map(([styleName, styleValue]) => {
                        const isColor = styleName.includes('color')
                        return (
                          <TableRow
                            key={`${geomKey}-${styleName}`}
                            className="h-4"
                          >
                            <TableCell className="py-0 text-sm">
                              {styleName}
                            </TableCell>
                            <TableCell>
                              {isColor
                                ? (
                                    <div className="w-5 h-5 rounded-md overflow-hidden border border-gray-300 shadow-sm">
                                      <Input
                                        type="color"
                                        value={styleValue as string}
                                        onChange={e =>
                                          handleChange(
                                            geomKey,
                                            styleName,
                                            e.target.value,
                                          )}
                                        className="
                        w-5 h-5 p-0 border-0 cursor-pointer
                        [&::-webkit-color-swatch-wrapper]:p-0
                        [&::-webkit-color-swatch]:border-0
                        [&::-webkit-color-swatch]:rounded-none
                      "
                                      />
                                    </div>
                                  )
                                : (
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.1}
                                      value={Number(styleValue)}
                                      onChange={e =>
                                        handleChange(
                                          geomKey,
                                          styleName,
                                          Number(e.target.value),
                                        )}
                                      className="w-16 text-sm p-1 border border-gray-300 rounded"
                                    />
                                  )}
                            </TableCell>
                          </TableRow>
                        )
                      }),
                    )}
                </Table>
              </div>
            )}
          <div className="flex gap-1">
            <Button
              disabled={!geometryTypeSelected}
              onClick={() => handleAddDataset()}
              title={geometryTypeSelected ? '' : 'Select layer type to add'}
            >
              {t('addButton')}
            </Button>
            <Button
              onClick={() => {
                setSelectedFile(null)
              }}
            >
              {t('cancelButton')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
