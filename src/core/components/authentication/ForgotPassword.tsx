'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Eye, EyeClosed } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import * as React from 'react'

// Direct file imports (not the ui barrel) — see Signin.tsx for rationale.
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'


import { AuthPage } from './AuthPage'
import { PasswordError } from './PasswordError'

export function ForgotPassword() {
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const t = useTranslations('forgotPassword')

  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [passwordErrors, setPasswordErrors] = React.useState<string[]>([])
  const [confirmPasswordError, setConfirmPasswordError] = React.useState('')
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false)

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    if (password.length < 12) errors.push('Password must be at least 12 characters')
    if (password.length > 65) errors.push('Password must be less than 65 characters')
    return errors
  }

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value
    setPassword(newPassword)
    if (newPassword) setPasswordErrors(validatePassword(newPassword))
    else setPasswordErrors([])
    if (confirmPassword) {
      setConfirmPasswordError(newPassword === confirmPassword ? '' : 'Passwords do not match')
    }
  }

  const handleConfirmPasswordChange = (e) => {
    const newConfirmPassword = e.target.value
    setConfirmPassword(newConfirmPassword)
    if (newConfirmPassword && password) {
      setConfirmPasswordError(newConfirmPassword === password ? '' : 'Passwords do not match')
    } else {
      setConfirmPasswordError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setHasAttemptedSubmit(true)
    const errors = validatePassword(password)
    setPasswordErrors(errors)
    if (password === confirmPassword) setConfirmPasswordError('')
    else setConfirmPasswordError('Passwords do not match')
    if (errors.length > 0 || password !== confirmPassword) return
    setError('')
    setIsLoading(true)
    // password reset logic here
  }

  return (
    <AuthPage>
      {/* Header */}
      <div className="space-y-2 text-left">
        <h1
          className="font-display font-bold"
          style={{
            fontSize: '1.75rem',
            lineHeight: '1.1',
            letterSpacing: '-0.02em',
            color: 'var(--hp-on-surface)',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {t('h1')}
        </h1>
        <p style={{ color: 'var(--hp-on-surface-variant)', fontSize: '0.9rem' }}>
          {t('subHeader')}
        </p>
      </div>

      {/* Form */}
      <form id="resetForm" onSubmit={handleSubmit} className="space-y-4">
        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <label htmlFor="password" className="auth-label">{t('inputLabel')}</label>
            {hasAttemptedSubmit && passwordErrors.length > 0 && (
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff6b6b' }} />
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('placeholder1')}
              value={password}
              onChange={handlePasswordChange}
              required
              className={`auth-input pr-10 ${hasAttemptedSubmit && passwordErrors.length > 0 ? 'border-destructive' : ''}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: 'var(--hp-on-surface-variant)' }}
            >
              {showPassword ? <EyeClosed className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {hasAttemptedSubmit && passwordErrors.map((err, i) => (
            <PasswordError key={i} message={err} />
          ))}
          {(!hasAttemptedSubmit || passwordErrors.length === 0) && (
            <p className="text-xs" style={{ color: 'var(--hp-on-surface-variant)' }}>{t('lenError')}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <label htmlFor="confirmPassword" className="auth-label">{t('confirmInputLabel')}</label>
            {hasAttemptedSubmit && confirmPasswordError && (
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff6b6b' }} />
            )}
          </div>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t('placeholder2')}
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
              className={`auth-input pr-10 ${hasAttemptedSubmit && confirmPasswordError ? 'border-destructive' : ''}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: 'var(--hp-on-surface-variant)' }}
            >
              {showConfirmPassword ? <EyeClosed className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {hasAttemptedSubmit && confirmPasswordError && (
            <PasswordError message={confirmPasswordError} />
          )}
        </div>
      </form>

      {/* Submit + link */}
      <div className="space-y-4 pt-2">
        <Button type="submit" form="resetForm" className="auth-btn-primary w-full h-10">
          {t('submit')}
        </Button>
        <p className="text-sm text-center" style={{ color: 'var(--hp-on-surface-variant)' }}>
          <Link className="underline" href="/cdt/auth/Signin" style={{ color: 'var(--hp-primary-container)' }}>
            {t('linkSignin')}
          </Link>
        </p>
      </div>
    </AuthPage>
  )
}
