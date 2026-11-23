// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }))

vi.mock('sonner', () => ({ toast: toastMock }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('./useLastViewScope', () => ({ useLastViewScope: () => 'east:1' }))

import { LastViewPrompt } from './LastViewPrompt'
import { saveLastView } from './lastViewStore'

describe('LastViewPrompt', () => {
  beforeEach(() => {
    saveLastView('east:1', { viewer: 'bim', url: '/east?viewer=bim&buildingId=7&camX=1' })
  })

  afterEach(() => {
    window.localStorage.clear()
    toastMock.mockReset()
  })

  it('offers the remembered view when the entry URL names no location', () => {
    window.history.replaceState({}, '', '/east?viewer=map')

    render(<LastViewPrompt />)

    expect(toastMock).toHaveBeenCalledTimes(1)
    expect(toastMock).toHaveBeenCalledWith('title', expect.objectContaining({
      description: 'bimDescription',
      action: expect.objectContaining({ label: 'goBack' }),
    }))
  })

  it('stays quiet when the entry URL already names a location', () => {
    window.history.replaceState({}, '', '/east?viewer=map&municipality=Ottawa')

    render(<LastViewPrompt />)

    expect(toastMock).not.toHaveBeenCalled()
  })

  it('stays quiet when nothing was remembered', () => {
    window.localStorage.clear()
    window.history.replaceState({}, '', '/east')

    render(<LastViewPrompt />)

    expect(toastMock).not.toHaveBeenCalled()
  })

  it('offers once across re-renders', () => {
    window.history.replaceState({}, '', '/east')

    const { rerender } = render(<LastViewPrompt />)
    rerender(<LastViewPrompt />)

    expect(toastMock).toHaveBeenCalledTimes(1)
  })
})
