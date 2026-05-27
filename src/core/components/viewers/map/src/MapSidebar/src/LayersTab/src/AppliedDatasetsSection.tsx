'use client'

import * as React from 'react'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { DatasetsContext } from '../../../../../../../../store'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { Badge } from '../../../../../../../ui/Badge'
import { Button } from '../../../../../../../ui/Button'
import { Switch } from '../../../../../../../ui/Switch'
import { FieldsTable } from '../../../../../datasets/DatasetManager/src/FieldsTable'
import type { Dataset } from '../../../../../../../../types/datasetTypes'

interface SortableRowProps {
  dataset: Dataset
  expanded: boolean
  onToggle: (dataset: Dataset) => void
  onExpand: (name: string) => void
  onRemove: (dataset: Dataset) => void
}

function SortableRow({ dataset, expanded, onToggle, onExpand, onRemove }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dataset.name,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const switchColor = dataset.visible === false ? undefined : dataset.layerColor?.color

  return (
    <div ref={setNodeRef} style={style} className="rounded-md hover:bg-accent/30">
      <div className="flex items-center gap-2 py-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <LR.GripVertical className="h-3.5 w-3.5" />
        </Button>
        <Switch
          checked={dataset.visible !== false}
          onCheckedChange={() => onToggle(dataset)}
          className="shrink-0"
          style={switchColor ? { backgroundColor: switchColor } : undefined}
        />
        <span className="flex-1 min-w-0 text-sm truncate">
          {dataset.name.replaceAll('_', ' ')}
        </span>
        {typeof dataset.total === 'number' && (
          <Badge variant="outline" className="text-xs shrink-0">
            {dataset.total}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(dataset)}
          className="h-6 w-6 shrink-0"
          title="Remove from map"
        >
          <LR.X className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onExpand(dataset.name)}
          className="h-6 w-6 shrink-0"
        >
          <LR.ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </Button>
      </div>
      {expanded && (
        <div className="pl-2 pb-2">
          <FieldsTable dataset={dataset} />
        </div>
      )}
    </div>
  )
}

export function AppliedDatasetsSection() {
  const t = useTranslations('LayersTab')

  const { state: datasetState, dispatch: datasetDispatch } = React.useContext(DatasetsContext)
  const { addedDatasets } = datasetState.datasets

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const sortedDatasets = React.useMemo(() => {
    const withOrder = addedDatasets.map((dataset, index) => ({
      ...dataset,
      order: dataset.order !== undefined ? dataset.order : addedDatasets.length - 1 - index,
    }))
    return withOrder.sort((a, b) => (b.order ?? 0) - (a.order ?? 0))
  }, [addedDatasets])

  const toggleExpansion = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const onToggle = (dataset: Dataset) => {
    if (!dataset.id) return
    datasetDispatch({ type: 'TOGGLE_DATASET_VISIBILITY', payload: { datasetId: dataset.id } })
  }

  const onRemove = (dataset: Dataset) => {
    if (!dataset.id) return
    datasetDispatch({ type: 'REMOVE_DATASET_FROM_MAP', payload: { datasetId: dataset.id } })
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const display = [...sortedDatasets]
    const oldIndex = display.findIndex(d => d.name === active.id)
    const newIndex = display.findIndex(d => d.name === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(display, oldIndex, newIndex)
    const maxOrder = reordered.length - 1
    const reorderedDatasets = reordered.map((dataset, index) => ({
      ...dataset,
      order: maxOrder - index,
    }))
    datasetDispatch({ type: 'REORDER_DATASETS', payload: { reorderedDatasets } })
  }

  const allVisible = addedDatasets.length > 0 && addedDatasets.every(d => d.visible !== false)
  const switchVariant = addedDatasets.length === 0
    ? undefined
    : {
        checked: allVisible,
        onCheckedChange: (checked: boolean) => {
          addedDatasets.forEach((d) => {
            if (!d.id) return
            const isOn = d.visible !== false
            if (isOn !== checked) {
              datasetDispatch({ type: 'TOGGLE_DATASET_VISIBILITY', payload: { datasetId: d.id } })
            }
          })
        },
      }

  return (
    <CollapsibleSection
      title={t('appliedDatasetsTitle')}
      icon={LR.Layers}
      itemCount={addedDatasets.length}
      switchVariant={switchVariant}
    >
      {addedDatasets.length === 0 ? (
        <div className="text-xs text-muted-foreground px-1 py-2">
          {t('appliedDatasetsEmpty')}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={sortedDatasets.map(d => d.name)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {sortedDatasets.map(dataset => (
                <SortableRow
                  key={dataset.name}
                  dataset={dataset}
                  expanded={expanded.has(dataset.name)}
                  onToggle={onToggle}
                  onExpand={toggleExpansion}
                  onRemove={onRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </CollapsibleSection>
  )
}
