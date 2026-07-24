// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Comment } from '../../../types/dbTypes'

type BuildCommentParams = Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>
  & Partial<Pick<Comment, 'id' | 'createdAt' | 'updatedAt'>>
  & { now?: Date }


export function buildComment(params: BuildCommentParams): Partial<Comment> {
  const now = params.now ?? new Date()

  return {
    visible: true,
    authorId: params.authorId,
    organizationId: params.organizationId,
    image: params.image,
    text: params.text,
    longitude: params.longitude,
    latitude: params.latitude,
    elevation: params.elevation,
    x: params.x,
    y: params.y,
    z: params.z,
    viewer: params.viewer,
    buildingId: params.buildingId,
    replyToId: params.replyToId
  }
}
