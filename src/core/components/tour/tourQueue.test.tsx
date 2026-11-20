// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { PLATFORM_TOUR_PLUGINS_PRIORITY, PLATFORM_TOUR_PRIORITY, TourPriorityContext, useTourTurn } from './tourQueue'

function Probe({ name }: { name: string }) {
  return useTourTurn() ? <p>{name}</p> : null
}

function Platform({ open }: { open: boolean }) {
  return open ? <TourPriorityContext.Provider value={PLATFORM_TOUR_PRIORITY}><Probe name="platform" /></TourPriorityContext.Provider> : null
}

function Page({ platform, plugins }: { platform: boolean; plugins: string[] }) {
  return <>{plugins.map(name => <Probe key={name} name={name} />)}<Platform open={platform} /></>
}

describe('useTourTurn', () => {
  it('shows one tour at a time, in the order they opened', () => {
    const { rerender, unmount } = render(<Page platform={false} plugins={['a', 'b']} />)
    expect(screen.getByText('a')).toBeTruthy()
    expect(screen.queryByText('b')).toBeNull()
    rerender(<Page platform={false} plugins={['b']} />)
    expect(screen.getByText('b')).toBeTruthy()
    unmount()
  })

  it('puts the platform tour ahead of a plugin tour and resumes the plugin after it', () => {
    const { rerender, unmount } = render(<Page platform plugins={['plugin']} />)
    expect(screen.getByText('platform')).toBeTruthy()
    expect(screen.queryByText('plugin')).toBeNull()
    rerender(<Page platform={false} plugins={['plugin']} />)
    expect(screen.getByText('plugin')).toBeTruthy()
    unmount()
  })

  it('lets the platform tour take over a plugin tour that is already showing', () => {
    const { rerender, unmount } = render(<Page platform={false} plugins={['plugin']} />)
    rerender(<Page platform plugins={['plugin']} />)
    expect(screen.getByText('platform')).toBeTruthy()
    expect(screen.queryByText('plugin')).toBeNull()
    unmount()
  })

  it('hands the turn to a lower-priority tour while a token drops below it, and takes it back', () => {
    function Shifting({ priority }: { priority: number }) {
      return <TourPriorityContext.Provider value={priority}><Probe name="platform" /></TourPriorityContext.Provider>
    }
    const page = (priority: number) => <><Probe name="plugin" /><Shifting priority={priority} /></>
    const { rerender, unmount } = render(page(PLATFORM_TOUR_PRIORITY))
    expect(screen.getByText('platform')).toBeTruthy()
    rerender(page(PLATFORM_TOUR_PLUGINS_PRIORITY))
    expect(screen.getByText('plugin')).toBeTruthy()
    expect(screen.queryByText('platform')).toBeNull()
    rerender(page(PLATFORM_TOUR_PRIORITY))
    expect(screen.getByText('platform')).toBeTruthy()
    expect(screen.queryByText('plugin')).toBeNull()
    unmount()
  })
})
