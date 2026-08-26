'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Sun, Moon } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import React, { useState, useEffect, useMemo, createContext, useContext } from 'react'

import LanguageSwitch from '../LanguageSwitch'
import { CdtIcon } from '../ui/Icons/CdtIcon'
import AuthSimpleMap from '../viewers/map/src/SimpleMap'
import './auth.css'

const AnimatedBackground = dynamic(() => import('../ui/AnimatedBackground'), {
  ssr: false,
})

export const AuthThemeContext = createContext<'light' | 'dark'>('dark')
export const useAuthTheme = () => useContext(AuthThemeContext)

const LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg']


interface AuthPageProps {
  children: React.ReactNode
  minioBaseUrl?: string
}

export function AuthPage({ children, minioBaseUrl, }: AuthPageProps) {
  const params = useParams<{ instance: string }>()
  const orgName = params.instance ?? 'cdt'
  const logoCandidates = useMemo(
    () =>
      minioBaseUrl && orgName !== 'cdt'
        ? LOGO_EXTENSIONS.map(ext => `${minioBaseUrl}/org-logos/${orgName}-logo.${ext}`)
        : [],
    [minioBaseUrl, orgName],
  )
  const brandName = 'cdt' // terracotta accent
  const brandSuffix = 'platform'
  const orgLabel = orgName === 'cdt' ? '' : orgName
  const title = orgLabel ? `${brandName}${brandSuffix} | ${orgLabel}` : `${brandName}${brandSuffix}`
  const t = useTranslations('AuthPage')

  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [isMobile, setIsMobile] = useState(false)
  const [globePadding, setGlobePadding] = useState({ top: 0, bottom: 0, left: 0, right: 0 })
  const [logo, setLogo] = useState<string | null>(null)

  useEffect(() => {
    setTheme('dark')
  }, [])

  // Probing with a detached Image() rather than the rendered <img>'s onError avoids the SSR/hydration race where the image errors before React can attach a handler.
  useEffect(() => {
    setLogo(null)
    let cancelled = false
    let probe: HTMLImageElement | null = null

    const probeFrom = (index: number) => {
      if (cancelled || index >= logoCandidates.length) return
      const src = logoCandidates[index]
      const image = new window.Image()
      probe = image
      // An SVG with no intrinsic size can report naturalWidth 0, so only raster candidates are size-checked.
      image.onload = () => {
        if (cancelled) return
        if (image.naturalWidth === 0 && !src.endsWith('.svg')) probeFrom(index + 1)
        else setLogo(src)
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
  }, [logoCandidates])

  useEffect(() => {
    const update = () => {
      const isMd = window.innerWidth >= 768
      setIsMobile(!isMd)
      setGlobePadding({ top: 0, bottom: 0, left: isMd ? window.innerWidth / 2 : 0, right: 0 })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <AuthThemeContext.Provider value={theme}>
      {/* Toggle .dark on THIS div — CSS vars cascade to all children, no global html conflict */}
      <div
        className={`auth-page relative flex min-h-screen w-screen flex-col md:flex-row${theme === 'dark' ? ' dark' : ''}`}
      >
        {/* Animated background — bottom layer */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <AnimatedBackground theme={theme} />
        </div>

        {/* Globe — on top of animated background, centered on right half */}
        <div className="absolute inset-0 z-[1] pointer-events-none">
          <AuthSimpleMap
            width="100%"
            height="100%"
            mapStyleUrl={'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'}
            showCountryLayer={false}
            padding={globePadding}
          />
        </div>

        {/* Left — Form side (transparent — globe shows through around the card) */}
        <div className="relative z-10 w-full md:w-1/2 flex min-h-screen md:min-h-0 flex-col">
          {/* Top bar: logo + language */}
          <div className="flex items-center justify-between px-8 pt-8 pb-4">
            <div className="flex items-center gap-3" style={{ color: 'var(--hp-on-surface)' }}>
              {logo === null ? (
                <CdtIcon className="w-8 h-8" />
              ) : (
                <img
                  src={logo}
                  alt={title}
                  title={title}
                  className="w-8 h-8 object-contain"
                />
              )}
              <span className="font-display text-xl tracking-wide max-xs:text-sm max-xs:text-nowrap lowercase transition-colors duration-200">
                <span style={{ color: 'var(--hp-primary-container)' }}>{brandName}</span>
                {brandSuffix}
                {orgLabel && (
                  <>
                    <span style={{ color: 'var(--hp-primary-container)' }}> | </span>
                    {orgLabel}
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isMobile ? (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="auth-theme-toggle"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
              ) : null}
              <LanguageSwitch variant="outline" />
            </div>
          </div>

          {/* Form area — centered on mobile screen and desktop panel */}
          <div className="auth-form-area flex-1 flex items-center justify-center px-6 overflow-y-auto py-6">
            <div className="auth-card p-10 w-full max-w-md space-y-6">
              {children}
            </div>
          </div>

          {/* Footer (mobile) */}
          {isMobile ? (
            <div className="mt-auto px-3 pb-8 flex flex-row items-center justify-center flex-shrink-0">
              <Link href="https://collabdt.org/" className="text-xs text-center" style={{ color: 'var(--hp-outline)' }}>
                {t('footerText')}
              </Link>
            </div>
          ) : null}
        </div>

        {/* Footer (desktop) */}
        {!isMobile ? (
          <>
            <button
              type="button"
              onClick={toggleTheme}
              className="auth-theme-toggle fixed bottom-8 left-6 z-30"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <Link
              href="https://collabdt.org/"
              className="fixed bottom-8 left-1/2 z-30 -translate-x-1/2 text-center text-xs"
              style={{ color: 'var(--hp-outline)' }}
            >
              {t('footerText')}
            </Link>
          </>
        ) : null}

        {/* Right — transparent spacer */}
        <div className="hidden md:block md:w-1/2 md:h-screen" />
      </div>
    </AuthThemeContext.Provider>
  )
}
