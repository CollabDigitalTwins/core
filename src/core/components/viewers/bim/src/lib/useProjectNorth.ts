'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { useUpdateFile } from '../../../../../hooks/files/files'
import { BimContext } from '../../../../../store'
import {
  normalizeAngle,
  objectProjectNorth,
  projectNorthFromSegment,
  turnObjectToProjectNorth,
} from '../../../shared/placement/projectNorth'
import { FloorplanTool } from '../FloorplanTool'

import { ModelPlacementWatchers } from './modelPlacementWatchers'
import { pickModelEdge } from './pickModelEdge'

import type { DbFile } from '../../../../../types/dbTypes'

/** Sets a BIM model's project north (`fileRotationZ`): turns it in the scene, re-projects its plans and saves it. */
export function useProjectNorth() {
  const { state } = React.useContext(BimContext)
  const { bimComponents, fragments } = state.bim
  const updateFile = useUpdateFile()
  const t = useTranslations('Placement')

  const modelOf = React.useCallback(
    (file: DbFile) => fragments?.core.models.list.get(file.name) ?? null,
    [fragments],
  )

  const turnModel = React.useCallback(async (file: DbFile, radians: number) => {
    const model = modelOf(file)
    if (!model || !bimComponents || !fragments) return
    turnObjectToProjectNorth(model.object, radians)
    void fragments.core.update(true)
    await bimComponents.get(FloorplanTool).refreshModel(file.name)
  }, [modelOf, bimComponents, fragments])

  const setProjectNorth = React.useCallback(async (file: DbFile, radians: number) => {
    const model = modelOf(file)
    if (!model) return
    const previous = objectProjectNorth(model.object)
    const north = normalizeAngle(radians)
    if (north === previous || !bimComponents) return
    const watchers = bimComponents.get(ModelPlacementWatchers)
    if (!(await watchers.confirmTurn(file.name))) return
    const before = model.object.matrixWorld.clone()
    try {
      await turnModel(file, north)
      await updateFile(file.id, { fileRotationZ: north })
      file.fileRotationZ = north
      await watchers.notify(file.name, before, model.object.matrixWorld)
      toast.success(t('projectNorthSaved', { name: file.name }))
    } catch (error) {
      console.error(`Could not save project north for "${file.name}":`, error)
      await turnModel(file, previous)
      toast.error(t('projectNorthFailed', { name: file.name }))
    }
  }, [modelOf, bimComponents, turnModel, updateFile, t])

  const pickProjectNorth = React.useCallback(async (file: DbFile) => {
    const model = modelOf(file)
    if (!model || !bimComponents) return
    const floorplan = bimComponents.get(FloorplanTool)
    const segment = floorplan.activeDrawing?.modelId === file.name
      ? await floorplan.pickNorthLine()
      : await pickModelEdge(bimComponents, model)
    if (!segment) return
    const north = projectNorthFromSegment(objectProjectNorth(model.object), ...segment)
    if (north !== null) await setProjectNorth(file, north)
  }, [modelOf, bimComponents, setProjectNorth])

  const projectNorthOf = React.useCallback(
    (file: DbFile) => {
      const model = modelOf(file)
      return model ? objectProjectNorth(model.object) : file.fileRotationZ ?? 0
    },
    [modelOf],
  )

  return { projectNorthOf, setProjectNorth, pickProjectNorth }
}
