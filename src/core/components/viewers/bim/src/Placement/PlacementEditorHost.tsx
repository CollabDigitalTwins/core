'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { useFilesByBuildingId } from '../../../../../hooks/files/files'
import { BimContext, BuildingsContext } from '../../../../../store'
import { PlacementActionsCard } from '../../../../ui/FilesManager/src/PlacementActionsCard'

import { Highlighter } from '../Highlighter'

import { ModelManager } from '../ModelManager'
import { BimPointClouds } from '../PointClouds'


import { markerActionsFor } from './markerActions'
import { PlacementEditor } from './PlacementEditor'
import { PlacementPanel } from './PlacementPanel'
import { useModelTarget } from './targets/useModelTarget'
import { usePointCloudTarget } from './targets/usePointCloudTarget'
import { usePlacementSession } from './usePlacementSession'
import { useViewportContextMenu } from './useViewportContextMenu'

import type { PlacementMode } from './PlacementEditor'
import type { ViewportTarget } from './resolveViewportTarget'

const PIVOT_TOAST_ID = 'bim-placement-pivot-toast'

const sceneObject = (components: OBC.Components, kind: ViewportTarget['kind'], name: string) => {
  try {
    return kind === 'model'
      ? components.get(OBC.FragmentsManager).core.models.list.get(name)?.object ?? null
      : components.get(ModelManager).getModelByName(name)?.model ?? null
  }
  catch { return null }
}

// The viewer may be tearing down, and get() throws rather than returning null.
const safeHighlighter = (components: OBC.Components) => {
  try { return components.get(Highlighter) } catch { return null }
}

/** Renderless owner of the placement card. Sessions are started by whoever resolves the target. */
export function PlacementEditorHost() {
  const t = useTranslations('Placement')

  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim

  const session = usePlacementSession()

  const { state: buildingState } = React.useContext(BuildingsContext)
  const { files } = useFilesByBuildingId(buildingState.buildings.building?.id ?? 0)
  const { menu, close } = useViewportContextMenu(bimComponents ?? null, files ?? [])
  const cloudTarget = usePointCloudTarget()
  const modelTarget = useModelTarget()

  const editor = React.useMemo(
    () => bimComponents?.get(PlacementEditor) ?? null,
    [bimComponents],
  )

  // A click meant for the gizmo would otherwise select the element behind it.
  React.useEffect(() => {
    if (!bimComponents || !session) return

    const highlighter = safeHighlighter(bimComponents)
    if (!highlighter) return

    highlighter.enabled = false
    return () => { highlighter.enabled = true }
  }, [bimComponents, session])

  const labels = React.useMemo(() => ({
    title: t('title'),
    position: t('position'),
    rotation: t('rotation'),
    yaw: t('yaw'),
    scale: t('scale'),
    translate: t('modeTranslate'),
    rotate: t('modeRotate'),
    reset: t('reset'),
    done: t('done'),
    centre: t('centre'),
    pickPivot: t('pickPivot'),
    pivotSet: t('pivotSet'),
    pivotOrigin: t('pivotOrigin'),
    unit_mm: t('unit_mm'),
    unit_cm: t('unit_cm'),
    unit_m: t('unit_m'),
    unit_in: t('unit_in'),
  }), [t])

  const changeMode = React.useCallback((next: PlacementMode) => {
    editor?.setMode(next)
  }, [editor])

  // A georeferenced scan can land kilometres from the origin, where the user cannot find it.
  const pickPivot = React.useCallback(() => {
    if (!editor) return
    toast.info(t('pickPivotHint'), { id: PIVOT_TOAST_ID, duration: Infinity })

    void editor.pickPivot().then((picked) => {
      toast.dismiss(PIVOT_TOAST_ID)
      if (!picked) toast.error(t('pickPivotFailed'))
    })
  }, [editor, t])

  const centre = React.useCallback(() => {
    if (!editor) return
    if (!editor.activeTarget?.bounds()) {
      toast.error(t('centreFailed'))
      return
    }
    editor.centreOnOrigin()
  }, [editor, t])

  const beginFromMenu = (action: 'move' | 'rotate' | 'scale' | 'delete') => {
    if (!menu || !bimComponents || action === 'delete') return

    const mode = action === 'move' ? 'translate' : action
    const target = menu.kind === 'cloud'
      ? cloudTarget.targetFor(menu.file, bimComponents.get(BimPointClouds))
      : modelTarget.targetFor(
        menu.file,
        () => sceneObject(bimComponents, menu.kind, menu.file.name),
        menu.capabilities,
      )

    void editor?.begin(target, mode)
  }

  if (!session) {
    if (!menu) return null

    return (
      <div className="fixed z-50" style={{ left: menu.x, top: menu.y }}>
        <PlacementActionsCard
          name={menu.file.name}
          Icon={menu.kind === 'cloud' ? LR.Grip : LR.Box}
          actions={markerActionsFor(menu.capabilities)}
          onAction={beginFromMenu}
          onClose={close}
        />
      </div>
    )
  }

  return (
    <PlacementPanel
      name={session.name}
      capabilities={session.capabilities}
      placement={session.placement}
      mode={session.mode}
      labels={labels}
      onModeChange={changeMode}
      onPlacementChange={(placement) => editor?.setPlacement(placement)}
      onCentre={centre}
      onPickPivot={pickPivot}
      onClearPivot={() => editor?.setPivot(null)}
      hasPivot={session.pivot !== null}
      onDone={() => editor?.accept()}
      onReset={() => editor?.cancel()}
    />
  )
}
