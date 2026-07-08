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
//import { useAppConfigContext } from '../../store/AppConfig/context'

// Where Auth.js sends a guest AFTER they authenticate with Google (the redirectTo).
// The app's signIn callback provisions the guest (Guest role + guest org) on this path.
const GUEST_REDIRECT_PATH = '/guest'

// Set ONLY by the "Access as Guest" button right before signIn('google'), and read
// by the server signIn callback to tell guest intent from a plain "Sign in with
// Google" click (which must keep the existing link flow and show google_not_linked
// for unlinked accounts). Must match the name read on the server (auth.ts:
// GUEST_INTENT_COOKIE). Short-lived; only the guest button ever sets it.
const GUEST_INTENT_COOKIE = 'cdt_guest_intent'

interface SignInContentProps {
  recaptchaSiteKey?: string
}

function SignInContent({ recaptchaSiteKey, }) {
  const [step, setStep] = React.useState<'login' | 'mfa'>('login')

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [code, setCode] = React.useState('')

  const recaptchaRef = React.useRef<ReCAPTCHA>(null)
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

  // Clear any stale guest-intent marker when the sign-in page loads, so it only
  // ever reflects a fresh "Access as Guest" click (and never bleeds into a later
  // plain "Sign in with Google" click).
  React.useEffect(() => {
    document.cookie = `${GUEST_INTENT_COOKIE}=; path=/; max-age=0; samesite=lax`
  }, [])

  const t = useTranslations('Signin')
  const tMfa = useTranslations('MFA')
  const authTheme = useAuthTheme()

  

  const resetCaptcha = () => {
    recaptchaRef.current?.reset()
    setCaptchaToken('')
    setCaptchaStatus(false)
  }

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
          resetCaptcha()
          return
        }

        else if (!captchaStatus) {
          setError('Captcha Verification Failed.')
          setIsLoading(false)
          resetCaptcha()
          return
        }

        else if (result.code === 'invalid_credentials') {
          setError('Invalid email or password')
          setIsLoading(false)
          resetCaptcha()
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
          resetCaptcha()
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
            ref={recaptchaRef}
            key={`recaptcha-${authTheme}`}
            sitekey={recaptchaSiteKey ?? ''}
            onChange={(token) => onReCaptchaSuccess(token)}
            theme={authTheme}
          />
        </div>
      )}

      {/* GUEST ACCESS — explore a live demo instance without an account */}
      {step === 'login' && (
        <div className="space-y-3">
          <div className="auth-or-divider">{t('guestDivider')}</div>

          <Button
            type="button"
            onClick={() => {
              // Mark THIS click as guest intent so the server's signIn callback
              // can tell it apart from the plain "Sign in with Google" icon.
              document.cookie = `${GUEST_INTENT_COOKIE}=1; path=/; max-age=300; samesite=lax`
              signIn('google', { redirectTo: GUEST_REDIRECT_PATH })
            }}
            disabled={isLoading}
            aria-label={t('guestAriaLabel')}
            className="w-full inline-flex items-center justify-center gap-2 auth-btn-guest"
          >
            <LR.DoorOpen size={16} />
            {t('guestButton')}
          </Button>

          <p
            className="text-center"
            style={{ color: 'var(--hp-on-surface-variant)', fontSize: '0.8rem' }}
          >
            {t('guestSubtitle')}
          </p>
        </div>
      )}
    </>
  )
}

interface SignInProps {
  recaptchaSiteKey?: string
  minioBaseUrl?: string
}

export function SignIn({ recaptchaSiteKey,minioBaseUrl, }: SignInProps) {
  return (
    <AuthPage minioBaseUrl={minioBaseUrl}>
      <SignInContent recaptchaSiteKey={recaptchaSiteKey} />
    </AuthPage>
  )
}