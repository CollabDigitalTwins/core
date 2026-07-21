// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface LogoProps {
  width?: number
  height?: number
  className?: string
  image?: string
  title?: string
}

export const Logo: React.FC<LogoProps> = ({
  width = 24,
  height = 24,
  className = '',
  image,
  title = 'Canada\'s Digital Twin',
}) => {
  const t = useTranslations('Logo')
  const fallbackLogoImage = '/images/cdt-logo-stroke.svg'
  const [currentImage, setCurrentImage] = useState(image ?? fallbackLogoImage)

  useEffect(() => {
    setCurrentImage(image ?? fallbackLogoImage)
  }, [image])

  return (
    <img
      src={currentImage}
      width={width}
      height={height}
      alt={t('altText')}
      className={`w-auto h-6 ${className}`}
      title={title}
      onError={() => {
        if (currentImage !== fallbackLogoImage) {
          setCurrentImage(fallbackLogoImage)
        }
      }}
    />
  )
}
