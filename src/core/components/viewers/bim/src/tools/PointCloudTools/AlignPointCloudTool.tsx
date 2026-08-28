'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { BimContext } from '../../../../../../store'
import { ToolbarSubmenu } from '../../../../../ToolbarSubmenu'
import { DropdownMenuItem } from '../../../../../ui/DropdownMenu'
import { PointCloudAlignment } from '../../PointClouds/PointCloudAlignment'
import { useBimPointCloudAlignment } from '../../PointClouds/useBimPointCloudAlignment'
import { useBimPointClouds } from '../../PointClouds/useBimPointClouds'

import { AlignPointCloudPanel } from './src/AlignPointCloudPanel'

import type { Tool } from '../../../../../../types/tools'
import type { AlignmentMode } from '../../PointClouds/PointCloudAlignment'

export const AlignPointCloudTool: React.FC<{ tool: Tool }> = ({ tool }) => {
  const t = useTranslations('PointCloudAlignment')

  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim

  const clouds = useBimPointClouds()
  const session = useBimPointCloudAlignment()
  const [mode, setMode] = React.useState<AlignmentMode>('translate')

  const alignment = React.useMemo(
    () => bimComponents?.get(PointCloudAlignment) ?? null,
    [bimComponents],
  )

  const labels = React.useMemo(() => ({
    title: t('title'),
    position: t('position'),
    rotation: t('rotation'),
    scale: t('scale'),
    translate: t('modeTranslate'),
    rotate: t('modeRotate'),
    reset: t('reset'),
    done: t('done'),
  }), [t])

  const begin = React.useCallback((id: string) => {
    setMode('translate')
    void alignment?.begin(id)
  }, [alignment])

  const changeMode = React.useCallback((next: AlignmentMode) => {
    setMode(next)
    alignment?.setMode(next)
  }, [alignment])

  const active = session ? clouds.find((cloud) => cloud.id === session.id) : undefined

  return (
    <>
      <ToolbarSubmenu tool={tool}>
        {clouds.length === 0 && (
          <DropdownMenuItem disabled>{t('noClouds')}</DropdownMenuItem>
        )}
        {clouds.map((cloud) => (
          <DropdownMenuItem key={cloud.id} onClick={() => begin(cloud.id)}>
            {session?.id === cloud.id ? <LR.Check className="h-4 w-4" /> : <LR.Move3d className="h-4 w-4" />}
            <span className="truncate">{cloud.name ?? cloud.id}</span>
          </DropdownMenuItem>
        ))}
      </ToolbarSubmenu>

      {session && (
        <AlignPointCloudPanel
          name={active?.name ?? session.id}
          placement={session.placement}
          mode={mode}
          labels={labels}
          onModeChange={changeMode}
          onPlacementChange={(placement) => alignment?.setPlacement(placement)}
          onDone={() => alignment?.accept()}
          onReset={() => alignment?.cancel()}
        />
      )}
    </>
  )
}
