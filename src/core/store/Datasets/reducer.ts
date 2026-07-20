// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Dataset, DatasetField, LayerColors } from '../../types/datasetTypes'
import type { ActionMap } from '../ActionMap'

interface DatasetsType {
  dataset: Dataset | null
  datasetId: string | null
  datasets: Dataset[]
  addedDatasets: Dataset[]
  orgRefreshNonce: number
}

export type DatasetState = DatasetsType

export type DatasetPayload = {
  ['SET_DATASETS']: Pick<DatasetState, 'datasets'>
  ['ADD_DATASET']: Pick<DatasetState, 'dataset'>

  ['HIDE_DATASET_BY_ID']: Pick<DatasetState, 'datasetId'>
  ['UNHIDE_DATASET_BY_ID']: Pick<DatasetState, 'datasetId'>

  ['ADD_DATASET_TO_MAP']: Pick<DatasetState, 'dataset'>
  ['REMOVE_DATASET_FROM_MAP']: Pick<DatasetState, 'datasetId'>

  ['REMOVE_ALL_DATASETS']: void
  ['REFRESH_ORG_DATASETS']: void
  ['TOGGLE_DATASET_VISIBILITY']: Pick<DatasetState, 'datasetId'>

  ['DATASET_COLOR']: { datasetId: string, layerColor: LayerColors  }

  ['SET_DATASET_FIELDS']: { datasetName: string, datasetFields: DatasetField[]}
  ['SET_SELECTED_FIELD']: { datasetName: string, fieldName: string }
  ['SET_FIELD_COLOR']: { datasetName: string, fieldName: string, layerColor: LayerColors }

  ['REORDER_DATASETS']: { reorderedDatasets: Dataset[] }
}

export type DatasetActions
  = ActionMap<DatasetPayload>[keyof ActionMap<DatasetPayload>]

export const DatasetReducer = (state: DatasetState, action: DatasetActions) => {
  switch (action.type) {
    // system or map or bim viewer file action
    case 'SET_DATASETS':
      const { datasets } = action.payload
      return {
        ...state,
        datasets: datasets,
      }
    case 'ADD_DATASET':
      const { dataset } = action.payload
      return {
        ...state,
        datasets: [...state.datasets, dataset],
      }
    case 'HIDE_DATASET_BY_ID':
      const { datasetId: datasetIdToHide } = action.payload
      return {
        ...state,
        datasets: state.datasets.map((dataset) => {
          return dataset.id == datasetIdToHide
            ? {
                ...dataset,
                visible: false,
              }
            : dataset
        }),
      }
    case 'UNHIDE_DATASET_BY_ID':
      const { datasetId: datasetIdToShow } = action.payload
      return {
        ...state,
        datasets: state.datasets.map((dataset) => {
          return dataset.id == datasetIdToShow
            ? {
                ...dataset,
                visible: true,
              }
            : dataset
        }),
      }

    case 'ADD_DATASET_TO_MAP':
      const { dataset: datasetToAdd } = action.payload
      const datasetAlreadyAdded = state.addedDatasets.some(
        d => d?.name === datasetToAdd.name,
      )

      const addedDatasets = datasetAlreadyAdded
        ? state.addedDatasets
        : (() => {
            const maxOrder = state.addedDatasets.reduce<number>((max, current) => {
              const order = current.order ?? -1
              return order > max ? order : max
            }, -1)

            const nextOrder = maxOrder + 1

            return [...state.addedDatasets, { ...datasetToAdd, order: nextOrder }]
          })()
      return {
        ...state,
        dataset: datasetToAdd,
        addedDatasets,
      }
    case 'REMOVE_DATASET_FROM_MAP':
      const datasetIdToRemove = action.payload.datasetId
      const remaining = state.addedDatasets.filter(dataset => dataset.id !== datasetIdToRemove)
      const sorted = remaining.sort((a, b) => (b.order ?? 0) - (a.order ?? 0))
      const maxOrder = sorted.length - 1
      const updatedAddedDatasets = sorted.map((dataset, index) => ({
        ...dataset,
        order: maxOrder - index
      }))
      return {
        ...state,
        addedDatasets: updatedAddedDatasets,
      }
    case 'REMOVE_ALL_DATASETS':
      return {
        ...state,
        addedDatasets: [],
      }
    case 'REFRESH_ORG_DATASETS':
      return {
        ...state,
        orgRefreshNonce: (state.orgRefreshNonce ?? 0) + 1,
      }
    case 'TOGGLE_DATASET_VISIBILITY': {
      const datasetId = action.payload.datasetId
      const updatedDatasets = state.addedDatasets.map((dataset) => {
        if (dataset.id === datasetId) {
          return { ...dataset, visible: dataset.visible === false ? true : false }
        }
        return dataset
      })
      return {
        ...state,
        addedDatasets: updatedDatasets,
      }
    }

      case 'DATASET_COLOR':
        const { datasetId, layerColor } = action.payload
        return {
          ...state,
          addedDatasets: state.addedDatasets.map((dataset) => {
            if (dataset.id === datasetId) {
              return {
                ...dataset,
                layerColor,
              }
            }
            return dataset
          }),
        }

    case 'SET_DATASET_FIELDS':
      const { datasetName, datasetFields } = action.payload
      return {
        ...state,
        addedDatasets: state.addedDatasets.map(dataset => {
          if (dataset.name === datasetName) {
            return {
              ...dataset,
              fields: datasetFields,
            }
          }
          return dataset
        }),
      }
    case 'SET_SELECTED_FIELD':
      const { datasetName: dsName, fieldName } = action.payload
      return {
        ...state,
        addedDatasets: state.addedDatasets.map(dataset => {
          if (dataset.name === dsName) {
            return {
              ...dataset,
              selectedFieldName: fieldName,
            }
          }
          return dataset
        }),
      }
    case 'SET_FIELD_COLOR':
      const { datasetName: dName, fieldName: fName, layerColor: lColor } = action.payload
      console.log('SETTING FIELD COLOR IN REDUCER FOR DATASET:', dName, 'FIELD:', fName, 'TO COLOR:', lColor)
      return {
        ...state,
        addedDatasets: state.addedDatasets.map(dataset => {
          if (dataset.name === dName) {
            return {
              ...dataset,
              fields: dataset.fields.map(field => {
                if (field.name === fName) {
                  return {
                    ...field,
                    layerColor: lColor,
                  }
                }
                return field
              }),
            }
          }
          return dataset
        }),
      }

    case 'REORDER_DATASETS':
      const { reorderedDatasets } = action.payload
      return {
        ...state,
        addedDatasets: reorderedDatasets,
      }

    default:
      console.log('THIS FILE ACTION HASN\'T BEEN IMPLEMENTED YET.')
      return state
  }
}
