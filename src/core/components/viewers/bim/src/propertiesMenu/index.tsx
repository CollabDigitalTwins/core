'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useFilesByBuildingId } from '../../../../../hooks/files/files'
import { BimContext, BuildingsContext, ToolsContext } from '../../../../../store'
import { typeOfRecord } from '../../../../ui/FilesManager/src/fileType'
import { Highlighter } from '../Highlighter'
import { IDSManager } from '../IDSManager'
import { IDSLegend } from '../IDSManager/src/IDSLegend'
import { capabilitiesForFile } from '../Placement/placementCapabilities'
import { PlacementEditor } from '../Placement/PlacementEditor'
import { useModelTarget } from '../Placement/targets/useModelTarget'
import { useSplatTarget } from '../Placement/targets/useSplatTarget'
import { BimSceneObjects } from '../SceneObjects'
import { BimSplats } from '../Splats'

import { ElementList } from './src/ElementList'
import { fileIdentityGroup } from './src/fileIdentityGroup'
import { PositionSection } from './src/PositionSection'
import { PropertiesMenuHeader } from './src/PropertiesMenuHeader'
import { PropertyGroup } from './src/PropertyGroup'
import { useElementProperties } from './src/useElementProperties'
import { formatPropertyValue } from './src/utils'

import type { PlacementTarget } from '../Placement/placementTarget'
import type { PropertyGroup as PropertyGroupType } from './src/utils'

interface PropertiesSideBarProps {
  open?: boolean
  onOpenChangeAction?: (open: boolean) => void
}

// Hook to get element names for multiple elements
function useElementNames(bimComponents: any) {
  const { fetchElementProperties } = useElementProperties(bimComponents)

  const getElementName = React.useCallback(async (elementId: number): Promise<string> => {
    try {
      const { elementName } = await fetchElementProperties(elementId)
      return elementName || `Element ${elementId}`
    }
    catch (error) {
      console.error('Error fetching element name:', error)
      return `Element ${elementId}`
    }
  }, [fetchElementProperties])

  const getElementNames = React.useCallback(async (elementIds: number[]): Promise<Record<number, string>> => {
    const names: Record<number, string> = {}

    // Fetch names in parallel for better performance
    const namePromises = elementIds.map(async (id) => {
      const name = await getElementName(id)
      return { id, name }
    })

    const results = await Promise.allSettled(namePromises)
    for (const result of results) {
      if (result.status === 'fulfilled') {
        names[result.value.id] = result.value.name
      }
    }

    return names
  }, [getElementName])

  return { getElementName, getElementNames }
}

