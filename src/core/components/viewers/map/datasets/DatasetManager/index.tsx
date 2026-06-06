"use client"

// Dependencies
import * as React from 'react'
import { useTranslations } from 'next-intl'
import { MapContext, DatasetsContext } from '../../../../../store'
import { Command, Menubar, Badge, Button, Switch } from '../../../../../components/ui/'
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '../../../../../components/ui/Table'
import { FieldsTable } from './src/FieldsTable'
import * as LR from 'lucide-react'
import type { Dataset, BuildingDataset as RawBuildingDataset } from '../../../../../types/datasetTypes'
import { ClusterManager } from '../../utils/ClusterManager'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSidebar } from '../../../../ui/Sidebar'

type BuildingDataset = RawBuildingDataset & Dataset

// Type guard to check if dataset is a building dataset
const isBuildingDataset = (dataset: Dataset): dataset is BuildingDataset =>
  dataset.type === 'buildings' && 'data' in dataset

interface SortableTableRowProps {
  dataset: Dataset
  onToggleDataset: (dataset: Dataset) => void
  openDatasetDetails: (datasetName: string) => void
  expandedDatasets: Set<string>
}

const SortableTableRow: React.FC<SortableTableRowProps> = ({
  dataset,
  onToggleDataset,
  openDatasetDetails,
  expandedDatasets,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dataset.name })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Raster (WMS) layers are server-rendered images with no fields and a server-fixed
  // colour ramp, so the field-styling table + colour swatch are meaningless — hide them.
  const isRaster = dataset.datasetType === 'WMS' || dataset.type === 'WMS'

  return (
    <>
      <TableRow ref={setNodeRef} style={style} className="hover:bg-muted/50">
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <LR.GripVertical className="h-4 w-4" />
            </Button>
            <Switch
              checked={dataset.visible !== false}
              onCheckedChange={() => onToggleDataset(dataset)}
              className="shrink-0"
              style={dataset.visible === false || isRaster ? {} : { backgroundColor: dataset.layerColor.color }}
            />
          </div>
        </TableCell>
        <TableCell className="font-medium">
          {dataset.name.replaceAll('_', ' ')}
          {dataset.total && (
            <Badge variant="outline" className="ml-2 text-xs">
              {dataset.total}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          {!isRaster && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openDatasetDetails(dataset.name)}
              className="shrink-0"
            >
              <LR.ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${expandedDatasets.has(dataset.name) ? 'rotate-180' : ''}`}
              />
            </Button>
          )}
        </TableCell>
      </TableRow>
      {!isRaster && expandedDatasets.has(dataset.name) && (
        <TableRow>
          <TableCell colSpan={4} className="p-0 pb-1">
            <FieldsTable
              dataset={dataset}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export default function DatasetManagerMenu() {
  // Translation
  const t = useTranslations('DatasetManagerMenu')

  const { state: mapState, dispatch: mapDispatch } = React.useContext(MapContext)
  const { map } = mapState.map

  const { state: datasetState, dispatch: datasetDispatch } = React.useContext(DatasetsContext)
  const { addedDatasets } = datasetState.datasets

  const [open, setOpen] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [expandedDatasets, setExpandedDatasets] = React.useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const sortedDatasets = React.useMemo(() => {
    const datasetsWithOrder = addedDatasets.map((dataset, index) => ({
      ...dataset,
      order: dataset.order !== undefined ? dataset.order : addedDatasets.length - 1 - index,
    }))

    return datasetsWithOrder.sort((a, b) => (b.order ?? 0) - (a.order ?? 0))
  }, [addedDatasets])

  React.useEffect(() => {
    if (!map || !addedDatasets) return

    const clusterManager = new ClusterManager(map)

    const sortedDatasets = [...addedDatasets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    for (const dataset of sortedDatasets) {
      if (isBuildingDataset(dataset)) {
        if (dataset.visible === false) {
          clusterManager.remove(dataset.name)
        }
        else {
          clusterManager.create(dataset)
          clusterManager.toggleVisibility(dataset.name, true)
        }
      }
    }
  }, [map, addedDatasets])

  // Remove clusters for datasets no longer present
  const previousNamesRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    if (!map) return
    const clusterManager = new ClusterManager(map)
    const currentNames = new Set(
      addedDatasets.filter(isBuildingDataset).map(ds => ds.name),
    )
    const removedNames = [...previousNamesRef.current].filter(
      name => !currentNames.has(name),
    )
    for (const datasetName of removedNames) {
      clusterManager.remove(datasetName)
    }
    previousNamesRef.current = currentNames
  }, [map, addedDatasets])

  const onToggle = () => setOpen(!open)

  const onToggleDataset = (dataset: Dataset) => {
    const datasetId = dataset.id;
    datasetDispatch({ type: 'TOGGLE_DATASET_VISIBILITY', payload: { datasetId } })
  }

  const toggleDatasetExpansion = (datasetName: string) => {
    setExpandedDatasets((prev) => {
      const newSet = new Set(prev)
      newSet.has(datasetName) ? newSet.delete(datasetName) : newSet.add(datasetName)
      return newSet
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const displayOrder = [...sortedDatasets]

      const oldIndex = displayOrder.findIndex(dataset => dataset.name === active.id)
      const newIndex = displayOrder.findIndex(dataset => dataset.name === over.id)

      const reorderedDisplay = arrayMove(displayOrder, oldIndex, newIndex)
      const maxOrder = reorderedDisplay.length - 1
      const reorderedDatasets = reorderedDisplay.map((dataset, index) => ({
        ...dataset,
        order: maxOrder - index,
      }))

      datasetDispatch({
        type: 'REORDER_DATASETS',
        payload: { reorderedDatasets }
      })
    }
  }

  const openAnimation = `
    pointer-events-auto 
    transform 
    transition-all 
    duration-200
    data-[state=open]:animate-in 
    data-[state=closed]:animate-out 
    data-[state=closed]:fade-out-0 
    data-[state=open]:fade-in-0 
    data-[state=closed]:zoom-out-95 
    data-[state=open]:zoom-in-95
  `

  React.useEffect(() => {
    setMenuOpen(addedDatasets.length > 0)
  }, [addedDatasets.length])

  const openDatasetDetails = (datasetName: string) => {
    toggleDatasetExpansion(datasetName)
  }

  const {openInfo} = useSidebar()

  return (
    <>
      {!openInfo && addedDatasets.length > 0 && (
        <div data-state={menuOpen ? 'open' : 'closed'} className={openAnimation}>
          <Menubar className="pointer-events-auto w-96 h-auto">
            <Command>
              <div>
                <div className={`flex items-center justify-between gap-3 ${open ? 'p-3' : 'pl-1 py-0'}`}>
                  <div className="flex items-center gap-2">
                    <Badge>{addedDatasets.length}</Badge>
                    <div className="text-sm font-medium">
                      {t('appliedLayer')}
                      {addedDatasets.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
                  >
                    <LR.ChevronUp
                      size={14}
                      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                  </Button>
                </div>
                {open && (
                  <div className="max-h-[40vh] overflow-y-auto">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={sortedDatasets.map(dataset => dataset.name)}
                        strategy={verticalListSortingStrategy}
                      >
                        <Table>
                          <TableBody>
                            {sortedDatasets.map((dataset) => (
                              <SortableTableRow
                                key={dataset.name}
                                dataset={dataset}
                                onToggleDataset={onToggleDataset}
                                openDatasetDetails={openDatasetDetails}
                                expandedDatasets={expandedDatasets}
                              />
                            ))}
                          </TableBody>
                        </Table>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            </Command>
          </Menubar>
        </div>
      )}
    </>
  )
}
