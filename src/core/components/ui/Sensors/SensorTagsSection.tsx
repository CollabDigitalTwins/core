'use client'

import * as React from 'react'
import { Button } from '../Button'
import { Badge } from '../Badge'
import { Input } from '../Input'
import * as LR from 'lucide-react'
import { stringToColour } from '../../viewers/map/utils/stringToColour'

export interface SensorTagsTranslations {
  addTag?: string
  removeTag?: string
  cancel?: string
  newTagPlaceholder?: string
}

const DEFAULT_TRANSLATIONS: Required<SensorTagsTranslations> = {
  addTag: 'Add tag',
  removeTag: 'Remove tag',
  cancel: 'Cancel',
  newTagPlaceholder: 'New tag…',
}

interface SensorTagsSectionProps {
  tags: string[]
  variant?: 'edit' | 'read-only'
  onAdd?: (tag: string) => Promise<void>
  onDelete?: (tag: string) => Promise<void>
  translations?: SensorTagsTranslations
}

export function SensorTagsSection({ tags, variant = 'edit', onAdd, onDelete, translations }: SensorTagsSectionProps) {
  const tr = { ...DEFAULT_TRANSLATIONS, ...translations }
  const [addingTag, setAddingTag] = React.useState(false)
  const [newTagValue, setNewTagValue] = React.useState('')

  const handleAdd = async () => {
    const trimmed = newTagValue.trim()
    if (!trimmed || !onAdd) return
    if (tags.includes(trimmed)) return
    await onAdd(trimmed)
    setNewTagValue('')
    setAddingTag(false)
  }

  if (variant === 'read-only') {
    if (tags.length === 0) return null
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-t flex-wrap">
        <span className="text-muted-foreground text-sm">Tags:</span>
        {tags.map((tag, index) => {
          const tagColor = stringToColour(tag, 'max')
          return (
            <Badge key={index} variant="secondary" className="text-xs" style={{ backgroundColor: tagColor, color: 'white' }}>
              {tag}
            </Badge>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t flex-wrap">
      <span className="text-muted-foreground text-sm">Tags:</span>
      {tags.length > 0 && (
        <>
          {tags.map((tag, index) => {
            const tagColor = stringToColour(tag, 'max')
            return (
              <Badge key={index} variant="secondary" className="text-xs" style={{ backgroundColor: tagColor, color: 'white' }}>
                {tag}{' '}
                {onDelete && (
                  <span title={tr.removeTag}>
                    <LR.X
                      className="h-3 w-3 cursor-pointer ml-2 -mr-1"
                      onClick={() => onDelete(tag)}
                    />
                  </span>
                )}
              </Badge>
            )
          })}
        </>
      )}
      {onAdd && (
        addingTag ? (
          <div className="flex items-center gap-1 ml-auto">
            <Input
              autoFocus
              value={newTagValue}
              onChange={e => setNewTagValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setAddingTag(false); setNewTagValue('') }
              }}
              placeholder={tr.newTagPlaceholder}
              className="h-6 text-xs w-28 px-2"
            />
            <Button title={tr.addTag} variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={handleAdd}>
              <LR.Plus className="h-3 w-3" />
            </Button>
            <Button title={tr.cancel} variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={() => { setAddingTag(false); setNewTagValue('') }}>
              <LR.X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button title={tr.addTag} variant="ghost" size="icon" className="h-6 w-6 p-0 ml-auto" onClick={() => setAddingTag(true)}>
            <LR.Plus className="h-3 w-3" />
          </Button>
        )
      )}
    </div>
  )
}
