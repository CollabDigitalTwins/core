'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useScroll, useTransform, useSpring } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useState, useEffect } from 'react'
import { toast, Toaster } from 'sonner'

import AnimatedBackground from '../ui/AnimatedBackground'
import Navbar from '../ui/Navbar'

import OrganizationNotFoundSection from './src/OrganizationNotFoundSection'

import type { Language } from '../../types/dbTypes'

interface InstanceNotFoundProps {
  organizationName: string
}

export function InstanceNotFound({ organizationName }: InstanceNotFoundProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const locale = useLocale() as Language
  const router = useRouter()
  const { scrollY } = useScroll()
  const navOpacity = useTransform(scrollY, [0, 100], [0.8, 1])
  const navY = useSpring(useTransform(scrollY, [0, 100], [0, 0]), { stiffness: 300, damping: 30 })

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(isDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const toggleLanguage = () => {

    // Set cookie that expires in 1 year
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 1)

    document.cookie = `NEXT_LOCALE=${locale}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`

    // Use router.refresh() to reload server components with new locale
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Store form reference before async operations
    const form = e.currentTarget

    const formData = new FormData(form)
    const data = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      organization: formData.get('organization') as string,
      message: formData.get('message') as string,
      requestedOrganization: organizationName, // Include the organization that was requested
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      toast.success('Request Sent!', {
        description: 'Thank you for your interest. We will get back to you soon.',
      })

      // Use the stored reference
      form.reset()

    } catch (error) {
      toast.error('Failed to send request', {
        description: 'Please try again later or email us directly at info@collabdt.org',
      })
    } finally {
      setIsSubmitting(false)
    }
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
      <OrganizationNotFoundSection
        organizationName={organizationName}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
