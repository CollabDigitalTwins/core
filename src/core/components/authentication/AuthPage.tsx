'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import React, { useState, useEffect, createContext, useContext } from 'react'
import dynamic from 'next/dynamic'
import { Logo } from '../Logo'
import { useTranslations } from 'next-intl'
import LanguageSwitch from '../LanguageSwitch'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Sun, Moon } from 'lucide-react'
import AuthSimpleMap from '../viewers/map/src/SimpleMap'
import { CdtIcon } from '../ui/Icons/CdtIcon'
import './auth.css'

const AnimatedBackground = dynamic(() => import('../ui/AnimatedBackground'), {
  ssr: false,
})

export const AuthThemeContext = createContext<'light' | 'dark'>('dark')
export const useAuthTheme = () => useContext(AuthThemeContext)

interface AuthPageProps {
  children: React.ReactNode
}

export function AuthPage({ children }: AuthPageProps) {
  const params = useParams<{ instance: string }>()
  const orgName = params.instance ?? 'cdt'
  const minioBaseUrl = process.env.NEXT_PUBLIC_MINIO_BUCKET_URL
  const logo = minioBaseUrl
    ? `${minioBaseUrl}/org-logos/${orgName}-logo.png`
    : `/images/cdt-logo-stroke.svg`
  const brandPrefix = orgName === 'cdt' ? 'collab' : orgName
  const brandSuffix = orgName === 'cdt' ? 'digitaltwins' : 'digitaltwin'
  const title = `${brandPrefix}${brandSuffix}`
  const t = useTranslations('AuthPage')

  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [isMobile, setIsMobile] = useState(false)
  const [globePadding, setGlobePadding] = useState({ top: 0, bottom: 0, left: 0, right: 0 })

  useEffect(() => {
    setTheme('dark')
  }, [])

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
        style={{ background: 'var(--hp-mid)' }}
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
              {orgName === 'cdt' ? (
                <CdtIcon className="w-8 h-8" />
              ) : (
                <Logo image={logo} title={title} className="w-8 h-8" />
              )}
              <span className="font-display text-xl tracking-wide max-xs:text-sm max-xs:text-nowrap lowercase transition-colors duration-200">
                <span style={{ color: 'var(--hp-primary-container)' }}>{brandPrefix}</span>
                {brandSuffix}
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
