// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('../../../../../../../../store', async () => ({
  BimContext: (
    await vi.importActual<typeof import('../../../../../../../../store/BIM/context')>(
      '../../../../../../../../store/BIM/context',
    )
  ).BimContext,
}))

vi.mock('../../../../../../../../hooks/files/files', () => ({
  useDeleteFile: () => ({ deleteFile: vi.fn() }),
}))

vi.mock('../../../../PointClouds', () => ({ BimPointClouds: class {} }))

vi.mock('../../../../Placement/PlacementEditor', () => ({ PlacementEditor: class {} }))

vi.mock('../../../../Placement/targets/usePointCloudTarget', () => ({
  usePointCloudTarget: () => ({ targetFor: vi.fn(), clearMoving: vi.fn() }),
}))

vi.mock('../../../../PointClouds/useBimPointCloudOpacity', () => ({
  useBimPointCloudOpacity: () => ({ isGhosted: () => false, setGhosted: vi.fn() }),
}))

vi.mock('../../../../PointClouds/usePointCloudIntake', () => ({
  usePointCloudIntake: () => ({ upload: vi.fn(), convert: vi.fn(), busy: false }),
}))

vi.mock('../../../../../../../ui/FilesManager', async () => ({
  ...(await vi.importActual<typeof import('../../../../../../../ui/FilesManager')>(
    '../../../../../../../ui/FilesManager',
  )),
  FileItemComponent: () => null,
  useFileActions: () => ({
    handleAction: vi.fn(),
    deleteDialog: { isOpen: false, isDeleting: false, onOpenChange: vi.fn(), onConfirm: vi.fn(), itemName: '' },
  }),
  useFileDeleteHandler: () => ({ handleDeleteFile: vi.fn() }),
}))

import { BimContext } from '../../../../../../../../store/BIM/context'
import { beginTask, endTask, getSnapshot } from '../../../../../../../ui/FilesManager/src/uploadProgress'
import { stripPointCloudExtension } from '../../../../PointClouds/pointCloudFiles'

import { PointCloudsSection } from './PointCloudsSection'

import type { DbFile } from '../../../../../../../../types/dbTypes'

const PICKED_FILE_NAME = 'scan.laz'

const CLOUD: DbFile = {
  id: 1,
  name: stripPointCloudExtension(PICKED_FILE_NAME),
  pointCloudUploaded: true,
  pointCloudPotreeConverted: false,
} as DbFile

function renderSection() {
  const bimValue = {
    state: { bim: { bimComponents: null, pointCloudIds: [] } },
    dispatch: vi.fn(),
  }
  return render(
    <BimContext.Provider value={bimValue as any}>
      <PointCloudsSection files={[CLOUD]} buildingId={1} />
    </BimContext.Provider>,
  )
}

describe('PointCloudsSection recovery buttons', () => {
  beforeEach(() => {
    for (const task of getSnapshot()) endTask(task.id)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows the convert button when nothing is in flight for the row', () => {
    renderSection()

    expect(screen.getByRole('button', { name: 'convertTitle' })).toBeInTheDocument()
  })

  it('hides the convert button while a task for that row is in flight', () => {
    const name = stripPointCloudExtension(PICKED_FILE_NAME)
    const id = beginTask({ name, fileType: 'point-cloud-file', phase: 'converting', label: 'x', progress: 0 })

    renderSection()

    expect(screen.queryByRole('button', { name: 'convertTitle' })).not.toBeInTheDocument()

    endTask(id)
  })
})
