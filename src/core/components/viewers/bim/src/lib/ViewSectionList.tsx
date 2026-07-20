'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import * as LR from 'lucide-react'
import { Button } from '../../../../ui/Button'
import { Switch } from '../../../../ui/Switch'
import type { DrawingLayerInfo } from './drawingLayers'
import type { ViewListEntry, ViewLoadingState } from './viewSection'

interface Props {
  entries: ViewListEntry[]
  activeId: string | null
  /** Id the user just clicked but the tool hasn't activated yet. Lets the
   *  spinner appear on the row immediately, before activeId flips. */
  pendingId: string | null
  loading: ViewLoadingState
  loadingPercent: number
  /** Per-IFC-class layers of the active entry, or null if none. Used to
   *  render the expandable layers panel below the active row. */
  activeLayers: DrawingLayerInfo[] | null
  /** Translated message shown next to the spinner while loading. */
  loadingMessage: string
  /** Translated "Viewing" prefix shown before the entry label when active. */
  viewingPrefix: string
  /** Translated label of the Exit button. */
  exitLabel: string
  /** Translated tooltip for "Go to …". */
  goToLabel: string
  /** Translated tooltip for the download button. */
  downloadLabel: string
  /** Translated tooltip for the layers expand/collapse button. */
  layersLabel: string
  /** Translated tooltip for layer visibility toggle. */
  toggleVisibilityLabel: string
  /** Translated tooltip for the color picker. */
  chooseColorLabel: string
  /** Maps an IFC class name to a friendly translated label
   *  (e.g. "IFCWALL" → "Wall"). */
  friendlyClassName: (className: string) => string
  onSelect: (entry: ViewListEntry) => void
  onExit: () => void
  onDownload: (entry: ViewListEntry, event: React.MouseEvent) => void
  onToggleLayer: (className: string, visible: boolean) => void
  onChangeLayerColor: (className: string, color: number) => void
}

/** Active-card + row list shared by every "view" sidebar section
 *  (floorplans, elevations, …). Localized strings come from the parent —
 *  this component is i18n-agnostic. */
export function ViewSectionList({
  entries,
  activeId,
  pendingId,
  loading,
  loadingPercent,
  activeLayers,
  loadingMessage,
  viewingPrefix,
  exitLabel,
  goToLabel,
  downloadLabel,
  layersLabel,
  toggleVisibilityLabel,
  chooseColorLabel,
  friendlyClassName,
  onSelect,
  onExit,
  onDownload,
  onToggleLayer,
  onChangeLayerColor,
}: Props) {
  const [layersExpanded, setLayersExpanded] = React.useState(false)
  const activeEntry = entries.find((entry) => entry.id === activeId) ?? null
  const isLoading = loading.isLoading
  const targetId = activeId ?? pendingId
  const showCard = !!activeEntry || (isLoading && !!targetId)
  const cardEntry =
    activeEntry ??
    (targetId ? entries.find((e) => e.id === targetId) : null) ??
    null

  // Auto-collapse the layers panel when the active entry changes.
  React.useEffect(() => {
    setLayersExpanded(false)
  }, [activeId])

  return (
    <>
      {showCard && (
        <div className="mb-2 p-2 bg-accent rounded-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {isLoading && (
                <LR.Loader2 className="h-3 w-3 animate-spin flex-shrink-0 text-muted-foreground" />
              )}
              <span className="text-xs truncate">
                {isLoading
                  ? loadingMessage
                  : `${viewingPrefix}: ${cardEntry?.label ?? ''}`}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onExit}
              className="h-6 text-xs px-2"
            >
              <LR.X className="h-3 w-3 mr-1" />
              {exitLabel}
            </Button>
          </div>
          {isLoading && (
            <div className="mt-2 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${loadingPercent}%` }}
              />
            </div>
          )}
        </div>
      )}
      {entries.map((entry) => {
        const isActive = activeId === entry.id
        const isPending =
          isLoading && (pendingId === entry.id || activeId === entry.id)
        const showLayersPanel =
          isActive &&
          layersExpanded &&
          !!activeLayers &&
          activeLayers.length > 0
        return (
          <div key={entry.id}>
            <div
              className={`flex items-center justify-between m-2 px-2 py-1 hover:bg-accent/50 rounded-md transition-colors ${
                isActive ? 'bg-accent' : ''
              }`}
            >
              <div
                title={`${goToLabel}: ${entry.label}`}
                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                onClick={() => onSelect(entry)}
              >
                <span className="text-sm text-foreground truncate cursor-pointer">
                  {entry.label}
                </span>
                {isPending ? (
                  <LR.Loader2 className="h-3 w-3 flex-shrink-0 text-muted-foreground animate-spin" />
                ) : isActive ? (
                  <LR.Eye className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                ) : null}
              </div>
              {isActive && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0"
                    onClick={(event) => onDownload(entry, event)}
                    title={downloadLabel}
                  >
                    <LR.Download className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0"
                    onClick={(event) => {
                      event.stopPropagation()
                      setLayersExpanded((prev) => !prev)
                    }}
                    title={layersLabel}
                  >
                    {layersExpanded ? (
                      <LR.ChevronDown className="h-3 w-3" />
                    ) : (
                      <LR.ChevronRight className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}
            </div>
            {showLayersPanel && (
              <div className="mx-2 mb-2 px-2 py-1 border border-gray-200 rounded-md bg-background/50">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 px-1">
                  {layersLabel}
                </div>
                <div className="space-y-0.5">
                  {activeLayers!.map((layer) => (
                    <LayerRow
                      key={layer.className}
                      layer={layer}
                      label={friendlyClassName(layer.className)}
                      toggleTitle={toggleVisibilityLabel}
                      colorTitle={chooseColorLabel}
                      onToggle={(visible) =>
                        onToggleLayer(layer.className, visible)
                      }
                      onColor={(color) =>
                        onChangeLayerColor(layer.className, color)
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

interface LayerRowProps {
  layer: DrawingLayerInfo
  label: string
  toggleTitle: string
  colorTitle: string
  onToggle: (visible: boolean) => void
  onColor: (color: number) => void
}

function LayerRow({
  layer,
  label,
  toggleTitle,
  colorTitle,
  onToggle,
  onColor,
}: LayerRowProps) {
  const hex = `#${layer.color.toString(16).padStart(6, '0')}`
  return (
    <div className="flex items-center gap-2 px-1 py-1 hover:bg-accent/30 rounded-sm">
      <Switch
        checked={layer.visible}
        onCheckedChange={onToggle}
        title={toggleTitle}
        className="scale-75 origin-left flex-shrink-0"
      />
      <label
        title={colorTitle}
        className="relative inline-block h-4 w-4 cursor-pointer rounded-full border border-black flex-shrink-0 overflow-hidden"
        style={{ backgroundColor: hex }}
      >
        <input
          type="color"
          value={hex}
          onChange={(event) => {
            const next = parseInt(event.target.value.replace('#', ''), 16)
            if (!Number.isNaN(next)) onColor(next)
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <span className="text-xs text-foreground truncate flex-1 min-w-0">
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground flex-shrink-0">
        {layer.itemCount}
      </span>
    </div>
  )
}
