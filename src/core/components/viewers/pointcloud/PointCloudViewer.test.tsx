// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render } from '@testing-library/react'
import * as React from 'react'

import { PointCloudViewer } from './PointCloudViewer'

// Layout regression guard for the mobile scroll/shake bug. Potree resizes its
// canvas to renderArea.clientWidth/Height inside its own render loop, so the
// canvas is always one frame behind the container. On mobile the visible
// viewport changes as the browser toolbar slides, so the stale (larger) canvas
// escapes the container and makes the app's `overflow-auto` main scrollable —
// which slides the toolbar again, resizing the container, forever.
// jsdom has no layout engine, so the invariant we can assert is the one that
// stops the escape: the render surface must clip its overflow and must not let
// touch gestures reach the page scroller.

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('../../../hooks/files/files', () => ({
  useFilesByBuildingId: () => ({ files: [], isError: false }),
}))

vi.mock('../useCoordinateSystem', () => ({
  usePointCloudCoordinateSystem: () => undefined,
}))

vi.mock('./utils/potreeLoader', () => ({
  loadAllAssets: () => Promise.resolve(),
}))

vi.mock('./utils/restoreCameraFromUrl', () => ({
  restoreCameraFromUrl: () => false,
}))

vi.mock('./src/ViewportGizmo', () => ({
  ViewportGizmo: class {
    enabled = false
    add() {}
    remove() {}
    dispose() {}
  },
}))

vi.mock('./src/PointCloudLoadingState', () => ({
  PointCloudLoadingState: () => <div data-testid="pc-loading-state" />,
}))

vi.mock('../../../store', async () => {
  const react = await import('react')
  return {
    PointCloudContext: react.createContext({
      state: { pointcloud: { ready: false, viewer: null, loadedPointCloudIds: [] } },
      dispatch: () => undefined,
    }),
    BuildingsContext: react.createContext({
      state: { buildings: { building: null } },
      dispatch: () => undefined,
    }),
  }
})

function renderViewer() {
  const { container } = render(<PointCloudViewer />)
  const potreeContainer = container.querySelector<HTMLElement>('.potree_container')
  if (!potreeContainer) throw new Error('potree container not rendered')
  return potreeContainer
}

test('the Potree render surface clips its overflow so a stale canvas cannot scroll the page', () => {
  expect(renderViewer().style.overflow).toBe('hidden')
})

test('the Potree render surface keeps touch gestures off the page scroller', () => {
  expect(renderViewer().style.touchAction).toBe('none')
})
