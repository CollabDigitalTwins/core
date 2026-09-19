// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ViewSectionList } from './ViewSectionList'

import type { ViewLoadingState } from './viewSection'

const ENTRIES = [{ id: 'l1', label: 'Level 1' }]
const IDLE: ViewLoadingState = { isLoading: false }

function renderList(overrides: Record<string, unknown> = {}) {
  const onGenerateLines = vi.fn()
  render(
    <ViewSectionList
      entries={ENTRIES}
      activeId="l1"
      pendingId={null}
      loading={IDLE}
      loadingPercent={100}
      activeLayers={null}
      loadingMessage="Loading"
      viewingPrefix="Viewing"
      exitLabel="Exit"
      goToLabel="Go to"
      downloadLabel="Download"
      layersLabel="Layers"
      toggleVisibilityLabel="Toggle"
      chooseColorLabel="Color"
      generateLinesLabel="Generate lines"
      canGenerateLines
      onGenerateLines={onGenerateLines}
      friendlyClassName={(name) => name}
      onSelect={() => {}}
      onExit={() => {}}
      onDownload={() => {}}
      onToggleLayer={() => {}}
      onChangeLayerColor={() => {}}
      {...overrides}
    />,
  )
  return { onGenerateLines }
}

describe('ViewSectionList generate-lines action', () => {
  it('offers the action while the active entry has no lines', () => {
    const { onGenerateLines } = renderList()

    fireEvent.click(screen.getByText('Generate lines'))

    expect(onGenerateLines).toHaveBeenCalledTimes(1)
  })

  it('hides the action once the entry has lines', () => {
    renderList({ canGenerateLines: false })

    expect(screen.queryByText('Generate lines')).toBeNull()
  })

  it('hides the action while the view is loading', () => {
    renderList({ loading: { isLoading: true, stage: 'project' } })

    expect(screen.queryByText('Generate lines')).toBeNull()
  })
})
