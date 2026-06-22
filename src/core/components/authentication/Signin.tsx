'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as LR from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Button, GoogleIcon, Input, LoadingSpinner } from '../ui'
import { AuthPage, useAuthTheme } from './AuthPage'
import { useParams, useSearchParams } from 'next/navigation'
import ReCAPTCHA from 'react-google-recaptcha'

// Where Auth.js sends a guest AFTER they authenticate with Google (the `redirectTo`).
// The Google provider only authenticates — for a first-time guest the app's signIn
// callback must create the user and assign the 'guest' role + instance (org id 25);
// the provider alone won't (today's callback rejects unlinked Google accounts).
// This is the guest instance route segment (its orgName).
const GUEST_REDIRECT_PATH = '/guest'

function SignInContent() {
  const [step, setStep] = React.useState<'login' | 'mfa'>('login')

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [code, setCode] = React.useState('')

  const [captchaStatus, setCaptchaStatus] = React.useState(false)
  const [captchaToken, setCaptchaToken] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  const searchParams = useSearchParams()
  const params = useParams()
  const orgName = params.instance ?? 'canada'
  const [googleError, setGoogleError] = React.useState(
    searchParams.get('error')
  )
  //Clean up the Google query error in URL, and have it only return /orgName/signin to clear frontend error responses 
  React.useEffect(() => {
    if (googleError) {
      window.history.replaceState({}, '', `/${orgName}/signin`)
    }
  }, [googleError, orgName])

  const t = useTranslations('Signin')
  const tMfa = useTranslations('MFA')
  const authTheme = useAuthTheme()

  const reCaptchaSiteKey = `${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`

  const onReCaptchaSuccess = (token) => {
    setCaptchaToken(token)
    setCaptchaStatus(true)
  }

  // Initial LOGIN
  const handleSubmit = async (e) => {
    e.preventDefault()
    setGoogleError(null)
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        captchaToken,
      })

      if (result?.error) {

        if (result.code === 'rate_limit_error') {

          setIsLoading(true)
          setError('Too many failed login attempts. Please try again later.')
          return
        }

        else if (result.code === 'whitelist_invalid_credentials') {
          setError('Invalid email or password')
          setIsLoading(false)
          return
        }

        else if (!captchaStatus) {

          setError('Captcha Verification Failed.')
          setIsLoading(false)
          return
        }

        else if (result.code === 'invalid_credentials') {
          setError('Invalid email or password')
          setIsLoading(false)
          return
        }
        //MFA TRIGGER
        else if (result.code === 'mfa_required') {
          setStep('mfa')
          setIsLoading(false)
          return
        }

        else { //result.code === 'expired_recaptcha_token
          setError('Captcha Verification Expired. Please try again later.')
          setIsLoading(false)
          return
        }
      }

      // Completed Login + MFA - Redirect to the Platform's Organization Dashboard 
      window.location.href = `/${orgName}`

    } catch (err) {
      setError('Unexpected error. Please try again.')
      setIsLoading(false)
    }
  }

  // VERIFY OTP for MFA
  const handleVerifyOTP = async () => {
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })

      if (!res.ok) {
        toast.error(tMfa('invalidCode'))
        setIsLoading(false)
        return
      }

      toast.success(tMfa('success'))

      // FINAL LOGIN after successful MFA process
      await signIn('credentials', {
        email,
        password,
        mfaVerified: true,
        redirect: true,
        redirectTo: `/${orgName}`,
      })

    } catch (err) {
      toast.error(tMfa('verificationFailed'))
      setIsLoading(false)
    }
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      {/* Header */}
      <div className="space-y-2 text-left">
        <h1 className="font-display font-bold" style={{
          fontSize: '1.75rem',
          lineHeight: '1.1',
          letterSpacing: '-0.02em',
          color: 'var(--hp-on-surface)',
        }}>
          {step === 'login' ? t('title') : tMfa('title')}
        </h1>

        <p style={{ color: 'var(--hp-on-surface-variant)', fontSize: '0.9rem' }}>
          {step === 'login'
            ? t('message')
            : tMfa('subtitle', { email })}
        </p>
      </div>

      {/* LOGIN FORM */}
      {step === 'login' && (
        <form onSubmit={handleSubmit} className="space-y-4">

          <Input
            type="email"
            placeholder={t('placeholder1')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('placeholder2')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--hp-on-surface-variant)' }}
            >
              {showPassword ? <LR.EyeOff size={16} /> : <LR.Eye size={16} />}
            </button>
          </div>
          {/* Google Not Linked Error */}
          {googleError === 'google_not_linked' && (
            <div className="auth-pw-error">
              Your Google account is not linked. Please sign in with your credentials first, then link your Google account.
            </div>
          )}
          {error && <div className="auth-pw-error">{error}</div>}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isLoading} className="flex-1 auth-btn-primary">
              {isLoading ? <LoadingSpinner /> : 'Login'}
            </Button>

            {/* Google button */}
            {<button
              type="button"
              onClick={() => signIn('google', { redirectTo: `/${orgName}` })}
              disabled={isLoading}
              aria-label="Sign in with Google"
              className="auth-google-btn"
            >
              <GoogleIcon size={20} />
            </button>}

          </div>

          {/*⚠️⚠️⚠️⚠️ DISABLED FOR NOW - Password Reset link, will implement in the future when we have the flow ready */}
          {/* Reset Password link */}
          {/* <div className="flex justify-start">
            <a
              href={`/${orgName}/auth/reset-password`}
              className="text-sm underline underline-offset-4 hover:opacity-80"
              style={{ color: 'var(--hp-primary)' }}
            >
              Reset your password
            </a>
          </div> */}
        </form>
      )}

      {/* MFA FORM */}
      {step === 'mfa' && (
        <div className="space-y-4">

          <Input
            placeholder={tMfa('placeholder')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isLoading}
          />

          <Button onClick={handleVerifyOTP} disabled={isLoading} className="w-full">
            {isLoading ? <LoadingSpinner /> : tMfa('verify')}
          </Button>

          {/* Back */}
          <Button
            variant="outline"
            onClick={() => setStep('login')}
            className="w-full mt-3 inline-flex items-center justify-center gap-2"
          >
            <LR.ArrowLeft size={16} />
            {tMfa('backToLogin')}
          </Button>
        </div>
      )}

      {/* CAPTCHA only on Credentials(Username and Password) Provider login */}
      {step === 'login' && (
        <div className="auth-captcha-wrapper">
          <ReCAPTCHA
            key={`recaptcha-${authTheme}`}
            sitekey={reCaptchaSiteKey}
            onChange={onReCaptchaSuccess}
            theme={authTheme}
          />
        </div>
      )}

      {step === 'login' && (
        <div className="space-y-3">
          <div className="auth-or-divider">or</div>

          <Button
            type="button"
            onClick={() => signIn('google', { redirectTo: GUEST_REDIRECT_PATH })}
            disabled={isLoading}
            aria-label="Access CDT as a guest"
            className="w-full inline-flex items-center justify-center gap-2 auth-btn-guest"
          >
            <LR.DoorOpen size={16} />
            Access as Guest
          </Button>

          <p
            className="text-center"
            style={{ color: 'var(--hp-on-surface-variant)', fontSize: '0.8rem' }}
          >
            No account needed — explore a live demo instance.
          </p>
        </div>
      )}
    </>
  )
}

export function SignIn() {
  return (
    <AuthPage>
      <SignInContent />
    </AuthPage>
  )
}