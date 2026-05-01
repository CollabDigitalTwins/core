"use client"

// Dependencies
import React from 'react'
import { usePermissions } from '../../../../store'

// Utility functions
import { handleFavouriteDataset } from './utils'

// Shadcn Components
import { Checkbox, Button } from '../../../ui/'

// Icons
import * as LR from 'lucide-react'
import { DatasetsContext } from '../../../../store'
import type { Dataset } from '../../../../types/datasetTypes'

interface RowActionsProps {
  dataset: Dataset
  favouriteDatasets: Dataset[]
  setFavouriteDatasets: React.Dispatch<React.SetStateAction<Dataset[]>>
}

export default function RowActions({
  dataset,
  favouriteDatasets,
  setFavouriteDatasets,
}: RowActionsProps) {
  // Permissions
  const { ability } = usePermissions()


  const { state: datasetsState, dispatch: datasetsDispatch } = React.useContext(DatasetsContext)
  const { addedDatasets } = datasetsState.datasets

  // const [checked, setChecked] = useState(false);

  // Check if this specific dataset is in favourites
  const isFavourite = favouriteDatasets.some(item => item.name === dataset.name)

  // derive instead of local state
  const checked
    = dataset.type === 'Organizational'
      ? dataset.visible
      : addedDatasets.some(d => d.name === dataset.name)

  const handleApplyDataset = () => {
    if (!dataset) {
      console.error('No dataset provided in RowActions')
      return
    }

    // LOGIC FOR ONLY ORGANIZATIONAL DATASET FOR NOW
    if (dataset.type == 'Organizational') {
      const datasetId = dataset.id
      if (dataset.visible) {
        datasetsDispatch({ type: 'HIDE_DATASET_BY_ID', payload: { datasetId } })
      }
      else {
        datasetsDispatch({ type: 'UNHIDE_DATASET_BY_ID', payload: { datasetId } })
      }
      return
    }

    // Trigger checkbox
    const isAdded = addedDatasets.some(d => d.name === dataset.name)
    // setChecked(isAdded);

    // TODO: Dataset action logic
    if (isAdded) {
      datasetsDispatch({
        type: 'REMOVE_DATASET_FROM_MAP',
        payload: { datasetId: dataset.id },
      })
    }
    else {
      datasetsDispatch({
        type: 'ADD_DATASET_TO_MAP',
        payload: { dataset: dataset },
      })
    }
  }

  const handleFavourite = handleFavouriteDataset(dataset, favouriteDatasets, setFavouriteDatasets)

  return (
    <div className="flex items-center">
      <Button
        size="icon"
        variant="ghost"
        // onClick={handleApplyDataset}
        className=" hover:bg-transparent"
        disabled={!ability.can('read', 'File')}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={() => {
            handleApplyDataset()
          }}
          className="opacity-70 hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity duration-200"
        />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={`opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent ${isFavourite ? 'opacity-100' : ''}`}
        onClick={handleFavourite}
        disabled={!ability.can('read', 'File')}
      >
        <LR.Star
          color={`${isFavourite ? 'hsl(var(--chart-5))' : 'black'} `}
          fill={`${isFavourite ? 'hsl(var(--chart-5))' : 'none'} `}
        />
      </Button>
    </div>
  )
}
