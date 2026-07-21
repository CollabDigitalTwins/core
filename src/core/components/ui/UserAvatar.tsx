'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { UserRound } from 'lucide-react'
import * as React from 'react'

import { useFile } from '../../hooks/files/files'

interface UserAvatarProps {
  imageFileId?: number | null
  name?: string
  className?: string
  previewSrc?: string | null
}

export function UserAvatar({ imageFileId, name, className = 'w-full h-full object-cover', previewSrc }: UserAvatarProps) {
  const { file } = useFile(imageFileId ?? null)
  const [imgError, setImgError] = React.useState(false)

  const normalizedPreviewSrc = typeof previewSrc === 'string' && previewSrc.trim().length > 0
    ? previewSrc
    : null
  const normalizedFileUrl = typeof file?.url === 'string' && file.url.trim().length > 0
    ? file.url
    : null
  const src = normalizedPreviewSrc ?? normalizedFileUrl

  React.useEffect(() => { setImgError(false) }, [src])

  if (!src || imgError) {
    return (
      <div className="w-full h-full text-primary-light flex items-center justify-center">
        <UserRound className={className} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name ?? 'User avatar'}
      className={className}
      onError={() => setImgError(true)}
    />
  )
}
