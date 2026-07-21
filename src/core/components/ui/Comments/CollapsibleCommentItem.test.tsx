// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'

// Permissions module — return an ability that allows everything.
vi.mock('../../../store', () => ({
  usePermissions: () => ({
    ability: { can: () => true },
  }),
}))
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: '7' } } }),
}))
vi.mock('../../../hooks/users/users', () => ({
  useUser: () => ({ user: { name: 'Alice', imageFileId: null } }),
}))
vi.mock('..', () => ({
  Button: ({ children, onClick, disabled, title }: any) => (
    <button onClick={onClick} disabled={disabled} title={title}>{children}</button>
  ),
  Badge: ({ children }: any) => <span>{children}</span>,
  Input: (props: any) => <input {...props} />,
}))
vi.mock('../Avatar', () => ({
  Avatar: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('../UserAvatar', () => ({
  UserAvatar: ({ name }: any) => <span>{name}</span>,
}))
vi.mock('date-fns', () => ({
  format: (d: Date) => d.toISOString(),
}))

import { CollapsibleCommentItem } from './CollapsibleCommentItem'

const baseComment = {
  id: 1,
  authorId: 7,
  text: 'Hello world',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
} as any

describe('CollapsibleCommentItem', () => {
  it('renders the comment text and author', () => {
    render(<CollapsibleCommentItem comment={baseComment} />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    // Author name appears in both the header label and the avatar fallback.
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1)
  })

  it('shows reply count when collapsed and replies exist', () => {
    render(
      <CollapsibleCommentItem
        comment={baseComment}
        replies={[{ ...baseComment, id: 2, text: 'A reply' }]}
      />,
    )
    expect(screen.getByText(/^1\s*reply/i)).toBeInTheDocument()
  })

  it('shows an "edited" badge when updatedAt differs from createdAt', () => {
    render(
      <CollapsibleCommentItem
        comment={{ ...baseComment, updatedAt: '2025-01-02T00:00:00Z' }}
      />,
    )
    expect(screen.getByText(/edited/i)).toBeInTheDocument()
  })

  it('fires onAction with "delete" + id when the delete button is clicked', () => {
    const onAction = vi.fn()
    render(<CollapsibleCommentItem comment={baseComment} onAction={onAction} />)

    fireEvent.click(screen.getByTitle('deleteComment'))

    expect(onAction).toHaveBeenCalledWith('delete', 1)
  })

  it('does not render edit/delete buttons when the session user is not the author', () => {
    const otherAuthor = { ...baseComment, authorId: 99 }
    const onAction = vi.fn()
    render(<CollapsibleCommentItem comment={otherAuthor} onAction={onAction} />)

    expect(screen.queryByTitle('editComment')).not.toBeInTheDocument()
    expect(screen.queryByTitle('deleteComment')).not.toBeInTheDocument()
  })
})
