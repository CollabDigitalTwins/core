// @vitest-environment jsdom
import * as React from 'react'
import { act, render, screen, fireEvent } from '@testing-library/react'

const { deleteCommentMock, toolsDispatchMock, menusDispatchMock, toastSuccess } = vi.hoisted(() => ({
  deleteCommentMock: vi.fn(),
  toolsDispatchMock: vi.fn(),
  menusDispatchMock: vi.fn(),
  toastSuccess: vi.fn(),
}))

const sampleComments: any[] = [
  { id: 1, text: 'roads need fixing', viewer: 'map', buildingId: null, authorId: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 2, text: 'lights too bright', viewer: 'bim', buildingId: 11, authorId: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 3, text: 'paint peeling',     viewer: 'map', buildingId: 11, authorId: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
]

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock('../../../store', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    usePermissions: () => ({ ability: { can: () => true } }),
    BuildingsContext: React.createContext({ state: { buildings: { building: { id: 11 } } } }),
    MenusContext: React.createContext({
      state: { menus: { currentViewer: 'map', commentsVisibleInViewer: ['map'] } },
      dispatch: (...a: unknown[]) => menusDispatchMock(...a),
    }),
    ToolsContext: React.createContext({
      state: { tools: { currentToolId: null } },
      dispatch: (...a: unknown[]) => toolsDispatchMock(...a),
    }),
  }
})
vi.mock('../CollapsibleSection', () => ({
  CollapsibleSection: ({ title, itemCount, onAddItem, children, switchVariant }: any) => (
    <div data-testid="collapsible-section">
      <span>{title}</span>
      <span data-testid="item-count">{itemCount}</span>
      <button onClick={onAddItem} aria-label="add">add</button>
      <button onClick={() => switchVariant?.onCheckedChange()} aria-label="toggle-visibility">toggle</button>
      <div>{children}</div>
    </div>
  ),
}))
vi.mock('../SearchInput', () => ({
  SearchInput: (props: any) => <input role="searchbox" {...props} />,
}))
vi.mock('./CollapsibleCommentItem', () => ({
  CollapsibleCommentItem: ({ comment, onAction }: any) => (
    <div data-testid={`comment-${comment.id}`}>
      <span>{comment.text}</span>
      <button onClick={() => onAction?.('delete', comment.id)}>delete</button>
    </div>
  ),
}))
vi.mock('../../../hooks/comments/comments', () => ({
  useComments: () => ({ comments: sampleComments }),
  useComment: () => ({ deleteComment: deleteCommentMock }),
}))
vi.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn() },
}))

import { CommentsSection } from './CommentsSection'

beforeEach(() => {
  deleteCommentMock.mockReset()
  toolsDispatchMock.mockReset()
  menusDispatchMock.mockReset()
  toastSuccess.mockReset()
})

describe('CommentsSection', () => {
  it('shows only the comments for the current viewer and current building', () => {
    render(<CommentsSection />)
    // currentViewer="map", buildingId=11 → only comments with viewer=map
    // AND (no buildingId OR buildingId=11). That's id 1 (no buildingId) and id 3 (buildingId=11).
    expect(screen.getByTestId('comment-1')).toBeInTheDocument()
    expect(screen.getByTestId('comment-3')).toBeInTheDocument()
    expect(screen.queryByTestId('comment-2')).not.toBeInTheDocument()
    expect(screen.getByTestId('item-count')).toHaveTextContent('2')
  })

  it('filters the visible comments by search query (case-insensitive substring)', () => {
    render(<CommentsSection />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'PAINT' } })
    expect(screen.queryByTestId('comment-1')).not.toBeInTheDocument()
    expect(screen.getByTestId('comment-3')).toBeInTheDocument()
    expect(screen.getByTestId('item-count')).toHaveTextContent('1')
  })

  it('clicking delete sets the comment-id-to-delete and invokes deleteComment via useEffect', async () => {
    render(<CommentsSection />)
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'delete' })[0])
    })
    expect(toastSuccess).toHaveBeenCalledWith('commentDeleted')
    expect(deleteCommentMock).toHaveBeenCalled()
  })

  it('Add Comment dispatches the right tool id based on the current viewer', () => {
    render(<CommentsSection />)
    fireEvent.click(screen.getByLabelText('add'))
    expect(toolsDispatchMock).toHaveBeenCalledWith({
      type: 'SET-TOOL',
      payload: { currentToolId: 'map-add-comment' },
    })
  })

  it('toggle-visibility dispatches HIDE_COMMENTS_IN_VIEWER when currently visible', () => {
    render(<CommentsSection />)
    fireEvent.click(screen.getByLabelText('toggle-visibility'))
    expect(menusDispatchMock).toHaveBeenCalledWith({
      type: 'HIDE_COMMENTS_IN_VIEWER',
      payload: { viewer: 'map' },
    })
  })
})
