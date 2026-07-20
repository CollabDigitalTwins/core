'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useEffect, useState } from 'react'
import { useScroll, useSpring, useTransform } from 'framer-motion'
import { Toaster } from 'sonner'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

import Navbar from '../ui/Navbar'
import AnimatedBackground from '../ui/AnimatedBackground'
import OrganizationConfigContent  from './src/organizationConfigContent'

import type { Language } from '../../types/dbTypes'

export default function OrganizationConfigPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  const locale = useLocale() as Language
  const router = useRouter()

  const { scrollY } = useScroll()

  const navOpacity = useTransform(scrollY, [0, 100], [0.8, 1])

  const navY = useSpring(
    useTransform(scrollY, [0, 100], [0, 0]),
    {
      stiffness: 300,
      damping: 30,
    }
  )

  useEffect(() => {
    const isDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches

    setTheme(isDark ? 'dark' : 'light')

    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'

    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const toggleLanguage = () => {
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 1)

    document.cookie = `NEXT_LOCALE=${locale}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`

    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedBackground />

      <Toaster richColors />

      <Navbar
        activeSection=""
        theme={theme}
        locale={locale}
        navOpacity={navOpacity}
        navY={navY}
        onToggleTheme={toggleTheme}
        onToggleLanguage={toggleLanguage}
        onScrollToSection={() => {}}
        showNavigation={false}
      />

      <OrganizationConfigContent  />
    </div>
  )
}