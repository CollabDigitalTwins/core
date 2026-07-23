'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { Avatar } from '../../../../../../ui/Avatar'
import { UserAvatar } from '../../../../../../ui/UserAvatar'

export interface ClusterMember {
  id: number
  userName?: string
  imageFileId?: number | null
}

interface BimCommentClusterProps {
  members: ClusterMember[]
  highlight?: boolean
  onSelect?: (id: number) => void
}

/**
 * Rendered inside a CSS2DObject at a cluster's world center. Shows a numbered
 * circle for overlapping BIM comment markers; hovering fans the members out so
 * each can be seen and clicked.
 */
export default function BimCommentCluster({ members, highlight = false, onSelect }: BimCommentClusterProps): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false)
  const count = members.length
  const radius = Math.min(64, 26 + count * 4)

  return (
    <div
      className="relative -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div
        className="flex items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium select-none cursor-pointer shadow-md"
        style={{
          width: 36,
          height: 36,
          boxShadow: highlight
            ? '0 0 0 2px #73cee2, 0 0 8px rgba(115, 206, 226, 0.5)'
            : '0 0 0 1px white',
        }}
      >
        {count}
      </div>

      {expanded && (
        <div className="absolute left-1/2 top-1/2">
          {members.map((member, i) => {
            const angle = (2 * Math.PI * i) / count - Math.PI / 2
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            return (
              <div
                key={member.id}
                className="absolute"
                style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
                onClick={() => onSelect?.(member.id)}
              >
                <div
                  className="h-9 w-9 rounded-full overflow-hidden cursor-pointer bg-card"
                  style={{ boxShadow: '0 0 0 1px white' }}
                >
                  <Avatar className="h-full w-full">
                    <UserAvatar
                      imageFileId={member.imageFileId ?? null}
                      name={member.userName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </Avatar>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
