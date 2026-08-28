'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { BimContext } from '../../../../../../../../store'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { FileItemComponent } from '../../../../../../../ui/FilesManager'
import { selectPointCloudFiles } from '../../../../PointClouds/pointCloudFiles'

import type { DbFile } from '../../../../../../../../types/dbTypes'
import type { FileAction } from '../../../../../../../../types/global'

const OPTIONS: FileAction[] = ['download', 'view', 'info']

interface PointCloudsSectionProps {
  files: DbFile[]
  query?: string
}

export function PointCloudsSection({ files, query = '' }: PointCloudsSectionProps) {
  const t = useTranslations('PointCloudManagement')

  const { state, dispatch } = React.useContext(BimContext)
  const { pointCloudIds } = state.bim

  const clouds = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return selectPointCloudFiles(files)
      .filter((file) => !needle || file.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [files, query])

  const onAction = React.useCallback((action: FileAction, file: DbFile) => {
    if (action !== 'view') return
    dispatch({ type: 'TOGGLE_POINT_CLOUD', payload: { pointCloudId: String(file.id) } })
  }, [dispatch])

  if (clouds.length === 0) return null

  return (
    <CollapsibleSection title={t('title')} icon={LR.Grip} itemCount={clouds.length}>
      {clouds.map((file) => (
        <FileItemComponent
          key={file.id}
          file={{ ...file, isVisible: pointCloudIds.includes(String(file.id)) }}
          onAction={onAction}
          options={OPTIONS}
        />
      ))}
    </CollapsibleSection>
  )
}
