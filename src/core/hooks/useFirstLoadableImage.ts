'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useEffect, useState } from 'react'

const SEPARATOR = '\n'

function isUsable(image: HTMLImageElement, src: string): boolean {
  // An SVG with no intrinsic size reports naturalWidth 0 yet renders fine.
  return image.naturalWidth > 0 || src.toLowerCase().endsWith('.svg')
}

/** First candidate URL that loads, or null while probing and when none do. */
export function useFirstLoadableImage(candidates: readonly (string | null | undefined)[]): string | null {
  const candidatesKey = candidates.filter(Boolean).join(SEPARATOR)
  const [loaded, setLoaded] = useState<string | null>(null)

  // A detached Image() avoids the SSR race where a rendered <img> errors before React attaches onError.
  useEffect(() => {
    setLoaded(null)
    const sources = candidatesKey ? candidatesKey.split(SEPARATOR) : []
    let cancelled = false
    let probe: HTMLImageElement | null = null

    const probeFrom = (index: number) => {
      if (cancelled || index >= sources.length) return
      const src = sources[index]
      const image = new Image()
      probe = image
      image.onload = () => {
        if (cancelled) return
        if (isUsable(image, src)) setLoaded(src)
        else probeFrom(index + 1)
      }
      image.onerror = () => {
        if (!cancelled) probeFrom(index + 1)
      }
      image.src = src
    }

    probeFrom(0)
    return () => {
      cancelled = true
      if (probe) {
        probe.onload = null
        probe.onerror = null
      }
    }
  }, [candidatesKey])

  return loaded
}
