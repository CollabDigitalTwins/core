// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('../../../../../../../../store', async () => {
  const bim = await vi.importActual<typeof import('../../../../../../../../store/BIM/context')>(
    '../../../../../../../../store/BIM/context',
  )
  const buildings = await vi.importActual<typeof import('../../../../../../../../store/Buildings/context')>(
    '../../../../../../../../store/Buildings/context',
  )
  return { BimContext: bim.BimContext, BuildingsContext: buildings.BuildingsContext }
})

vi.mock('../../../../../../../../hooks/files/files', () => ({
  useUploadFileToBuilding: () => ({ uploadFile: vi.fn() }),
  useDeleteFile: () => ({ deleteFile: vi.fn() }),
  useFile: () => ({ updateFile: vi.fn() }),
}))

vi.mock('../../../../lib/useBimFileIntake', () => ({
  useBimFileIntake: () => ({ submit: vi.fn(), needsPlacement: () => true }),
}))

vi.mock('../../../../Placement/usePlacementSession', () => ({ usePlacementSession: () => null }))

// jsdom can't load @thatopen/components; these are only used as bimComponents.get() keys.
vi.mock('../../../../PointClouds', () => ({ BimPointClouds: class {} }))
vi.mock('../../../../ModelManager', () => ({ ModelManager: class {} }))
vi.mock('../../../../DXFLoader', () => ({ DXFManager: class {} }))
vi.mock('../../../../Highlighter', () => ({ Highlighter: class {} }))
vi.mock('../../../../CurrentWorld', () => ({ CurrentWorld: class {} }))
vi.mock('../../../../Cursor', () => ({ Cursor: class {} }))
vi.mock('../../../../Placement/PlacementEditor', () => ({ PlacementEditor: class {} }))
vi.mock('../../../../SceneObjects', () => ({ BimSceneObjects: class {} }))

vi.mock('../../../../../../../ui/FilesManager', async () => ({
  ...(await vi.importActual<typeof import('../../../../../../../ui/FilesManager')>(
    '../../../../../../../ui/FilesManager',
  )),
  FileItemComponent: ({ file }: { file: { name: string } }) => <div>{file.name}</div>,
  useFileActions: () => ({
    handleAction: vi.fn(),
    deleteDialog: { isOpen: false, isDeleting: false, onOpenChange: vi.fn(), onConfirm: vi.fn(), itemName: '' },
  }),
  useFileDeleteHandler: () => ({ handleDeleteFile: vi.fn() }),
}))

import { BimContext } from '../../../../../../../../store/BIM/context'
import { BuildingsContext } from '../../../../../../../../store/Buildings/context'

import { ModelsSection } from './ModelsSection'

import type { DbFile } from '../../../../../../../../types/dbTypes'

const file = (id: number, name: string, extension: string): DbFile =>
  ({ id, name, extension }) as DbFile

function renderSection(files: DbFile[]) {
  const bim = { state: { bim: { bimComponents: null, fragments: null, world: null } }, dispatch: vi.fn() }
  const buildings = { state: { buildings: { building: { id: 7 } } }, dispatch: vi.fn() }
  return render(
    <BimContext.Provider value={bim as never}>
      <BuildingsContext.Provider value={buildings as never}>
        <ModelsSection files={files} />
      </BuildingsContext.Provider>
    </BimContext.Provider>,
  )
}

describe('ModelsSection', () => {
  it('lists a 3D file it was given', () => {
    renderSection([file(1, 'tower.glb', 'glb')])

    expect(screen.getByText('tower.glb')).toBeInTheDocument()
  })

  it('lists every format the model loader supports, collada included', () => {
    renderSection([
      file(1, 'a.glb', 'glb'),
      file(2, 'b.gltf', 'gltf'),
      file(3, 'c.fbx', 'fbx'),
      file(4, 'd.obj', 'obj'),
      file(5, 'e.dae', 'dae'),
    ])

    for (const name of ['a.glb', 'b.gltf', 'c.fbx', 'd.obj', 'e.dae']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })
})
