// @vitest-environment jsdom
import * as React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { WmsTimeControl } from './WmsTimeControl'

const frames = [
  '2026-01-01T00:00:00Z',
  '2026-01-01T01:00:00Z',
  '2026-01-01T02:00:00Z',
]

test('defaults to the latest frame and reports it up', () => {
  const onTimeChange = vi.fn()
  render(<WmsTimeControl frames={frames} onTimeChange={onTimeChange} />)
  expect(onTimeChange).toHaveBeenLastCalledWith(frames[2])
})

test('scrubbing the slider reports the selected frame', () => {
  const onTimeChange = vi.fn()
  render(<WmsTimeControl frames={frames} onTimeChange={onTimeChange} />)
  fireEvent.change(screen.getByRole('slider'), { target: { value: '0' } })
  expect(onTimeChange).toHaveBeenLastCalledWith(frames[0])
})

test('play/pause button toggles its label', () => {
  render(<WmsTimeControl frames={frames} onTimeChange={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Play' }))
  expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
})

test('renders nothing when there are no frames', () => {
  const { container } = render(<WmsTimeControl frames={[]} onTimeChange={vi.fn()} />)
  expect(container).toBeEmptyDOMElement()
})

test('shows the legend image when legendUrl is provided', () => {
  render(<WmsTimeControl frames={frames} onTimeChange={vi.fn()} legendUrl="http://x/legend.png" />)
  expect(screen.getByAltText('Legend')).toBeInTheDocument()
})

test('play advances frames on the interval and wraps at the end', () => {
  vi.useFakeTimers()
  try {
    const onTimeChange = vi.fn()
    render(<WmsTimeControl frames={frames} onTimeChange={onTimeChange} stepMs={500} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play' })) // starts at latest (index 2)
    act(() => { vi.advanceTimersByTime(500) })
    expect(onTimeChange).toHaveBeenLastCalledWith(frames[0]) // (2 + 1) % 3 = 0
  } finally {
    vi.useRealTimers()
  }
})
