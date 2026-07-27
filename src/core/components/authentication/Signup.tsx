'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Eye, EyeClosed } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

import { AuthPage } from './AuthPage'
// Direct file imports (not the ui barrel) — see Signin.tsx for rationale.


import { PasswordError } from './PasswordError'


export function SignUp() {
  const t = useTranslations('Signup')
  const params = useParams()
  const { theme } = params

  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
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
    // signup logic here
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
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="flex gap-x-4">
          <div className="space-y-2 flex-1">
            <label htmlFor="firstName" className="auth-label">{t('inputLabel1')}</label>
            <Input
              id="firstName"
              placeholder={t('placeholder1')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="auth-input"
            />
          </div>
          <div className="space-y-2 flex-1">
            <label htmlFor="lastName" className="auth-label">{t('inputLabel2')}</label>
            <Input
              id="lastName"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="auth-input"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="auth-label">{t('inputLabel3')}</label>
          <Input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <label htmlFor="password" className="auth-label">{t('passwordLabel1')}</label>
            {hasAttemptedSubmit && passwordErrors.length > 0 && (
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff6b6b' }} />
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
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
          {hasAttemptedSubmit && passwordErrors.map((error, index) => (
            <PasswordError key={index} message={error} />
          ))}
          {(!hasAttemptedSubmit || passwordErrors.length === 0) && (
            <p className="text-xs" style={{ color: 'var(--hp-on-surface-variant)' }}>{t('lenError')}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <label htmlFor="confirmPassword" className="auth-label">{t('passwordLabel2')}</label>
            {hasAttemptedSubmit && confirmPasswordError && (
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff6b6b' }} />
            )}
          </div>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
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

        <Button type="submit" className="auth-btn-primary w-full h-10">{t('submit')}</Button>
      </form>

      {/* Divider */}
      <div className="w-full relative py-2">
        <div
          className="text-xs px-3 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{ color: 'var(--hp-on-surface-variant)', background: 'var(--hp-mid)' }}
        >
          {t('or')}
        </div>
        <div className="auth-separator w-full" />
      </div>

      {/* Google auth */}
      <Button
        onClick={() => { void signIn('google', { callbackUrl: '/' }) }}
        className="auth-btn-outline w-full h-10"
      >
        <Image src="/images/Google__G__logo.svg" alt="Google logo" width={16} height={16} />
        {t('authProvider1')}
      </Button>

      <p className="text-sm text-center" style={{ color: 'var(--hp-on-surface-variant)' }}>
        {t('linkLabel')}{' '}
        <Link className="underline" href={`/${theme}/auth/signin`} style={{ color: 'var(--hp-primary-container)' }}>
          {t('linkSignIn')}
        </Link>
      </p>
    </AuthPage>
  )
}