export function PropertiesMenu({ open = false, onOpenChangeAction }: PropertiesSideBarProps) {
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents, sceneSelection } = bimState.bim
  const { state: toolsState } = React.useContext(ToolsContext)
  const { currentToolId } = toolsState.tools

  const t = useTranslations('PropertiesMenu')
  const { state: buildingState } = React.useContext(BuildingsContext)
  const { files } = useFilesByBuildingId(buildingState.buildings.building?.id ?? 0)

  const selectedFile = React.useMemo(
    () => (sceneSelection
      ? files?.find(file => String(file.id) === sceneSelection.fileId) ?? null
      : null),
    [files, sceneSelection],
  )

  const splatTargets = useSplatTarget()
  const modelTargets = useModelTarget()

  const { fetchElementProperties } = useElementProperties(bimComponents)
  const { getElementNames } = useElementNames(bimComponents)
  const [selectedElementIds, setSelectedElementIds] = React.useState<number[]>([])
  const [currentElementId, setCurrentElementId] = React.useState<number | null>(null)
  const [currentElementName, setCurrentElementName] = React.useState<string | null>(null)
  const [propertyGroups, setPropertyGroups] = React.useState<PropertyGroupType[]>([])
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set(['identity-data', 'position']))
  const [loading, setLoading] = React.useState(false)
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [elementNames, setElementNames] = React.useState<Record<number, string>>({})
  const [hasEverSelectedElement, setHasEverSelectedElement] = React.useState(false)
  const [isExiting, setIsExiting] = React.useState(false)
  const [idsTestResults, setIdsTestResults] = React.useState<{ passed: number; failed: number } | null>(null)
  const [idsEnabled, setIdsEnabled] = React.useState(false)
  const [currentElementIdsStatus, setCurrentElementIdsStatus] = React.useState<'pass' | 'fail' | null>(null)
  const [idsTitle, setIdsTitle] = React.useState<string>('IDS Verification')
  const [idsDescription, setIdsDescription] = React.useState<string>('')
  const [idsLegendHeight, setIdsLegendHeight] = React.useState<number>(0)

  // Ref to prevent circular calls between React and ClickHandler
  const isInternalCloseRef = React.useRef(false)
  const pendingCloseRef = React.useRef<number | null>(null)

  const cancelPendingClose = React.useCallback(() => {
    if (pendingCloseRef.current === null) return
    clearTimeout(pendingCloseRef.current)
    pendingCloseRef.current = null
    setIsExiting(false)
  }, [])

  // Use internal state if no external control is provided
  const isOpen = onOpenChangeAction ? open : internalOpen
  const handleOpenChange = onOpenChangeAction || setInternalOpen

  // Function to toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      }
      else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  // Function to fetch properties for the current element
  const loadElementProperties = React.useCallback(async (localId: number) => {
    setLoading(true)
    try {
      const { groups, elementName } = await fetchElementProperties(localId)
      setPropertyGroups(groups)
      setCurrentElementName(elementName)
      // Reset expanded groups to defaults when element changes
      setExpandedGroups(new Set(['identity-data', 'position']))
    }
    catch (error) {
      console.error('Error fetching element properties:', error)
      setPropertyGroups([])
      setCurrentElementName(null)
    }
    finally {
      setLoading(false)
    }
  }, [fetchElementProperties])

  // Handle closing the properties panel
  const handleClose = React.useCallback(() => {
    cancelPendingClose()

    if (!isOpen) {
      // If not open, close immediately without animation
      setSelectedElementIds([])
      setCurrentElementId(null)
      setCurrentElementName(null)
      setElementNames({})
      setHasEverSelectedElement(false)
      isInternalCloseRef.current = false
      handleOpenChange(false)
      return
    }

    setIsExiting(true)
    // Delay the actual close to allow animation to complete
    pendingCloseRef.current = window.setTimeout(() => {
      pendingCloseRef.current = null
      setSelectedElementIds([])
      setCurrentElementId(null)
      setCurrentElementName(null)
      setElementNames({})
      setHasEverSelectedElement(false)
      isInternalCloseRef.current = false
      setIsExiting(false)
      handleOpenChange(false)
    }, 300) // Match animation duration
  }, [isOpen, handleOpenChange, cancelPendingClose])

  // Handle manual close (e.g., when user clicks close button)
  const handleManualClose = React.useCallback(() => {
    isInternalCloseRef.current = true
    const highlighter = bimComponents?.get(Highlighter)
    if (highlighter) {
      highlighter.clearSelection()
    }
    // Call handleClose directly after clearing selection
    handleClose()
  }, [bimComponents, handleClose])

  const handleSelectionCleared = React.useCallback(() => {
    // Only call handleClose if this is not an internal close operation
    if (!isInternalCloseRef.current) {
      handleClose()
    }
  }, [handleClose])

  // Handle selecting a specific element from the list
  const handleElementSelect = (elementId: string) => {
    const id = Number.parseInt(elementId)
    setCurrentElementId(id)
    void loadElementProperties(id)
  }

  // Memoize event handlers to prevent infinite loops
  const handleElementsSelected = React.useCallback((elementIds: number[]) => {
    setSelectedElementIds(elementIds)
    if (elementIds.length > 0) {
      setCurrentElementId(elementIds[0])
      setHasEverSelectedElement(true)
      // Only open properties panel if no tool is currently active
      if (currentToolId === null) {
        cancelPendingClose()
        handleOpenChange(true)
      }
    }
    else {
      // No elements selected - close the panel
      if (hasEverSelectedElement && currentToolId === null) {
        handleClose()
      }
      // If no element has ever been selected or tool is active, do nothing (don't open panel)
    }
  }, [currentToolId, hasEverSelectedElement, handleOpenChange, handleClose, cancelPendingClose])

  React.useEffect(() => {
    if (!selectedFile) return
    if (currentToolId !== null) return
    cancelPendingClose()
    setSelectedElementIds([])
    setCurrentElementId(null)
    setCurrentElementName(selectedFile.name)
    setHasEverSelectedElement(true)
    setExpandedGroups(new Set(['identity-data', 'position']))
    handleOpenChange(true)
  }, [selectedFile, currentToolId, handleOpenChange, cancelPendingClose])

  const modelFileForElement = React.useMemo(() => {
    if (!bimComponents || currentElementId === null) return null
    const selectedItems = bimComponents.get(Highlighter).selectedItems
    const modelId = Object.keys(selectedItems).find(id => selectedItems[id].has(currentElementId))
    return files?.find(file => file.name === modelId) ?? null
  }, [bimComponents, currentElementId, files])

  const latestPositionInputsRef = React.useRef({ bimComponents, selectedFile, modelFileForElement, splatTargets, modelTargets })
  React.useEffect(() => {
    latestPositionInputsRef.current = { bimComponents, selectedFile, modelFileForElement, splatTargets, modelTargets }
  })

  const [positionTarget, setPositionTarget] = React.useState<PlacementTarget | null>(null)

  React.useEffect(() => {
    const { bimComponents, selectedFile, modelFileForElement, splatTargets, modelTargets } = latestPositionInputsRef.current
    if (!bimComponents) { setPositionTarget(null); return }

    if (selectedFile && sceneSelection?.kind === 'splat') {
      setPositionTarget(splatTargets.targetFor(selectedFile, bimComponents.get(BimSplats)))
      return
    }
    if (selectedFile && sceneSelection?.kind === 'object') {
      setPositionTarget(modelTargets.targetFor(
        selectedFile,
        () => bimComponents.get(BimSceneObjects).registry?.get(String(selectedFile.id))?.root ?? null,
        capabilitiesForFile(selectedFile),
      ))
      return
    }
    if (currentElementId !== null && modelFileForElement) {
      setPositionTarget(modelTargets.targetFor(
        modelFileForElement,
        () => bimComponents.get(OBC.FragmentsManager).core.models.list.get(modelFileForElement.name)?.object ?? null,
        capabilitiesForFile(modelFileForElement),
      ))
      return
    }
    setPositionTarget(null)
  }, [bimComponents, sceneSelection?.kind, sceneSelection?.fileId, currentElementId, modelFileForElement?.id])

  const handleEditInViewport = React.useCallback(() => {
    if (!bimComponents || !positionTarget) return
    void bimComponents.get(PlacementEditor).begin(positionTarget)
  }, [bimComponents, positionTarget])

  const identityLabels = React.useMemo(() => {
    const base = {
      identity: t('identity'),
      name: t('name'),
      type: t('type'),
      extension: t('extension'),
      size: t('size'),
      uploaded: t('uploaded'),
      description: t('description'),
      tag: t('tag'),
    }
    if (!selectedFile) return base
    const typeKey = `type_${typeOfRecord(selectedFile)}`
    return { ...base, [typeKey]: t(typeKey) }
  }, [t, selectedFile])

  const groups = selectedFile ? [fileIdentityGroup(selectedFile, identityLabels)] : propertyGroups

  // Handler to close IDS verification
  const handleIDSClose = React.useCallback(async () => {
    if (!bimComponents) return
    try {
      const idsManager = bimComponents.get(IDSManager)
      await idsManager.reset()
    } catch (error) {
      console.error('Error closing IDS:', error)
    }
  }, [bimComponents])

  // Set up IDS Manager listener
  React.useEffect(() => {
    if (!bimComponents) return

    try {
      const idsManager = bimComponents.get(IDSManager)

      const handleIDSTest = ({ totalPassed, totalFailed, title, description }: { totalPassed: number; totalFailed: number; title?: string; description?: string }) => {
        setIdsTestResults({ passed: totalPassed, failed: totalFailed })
        setIdsTitle(title || 'IDS Verification')
        setIdsDescription(description || '')
        setIdsEnabled(true)
      }

      const handleIDSReset = () => {
        setIdsTestResults(null)
        setIdsEnabled(false)
        setCurrentElementIdsStatus(null)
        setIdsTitle('IDS Verification')
        setIdsDescription('')
      }

      idsManager.onTest.add(handleIDSTest)
      idsManager.onReset.add(handleIDSReset)

      // Check if IDS is currently enabled and has results
      if (idsManager.enabled) {
        setIdsEnabled(true)
        // Try to get existing results
        const pass = idsManager.pass
        const fail = idsManager.fail
        if (pass && fail) {
          const totalPassed = Object.values(pass).reduce((total, set) => total + set.size, 0)
          const totalFailed = Object.values(fail).reduce((total, set) => total + set.size, 0)
          if (totalPassed > 0 || totalFailed > 0) {
            setIdsTestResults({ passed: totalPassed, failed: totalFailed })
          }
        }
      }

      return () => {
        idsManager.onTest.remove(handleIDSTest)
        idsManager.onReset.remove(handleIDSReset)
      }
    } catch {
      // IDSManager might not be initialized
      return
    }
  }, [bimComponents])

  // Set up ClickHandler event listener
  React.useEffect(() => {
    if (!bimComponents) return

    const highlighter = bimComponents.get(Highlighter)

    // Subscribe to the event
    highlighter.onElementsSelected.add(handleElementsSelected)
    highlighter.onSelectionCleared.add(handleSelectionCleared)

    // Get the currently selected elements if any
    const currentlySelected = highlighter.selectedElement
    if (currentlySelected && currentlySelected.length > 0 && currentToolId === null) {
      cancelPendingClose()
      setSelectedElementIds(currentlySelected)
      setCurrentElementId(currentlySelected[0])
      setHasEverSelectedElement(true)
      handleOpenChange(true)
    }

    // Cleanup on unmount
    return () => {
      highlighter.onElementsSelected.remove(handleElementsSelected)
      highlighter.onSelectionCleared.remove(handleSelectionCleared)
    }
  }, [bimComponents, handleElementsSelected, handleSelectionCleared, currentToolId, handleOpenChange, cancelPendingClose])
  // Fetch properties when currentElementId changes
  React.useEffect(() => {
    if (currentElementId === null) {
      setPropertyGroups([])
      setCurrentElementName(null)
      if (!selectedFile) setExpandedGroups(new Set())
      setCurrentElementIdsStatus(null)
    }
    else {
      void loadElementProperties(currentElementId)

      // Check if current element passed or failed IDS test
      if (bimComponents && idsEnabled) {
        try {
          const idsManager = bimComponents.get(IDSManager)
          const passMap = idsManager.pass
          const failMap = idsManager.fail

          let elementStatus: 'pass' | 'fail' | null = null

          // Check if element is in pass map
          for (const [modelId, expressIds] of Object.entries(passMap || {})) {
            if (expressIds.has(currentElementId)) {
              elementStatus = 'pass'
              break
            }
          }

          // Check if element is in fail map (only if not already found in pass)
          if (!elementStatus) {
            for (const [modelId, expressIds] of Object.entries(failMap || {})) {
              if (expressIds.has(currentElementId)) {
                elementStatus = 'fail'
                break
              }
            }
          }

          setCurrentElementIdsStatus(elementStatus)
        } catch {
          setCurrentElementIdsStatus(null)
        }
      } else {
        setCurrentElementIdsStatus(null)
      }
    }
  }, [currentElementId, loadElementProperties, bimComponents, idsEnabled, selectedFile])

  // Close properties panel when a tool becomes active
  React.useEffect(() => {
    if (currentToolId !== null && isOpen) {
      handleOpenChange(false)
    }
  }, [currentToolId, isOpen, handleOpenChange])

  // Fetch element names when selectedElementIds changes
  React.useEffect(() => {
    if (selectedElementIds.length > 1) {
      void getElementNames(selectedElementIds).then(setElementNames)
    }
    else {
      setElementNames({})
    }
  }, [selectedElementIds, getElementNames])

  // Calculate bottom position for properties panel when IDS is visible
  const panelGap = 8 // Gap between panels in pixels (0.5rem)
  const propertiesPanelBottom = React.useMemo(() => {
    return idsEnabled && idsTestResults && idsLegendHeight > 0
      ? `${idsLegendHeight + panelGap + 8}px` // IDS height + gap + margin
      : '0.5rem'
  }, [idsEnabled, idsTestResults, idsLegendHeight])

  // Handler for IDS legend height changes
  const handleIDSHeightChange = React.useCallback((height: number) => {
    setIdsLegendHeight(height)
  }, [])

  // Render IDS legend component
  const idsLegendComponent = React.useMemo(() => {
    if (!idsEnabled || !idsTestResults) return null

    return (
      <IDSLegend
        idsTestResults={idsTestResults}
        title={idsTitle}
        description={idsDescription}
        onClose={() => void handleIDSClose()}
        onHeightChange={handleIDSHeightChange}
      />
    )
  }, [idsEnabled, idsTestResults, idsTitle, idsDescription, handleIDSClose, handleIDSHeightChange])

  // Don't render properties panel if not open, exiting, or when a tool is active
  const propertiesPanelComponent = (isOpen || isExiting) && currentToolId === null && (
    <div
      className={`fixed right-2 top-2 w-80 z-50 rounded-md bg-background/95 backdrop-blur-sm border shadow-lg pointer-events-auto ${
        isExiting
          ? 'animate-out slide-out-to-right duration-300'
          : 'animate-in slide-in-from-right duration-300'
      }`}
      style={{
        bottom: propertiesPanelBottom,
        minWidth: '300px',
        resize: 'both',
        overflow: 'hidden',
      }}
    >
      <div className="flex flex-col h-full p-4 pr-1 ">
        <PropertiesMenuHeader
          elementName={currentElementName}
          onCloseAction={handleManualClose}
          idsStatus={currentElementIdsStatus}
        />
        <div className="flex-1 overflow-y-auto space-y-4">
          {(selectedFile || (selectedElementIds.length > 0 && !loading)) && (
            <>
              {groups.length > 0 && (
                <div className="space-y-1">
                  {groups.map(group => (
                    <PropertyGroup
                      key={group.id}
                      group={group}
                      isExpanded={expandedGroups.has(group.id)}
                      onToggleAction={toggleGroup}
                      formatPropertyValueAction={formatPropertyValue}
                    />
                  ))}
                </div>
              )}

              <PositionSection
                target={positionTarget}
                isExpanded={expandedGroups.has('position')}
                onToggleAction={toggleGroup}
                onEditInViewport={handleEditInViewport}
                hint={modelFileForElement ? t('movesModel', { name: modelFileForElement.name }) : undefined}
              />

              {!selectedFile && (
                <ElementList
                  selectedElementIds={selectedElementIds}
                  currentElementId={currentElementId}
                  onElementSelectAction={handleElementSelect}
                  elementNames={elementNames}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {propertiesPanelComponent}
      {idsLegendComponent}
    </>
  )
}
