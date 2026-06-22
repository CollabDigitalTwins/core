'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun, Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Button } from './Button'
import { CdtIcon } from './Icons/CdtIcon'
import { Language } from '../../types/dbTypes'

interface NavbarProps {
  activeSection: string
  theme: 'light' | 'dark'
  locale: Language
  navOpacity?: any
  navY: any
  onToggleTheme: () => void
  onToggleLanguage: () => void
  onScrollToSection: (id: string) => void
  showNavigation?: boolean
}

export default function Navbar({
  activeSection,
  theme,
  locale,
  navOpacity,
  navY,
  onToggleTheme,
  onToggleLanguage,
  onScrollToSection,
  showNavigation = true,
}: NavbarProps) {
  const tNav = useTranslations('HomePage.nav')
 // const tHero = useTranslations('HomePage.hero')
  const nextLocale = locale === Language.En ? Language.Fr : Language.En
  const [onMobile, setOnMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentSection, setCurrentSection] = useState(activeSection)

  useEffect(() => {
    const checkMobile = () => setOnMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    setCurrentSection(activeSection)
  }, [activeSection])

  return (
    <motion.nav
      style={{ y: navY }}
      className="glass-nav fixed top-0 left-0 right-0 z-50"
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-shrink-0"
          >
            <Link href="#hero" className="flex items-center gap-3 group">
              <CdtIcon className="w-8 h-8" />
              <span
                className="font-display font-bold tracking-tight max-xs:text-sm max-xs:text-nowrap transition-colors duration-200"
                style={{ color: 'var(--hp-on-surface)' }}
              >
                {onMobile ? 'CDT' : 'Collab Digital Twins'}
              </span>
            </Link>
          </motion.div>

          {/* Nav links */}
          {showNavigation && (
            <div className={`${onMobile ? 'hidden' : 'flex'} items-center gap-1 flex-1 justify-center`}>
              {['about', 'contributors', 'contact'].map((section) => (
                <button
                  key={section}
                  onClick={() => {
                    setCurrentSection(section)
                    onScrollToSection(section)
                  }}
                  className="relative px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize font-display"
                  style={{
                    color: currentSection === section
                      ? 'var(--hp-primary-container)'
                      : 'var(--hp-on-surface-variant)',
                    fontWeight: currentSection === section ? 700 : 500,
                  }}
                >
                  {tNav(section as any)}
                  {currentSection === section && (
                    <motion.div
                      layoutId="activeSection"
                      className="absolute -bottom-[17px] left-2 right-2 h-[2px]"
                      style={{ background: 'var(--hp-primary-container)' }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
            <div className={`${onMobile ? 'hidden' : 'flex'} items-center gap-3`}>
              

              <Button
                variant="ghost"
                onClick={onToggleTheme}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--hp-on-surface-variant)' }}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              <Button
                size="sm"
                className="btn-nav-cta rounded-md px-5 text-sm"
                asChild
              >
               
              </Button>
            </div>

            {/* Mobile toggle */}
            <Button
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--hp-on-surface-variant)' }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-4 space-y-1 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                {showNavigation &&
                  ['about', 'contributors', 'contact'].map((section) => (
                    <button
                      key={section}
                      onClick={() => {
                        setCurrentSection(section)
                        onScrollToSection(section)
                        setMobileMenuOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all capitalize font-display"
                      style={{
                        color: currentSection === section
                          ? 'var(--hp-primary-container)'
                          : 'var(--hp-on-surface-variant)',
                        background: currentSection === section
                          ? 'rgba(239, 145, 97, 0.08)'
                          : 'transparent',
                      }}
                    >
                      {tNav(section as any)}
                    </button>
                  ))}

                <div className="flex items-center gap-2 px-4 py-2 pt-3">
                  <Button
                    variant="ghost"
                    onClick={onToggleTheme}
                    className="flex-1 p-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    style={{ color: 'var(--hp-on-surface-variant)' }}
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span className="text-sm">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                  </Button>
                  
                </div>

                <div className="pt-2 px-1">
                  <Button
                    size="sm"
                    className="btn-sovereign w-full rounded-md"
                    asChild
                  >
                   
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  )
}
