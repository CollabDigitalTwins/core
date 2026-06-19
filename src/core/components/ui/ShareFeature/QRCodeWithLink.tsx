"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { LoaderIcon } from 'lucide-react'
import React from 'react'

type QRCodeProps = {
  title: string
  urlToShare: string
  isLoadingState: boolean
}

const QRCodeLink = ({ title, urlToShare, isLoadingState }: QRCodeProps) => {
  const encoded = encodeURIComponent(urlToShare)
  const [imageLoaded, setImageLoaded] = React.useState(false)

  // Reset imageLoaded when urlToShare changes
  React.useEffect(() => {
    setImageLoaded(false)
  }, [urlToShare])

  const showLoader = isLoadingState || !imageLoaded

  return (
    <>
      <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded">
        {showLoader
          ? (
              <LoaderIcon className="animate-spin" />
            )
          : null}
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encoded}`}
          alt="QR Code"
          className={`${showLoader ? 'hidden' : 'block'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(false)}
        />
      </div>
      <span className="text-xs text-muted-foreground">{title}</span>
    </>
  )
}

export default QRCodeLink
