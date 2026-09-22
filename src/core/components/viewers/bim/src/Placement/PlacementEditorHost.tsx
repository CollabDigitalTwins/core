'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { useDeleteFile, useFilesByBuildingId } from '../../../../../hooks/files/files'
import { BimContext, BuildingsContext } from '../../../../../store'
import ConfirmDialog from '../../../../ConfirmDialog'
import { useFileDeleteHandler, useFileVisibility } from '../../../../ui/FilesManager'
import { PlacementActionsCard } from '../../../../ui/FilesManager/src/PlacementActionsCard'

import { Highlighter } from '../Highlighter'

import { ModelManager } from '../ModelManager'
import { BimPointClouds } from '../PointClouds'
import { BimSceneObjects } from '../SceneObjects'
import { BimSplats } from '../Splats'


import { AnimationPanel } from './AnimationPanel'
import { AnimationSession } from './AnimationSession'
import { markerActionsFor } from './markerActions'
import { PlacementEditor } from './PlacementEditor'
import { PlacementPanel } from './PlacementPanel'
import { useModelTarget } from './targets/useModelTarget'
import { usePointCloudTarget } from './targets/usePointCloudTarget'
import { useSplatTarget } from './targets/useSplatTarget'
import { useAnimationSession } from './useAnimationSession'
import { usePlacementSession } from './usePlacementSession'
import { usePlacementToasts } from './usePlacementToasts'
import { useSceneUnload } from './useSceneUnload'
import { useViewportContextMenu } from './useViewportContextMenu'

import type { PlacementMode } from './PlacementEditor'
import type { ViewportTarget } from './resolveViewportTarget'
import type { SceneKind } from './useSceneUnload'
import type { ViewportMenuState } from './useViewportContextMenu'
import type { DbFile } from '../../../../../types/dbTypes'
import type { FileMarkerAction } from '../../../../ui/FilesManager/src/PlacementActionsCard'
import type { AnimationState } from '../ModelManager/modelAnimation'

const PIVOT_TOAST_ID = 'bim-placement-pivot-toast'

const MENU_ICONS: Partial<Record<ViewportTarget['kind'], typeof LR.Box>> = {
  cloud: LR.Grip,
  splat: LR.Sparkles,
}

const sceneObject = (components: OBC.Components, kind: ViewportTarget['kind'], file: DbFile) => {
  try {
    return kind === 'model'
      ? components.get(OBC.FragmentsManager).core.models.list.get(file.name)?.object ?? null
      : components.get(BimSceneObjects).registry?.get(String(file.id))?.root ?? null
  }
  catch { return null }
}

// The viewer may be tearing down, and get() throws rather than returning null.
const safeHighlighter = (components: OBC.Components) => {
  try { return components.get(Highlighter) } catch { return null }
}

const safeRegistry = (components: OBC.Components) => {
  try { return components.get(BimSceneObjects).registry } catch { return null }
}

