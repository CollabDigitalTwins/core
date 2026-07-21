'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useCreateComment } from '../../../hooks/comments/comments'
import { AppConfigContext, MapContext, BuildingsContext, MenusContext, ToolsContext } from '../../../store'
import { ViewerNames } from '../../../types/dbTypes'
import { cn } from '../../../utils/utils'
import { AddItemDialog } from '../AddItemDialog'
import { Button } from '../Button'
import { Card, CardContent, CardHeader, CardTitle } from '../Card'
import { Input } from '../Input'
import { Label } from '../Label'

import type { Comment} from '../../../types/dbTypes';

export type CommentInputLayout = 'inline' | 'card' | 'dialog'

export type BimCommentPlacementContext = {
  world: any
  raycast: (data: { camera: any; mouse: any; dom: any }) => Promise<any>
  buildingId?: number
  setCursor?: (cursor: string) => void
  addPendingMarker?: (position: { x: number; y: number; z: number }) => number
  removePendingMarker?: (id: number) => void
}

export type CommentInputProps = {
  viewer: ViewerNames
  layout?: CommentInputLayout
  onCancel?: () => void
  bim?: BimCommentPlacementContext
  isOpen?: boolean
}

export function CommentInput({
  viewer,
  layout = 'inline',
  onCancel,
  bim,
  isOpen = false,
}: CommentInputProps) {
  const t = useTranslations('CommentInput')
  const session = useSession()

  const user = useSession().data?.user

  const organizationId = user?.organizationId
  const authorId = session.data?.user?.id || -1

  const { state: appConfigState } = React.useContext(AppConfigContext)
  const mapContext = React.useContext(MapContext)

  const { state: buildingsState } = React.useContext(BuildingsContext)
  const buildingId = buildingsState?.buildings?.building?.id || -1

  const [text, setText] = React.useState('')
  const [isPlacing, setIsPlacing] = React.useState(false)

  const inputId = React.useId()
  const { createComment } = useCreateComment()

  const setCursor = React.useCallback((cursor: string) => {
    if (viewer === ViewerNames.map) {
      const map = mapContext?.state?.map?.map
      if (!map) return
      if (map.getCanvas().style.cursor === cursor) return
      map.getCanvas().style.cursor = cursor
      return
    }

    if (viewer === ViewerNames.bim) {
      bim?.setCursor?.(cursor)
    }
  }, [bim, mapContext, viewer])

  const reset = React.useCallback(() => {
    setIsPlacing(false)
    setText('')
    setCursor('')
  }, [setCursor])

  const onCreateComment = async (commentData: Partial<Comment>) => {
    const commentResult = await createComment({ commentData })
    reset()
  }

  const { state: menusState, dispatch: menusDispatch } = React.useContext(MenusContext)
  const { state: toolsState } = React.useContext(ToolsContext)
  const { currentToolId } = toolsState.tools
  const { commentsVisibleInViewer } = menusState.menus

  React.useEffect(() => {
    const viewerToShow = currentToolId === 'bim-add-comment'
      ? ViewerNames.bim
      : currentToolId === 'map-add-comment'
        ? ViewerNames.map
        : null

    if (!viewerToShow) return
    if (commentsVisibleInViewer.includes(viewerToShow)) return

    menusDispatch({
      type: 'SHOW_COMMENTS_IN_VIEWER',
      payload: { viewer: viewerToShow },
    })
  }, [currentToolId, commentsVisibleInViewer, menusDispatch])

  React.useEffect(() => {
    if (!isPlacing) return

    if (viewer === ViewerNames.map) {
      const map = mapContext?.state?.map?.map
      if (!map) return

      const mouseMoveCrosshairHandler = () => {
        setCursor('crosshair')
      }

      const dbClickAddCommentHandler = (e: any): void => {
        const longitude = e?.lngLat?.lng
        const latitude = e?.lngLat?.lat
        if (typeof longitude !== 'number' || typeof latitude !== 'number') return

        const elevation = map.queryTerrainElevation([latitude, longitude]) || 0

        const newComment = {
          authorId: Number(user?.id),
          organizationId,
          text,
          visible: true,
          longitude,
          latitude,
          elevation,
          viewer: ViewerNames.map,
        }
        onCreateComment(newComment)
      }

      map.on('mousemove', mouseMoveCrosshairHandler)
      map.on('dblclick', dbClickAddCommentHandler)

      return () => {
        setCursor('')
        map.off('mousemove', mouseMoveCrosshairHandler)
        map.off('dblclick', dbClickAddCommentHandler)
      }
    }


    if (viewer === ViewerNames.bim) {
      const world = bim?.world
      const raycast = bim?.raycast
      if (!world || !raycast) return

      let disposed = false
      let removeListeners: (() => void) | null = null

        ; (async () => {
          const THREE = await import('three')
          if (disposed) return

          const mouse = new THREE.Vector2()

          const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX
            mouse.y = e.clientY
          }

          const handleDblClick = async (e: MouseEvent) => {
            mouse.x = e.clientX
            mouse.y = e.clientY

            const result = await raycast({
              camera: world.camera?.three,
              mouse,
              dom: world.renderer?.three?.domElement,
            })

            if (!result?.point) return
            const p = result.point

            // Add pending marker immediately
            const pendingId = bim?.addPendingMarker?.({ x: p.x, y: p.y, z: p.z })

            const newComment = {
              authorId: Number(authorId),
              organizationId,
              text,
              x: p.x,
              y: p.y,
              z: p.z,
              visible: true,
              buildingId,
              viewer,
            }

            try {
              await onCreateComment(newComment)
            } finally {
              // Remove pending marker after creation completes (or fails)
              if (pendingId) {
                bim?.removePendingMarker?.(pendingId)
              }
            }
            // BIM flow historically closes the adding UI once the comment is placed.
            onCancel?.()
          }

          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('dblclick', handleDblClick)

          removeListeners = () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('dblclick', handleDblClick)
          }
        })()

      return () => {
        disposed = true
        setCursor('')
        removeListeners?.()
      }
    }
  }, [
    appConfigState,
    bim,
    isPlacing,
    mapContext,
    viewer,
    onCancel,
    reset,
    setCursor,
    text,
    authorId,
  ])

  const onSubmit = () => {
    if (text.trim() === '') return
    setIsPlacing(true)
    setCursor('crosshair')
  }

  const inputEl = (
    <Input
      id={inputId}
      type="text"
      value={text}
      onChange={e => setText(e.target.value)}
      placeholder={t('placeholder')}
      className={cn('cursor-pointer')}
    />
  )

  const submitButtonEl = (
    <Button
      type="button"
      variant="ghost"
      onClick={onSubmit}
      className="cursor-pointer transition-transform duration-200 active:scale-90"
      disabled={text.trim() === ''}
    >
      <LR.Plus className={cn('w-4 h-4', 'cursor-pointer transition-transform duration-200 active:scale-90')} />
    </Button>
  )

  const helpText =
    isPlacing
      ? (viewer === ViewerNames.map ? t('placeHelpTextMap') : t('placeHelpTextBim'))
      : null

  if (layout === 'dialog') {
    // When placing, return null so the map is fully interactive (component stays mounted for useEffect)
    if (isPlacing) return null

    return (
      <AddItemDialog
        open={isOpen}
        onOpenChange={open => !open && onCancel?.()}
        title={t('title')}
        icon={LR.MessageCircle}
      >
        <div className="flex flex-col gap-2 pointer-events-auto">
          <Label htmlFor={inputId}>{t('label')}</Label>
          <div className="flex flex-row gap-2">
            {inputEl}
            {submitButtonEl}
          </div>
        </div>
      </AddItemDialog>
    )
  }

  if (layout === 'card') {
    return (
      <Card className={cn('absolute bottom-10 left-0 bg-background shadow-md z-10 w-full')}>
        <CardHeader className="flex flex-row justify-between items-center pointer-events-auto py-0">
          <CardTitle className="text-sm">{t('title')}</CardTitle>
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
            >
              <span className="sr-only">{t('close')}</span>
              <LR.X size={18} />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 mt-2 pointer-events-auto">
            <Label htmlFor={inputId}>{t('label')}</Label>
            <div className="flex flex-row gap-2">
              {inputEl}
              {submitButtonEl}
            </div>
            {helpText && (
              <p className="text-sm text-foreground">{helpText}</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2 mt-2 pointer-events-auto')}>
      <Label htmlFor={inputId}>{t('label')}</Label>
      <div className="flex items-center gap-1">
        {inputEl}
        {submitButtonEl}
      </div>
      {helpText && (
        <p className="text-sm text-foreground">{helpText}</p>
      )}
    </div>
  )
}
