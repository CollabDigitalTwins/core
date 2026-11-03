// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'

import { useFirstLoadableImage } from '../hooks/useFirstLoadableImage'
import { CDT_LOGO } from '../utils/orgLogo'

interface LogoProps {
  width?: number
  height?: number
  className?: string
  image?: string
  /** Tried in order when `image` is missing or fails; the CDT logo is always the last resort. */
  fallbacks?: readonly string[]
  title?: string
}

export const Logo: React.FC<LogoProps> = ({
  width = 24,
  height = 24,
  className = '',
  image,
  fallbacks = [],
  title,
}) => {
  const t = useTranslations('Logo')
  const loaded = useFirstLoadableImage([image, ...fallbacks, CDT_LOGO])

  if (!loaded) return <span aria-hidden className={`inline-block h-6 ${className}`} style={{ width }} />

  return (
    <img
      src={loaded}
      width={width}
      height={height}
      alt={t('altText')}
      className={`w-auto h-6 ${className}`}
      title={title}
    />
  )
}