/** Renderless owner of the placement card. Sessions are started by whoever resolves the target. */
export function PlacementEditorHost() {
  const t = useTranslations('Placement')
  const tAnimation = useTranslations('Animation')
  const tFile = useTranslations('FileItemComponent')

  const { state, dispatch } = React.useContext(BimContext)
  const { bimComponents, fragments, pointCloudIds, splatIds } = state.bim

  const session = usePlacementSession()
  usePlacementToasts(bimComponents ?? null)

  const { state: buildingState } = React.useContext(BuildingsContext)
  const buildingId = buildingState.buildings.building?.id ?? 0
  const { files } = useFilesByBuildingId(buildingId)
  const { deleteFile } = useDeleteFile(buildingId)
  const { setVisible } = useFileVisibility(buildingId)
  const { menu, close } = useViewportContextMenu(bimComponents ?? null, files ?? [], splatIds)
  const cloudTarget = usePointCloudTarget()
  const modelTarget = useModelTarget()
  const splatTarget = useSplatTarget()
  const unloadFromScene = useSceneUnload()

  const animation = useAnimationSession()
  const [animationState, setAnimationState] = React.useState<AnimationState | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<{ file: DbFile; kind: SceneKind } | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const editor = React.useMemo(
    () => bimComponents?.get(PlacementEditor) ?? null,
    [bimComponents],
  )

  const modelManager = React.useMemo(() => {
    if (!bimComponents) return null
    try { return bimComponents.get(ModelManager) } catch { return null }
  }, [bimComponents])

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

  const animationLabels = React.useMemo(() => ({
    title: tAnimation('title'),
    clip: tAnimation('clip'),
    play: tAnimation('play'),
    pause: tAnimation('pause'),
    speed: tAnimation('speed'),
    notSaved: tAnimation('notSaved'),
  }), [tAnimation])

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

  React.useEffect(() => {
    setAnimationState(animation ? modelManager?.getAnimation(animation.fileId) ?? null : null)
  }, [animation, modelManager])

  const updateAnimation = (change: (id: string) => void) => {
    if (!animation || !modelManager) return
    change(animation.fileId)
    setAnimationState(modelManager.getAnimation(animation.fileId))
  }

  const endAnimation = () => bimComponents?.get(AnimationSession).end()

  const { handleDeleteFile } = useFileDeleteHandler({
    deleteFile,
    onDeleteStart: () => setIsDeleting(true),
    onDeleteEnd: () => setIsDeleting(false),
    onDeleteSuccess: () => {
      if (pendingDelete) unloadFromScene(pendingDelete.file, pendingDelete.kind)
      setPendingDelete(null)
    },
  })

  const confirmDelete = () => pendingDelete && handleDeleteFile(pendingDelete.file)

  // Splats and clouds live outside the fragment scene, so each needs its own target builder.
  const targetFromMenu = (target: ViewportMenuState, components: OBC.Components) => {
    if (target.kind === 'cloud') return cloudTarget.targetFor(target.file, components.get(BimPointClouds))
    if (target.kind === 'splat') return splatTarget.targetFor(target.file, components.get(BimSplats))
    return modelTarget.targetFor(
      target.file,
      () => sceneObject(components, target.kind, target.file),
      target.capabilities,
    )
  }

  // Each kind hides the way its own sidebar row does, so the row and the scene cannot drift.
  const hideFromScene = (target: ViewportMenuState, components: OBC.Components) => {
    const id = String(target.file.id)
    if (target.kind === 'splat') {
      if (splatIds.includes(id)) dispatch({ type: 'TOGGLE_SPLAT', payload: { splatId: id } })
      return
    }
    if (target.kind === 'cloud') {
      if (pointCloudIds.includes(id)) dispatch({ type: 'TOGGLE_POINT_CLOUD', payload: { pointCloudId: id } })
      return
    }
    if (target.kind === 'object') { safeRegistry(components)?.setVisible(id, false); return }

    // A hidden model that stays pickable would still answer a click through what is drawn over it.
    safeHighlighter(components)?.disableModel(target.file.name)
    const object = sceneObject(components, 'model', target.file)
    if (object) object.visible = false
    dispatch({ type: 'SET_MODEL_UI_STATE', payload: { fileId: target.file.id, isVisible: false } })
    void fragments?.core.update(true)
  }

  const hideFromMenu = (target: ViewportMenuState, components: OBC.Components) => {
    hideFromScene(target, components)
    void setVisible(target.file, false)
      .catch((error: unknown) => console.error(`Could not save visibility for "${target.file.name}":`, error))
  }

  const beginFromMenu = (action: FileMarkerAction) => {
    if (!menu || !bimComponents) return
    if (action === 'delete') { setPendingDelete({ file: menu.file, kind: menu.kind }); return }
    if (action === 'hide') { hideFromMenu(menu, bimComponents); return }
    if (action === 'animate') {
      bimComponents.get(AnimationSession).begin({ fileId: String(menu.file.id), name: menu.file.name })
      return
    }
    if (action === 'view' || action === 'download') return

    const mode = action === 'move' ? 'translate' : action
    void editor?.begin(targetFromMenu(menu, bimComponents), mode)
  }

  const deleteDialog = (
    <ConfirmDialog
      isOpen={pendingDelete !== null}
      isDeleting={isDeleting}
      onOpenChange={(open: boolean) => { if (!open) setPendingDelete(null) }}
      handleConfirm={() => { void confirmDelete() }}
      itemName={pendingDelete?.file.name ?? ''}
    />
  )

  if (!session) {
    return (
      <>
        {menu && !animation && (
          <div className="fixed z-50" style={{ left: menu.x, top: menu.y }}>
            <PlacementActionsCard
              name={menu.file.name}
              Icon={MENU_ICONS[menu.kind] ?? LR.Box}
              actions={markerActionsFor(menu.capabilities, { animated: menu.animated, hidable: true })}
              labels={{ hide: tFile('hideTitle') }}
              onAction={beginFromMenu}
              onClose={close}
            />
          </div>
        )}
        {animation && animationState && (
          <AnimationPanel
            name={animation.name}
            clips={modelManager?.getClips(animation.fileId) ?? []}
            state={animationState}
            labels={animationLabels}
            onClipChange={(index) => updateAnimation((id) => modelManager?.setClip(id, index))}
            onPlayingChange={(playing) => updateAnimation((id) => modelManager?.setPlaying(id, playing))}
            onSpeedChange={(speed) => updateAnimation((id) => modelManager?.setSpeed(id, speed))}
            onClose={endAnimation}
          />
        )}
        {deleteDialog}
      </>
    )
  }

  return (
    <>
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
        onDone={() => { void editor?.accept() }}
        onReset={() => { void editor?.cancel() }}
      />
      {deleteDialog}
    </>
  )
}
