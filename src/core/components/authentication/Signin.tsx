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
import { PasswordError } from '../authentication/PasswordError'
//import { useAppConfigContext } from '../../store/AppConfig/context'

interface SignInContentProps {
  recaptchaSiteKey?: string
}

function SignInContent({ recaptchaSiteKey, }) {
  const [step, setStep] = React.useState<
  'login'
  | 'mfa'
  | 'forgotPassword'
  | 'forgotPasswordSent'
  | 'changePassword'
>('login')

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [code, setCode] = React.useState('')

  const recaptchaRef = React.useRef<ReCAPTCHA>(null)
  const [captchaStatus, setCaptchaStatus] = React.useState(false)
  const [captchaToken, setCaptchaToken] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [confirmPassword, setConfirmPassword] = React.useState('')

  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')

  const [newPasswordErrors, setNewPasswordErrors] = React.useState<string[]>([])
  const [passwordErrors, setPasswordErrors] = React.useState<string[]>([])
  const [confirmPasswordError, setConfirmPasswordError] = React.useState('')
  const [hasAttemptedSave, setHasAttemptedSave] = React.useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false)
  

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
  const tforgotPassword = useTranslations('forgotPassword')
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

  // Initial LOGIN with Credentials(Username and Password)
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

  // Password Policy for New Password used for Reset Password flow
  const validatePassword = (password: string): string[] => {
    const errors: string[] = []

    // Regex Pattern - At least:
    // 1 lowercase:(?=.*[a-z])
    // 1 uppercase: (?=.*[A-Z])
    // 1 digit: (?=.*\d)
    // 1 special char: (?=.*[@$!%*?&_])
    //min 12 characters, max 65: {12,65}
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s])[^\s]{12,65}$/;
      if (!passwordRegex.test(password)) {
        errors.push(t('weakPassword'));
      }
    //   if (password.toLowerCase().includes(username.toLowerCase())) {
    //      //errors.push(t('containsUsername'));
    //      errors.push(t('weakPassword'));

    //  }      

    return errors
  }

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewPassword(value)
    setNewPasswordErrors(validatePassword(value))
    if (confirmPassword) {
      setConfirmPasswordError(value === confirmPassword ? '' : tforgotPassword('noMatch'))
    }
  }
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setConfirmPassword(value)
    setConfirmPasswordError(value === newPassword ? '' : tforgotPassword('noMatch'))
  } 
  const canProceed = currentPassword.length >= 12
  const canSave = newPassword.length >= 12 && confirmPassword.length >= 12 && !isLoading

  //Forgot Password Flow: 1. User Clicks Reset Password > 2. OTP is emailed(forgotpassword API)
  //  > 3. OTP is verified(verifyotp API) > 4. User chooses a new password(resetpassword API)

  //2. Initiate ForgotPasword flow - OTP is emailed
  const handleForgotPassword = async () => {
  setIsLoading(true)
  setError('')

  try {
    const res = await fetch('/api/forgotpassword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email
      }),
    })

    if (!res.ok) {
      setError('Unable to send password reset email.')
      setIsLoading(false)
      return
    }

    //Redirect to Verify OTP flow to enter OTP that has been emailed 
    setStep('forgotPasswordSent')
    setIsLoading(false)

  } catch {
    setError('Unable to process')
    setIsLoading(false)
  }
}

// 3. Handle Change Password - OTP is getting verified
  // VERIFY OTP for MFA
  const handleVerifyOTPForPasswordChange = async () => {
    //NEW------------------------------------------------------------------
  setIsLoading(true)
  setError('')

  try {

    const res = await fetch('/api/verifyotp', {

      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        email,
        code,
      }),
    })

    if (!res.ok) {

      //setError('Invalid verification code.')
      toast.error('Invalid verification code.')
      setIsLoading(false)
      return

    }
    toast.success("SUCCESS")
    //Redirect User to enter New Password in Change Password page
    setStep('changePassword')

  } catch {

    setError('Unable to verify code.')

  } finally {

    setIsLoading(false)

  }

  }

  //Final Step: Reset Password 
const handleResetPassword = async () => {

  setHasAttemptedSubmit(true)

  const errors = validatePassword(newPassword)

  setPasswordErrors(errors)
  

  if (newPassword !== confirmPassword) {

    toast.error(tforgotPassword('noMatch'))
    return

  }

  if (errors.length > 0)
    return

  setIsLoading(true)
  setError('')


  try {

    const res = await fetch('/api/resetpassword', {

      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({

        email,
        code,
        newPassword,

      }),
    })

    if (!res.ok) {

      setError('Session Expired: Unable to reset password.')
      return

    }

    toast.success('Password successfully changed.')

    setNewPassword('')
    setConfirmPassword('')
    setCode('')
    setStep('login')

  } finally {

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
          {/* Reset Password Link */}
          <button
          type="button"
          onClick={() => {
          setError('')
          setStep('forgotPassword')
          }}
          className="text-sm underline underline-offset-4 hover:opacity-80"
          style={{ color: 'var(--hp-primary)' }}
          >
          Reset your password
          </button>

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
      {/*Forgot Password step: Send OTP for Reset */}
      {step === 'forgotPassword' && (
  <div className="space-y-4">

    <Input
      type="email"
      placeholder="Enter your email address"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      disabled={isLoading}
    />

    {error && (
      <div className="auth-pw-error">
        {error}
      </div>
    )}

    <Button
      onClick={handleForgotPassword}
      disabled={isLoading || !email}
      className="w-full"
    >
      {isLoading
        ? <LoadingSpinner />
        : 'Send Reset Link'}
    </Button>

    <Button
      variant="outline"
      onClick={() => setStep('login')}
      className="w-full"
    >
      <LR.ArrowLeft size={16} />
      Back to Login
    </Button>

  </div>
)}
{/* Verify OTP for Password Change */}
{step === 'forgotPasswordSent' && (
  <div className="space-y-4">

    <p
      className="text-sm"
      style={{ color: 'var(--hp-on-surface-variant)' }}
    >
      If an account exists for <strong>{email}</strong>,
      a password reset code has been sent.
    </p>
              <Input
            placeholder={tMfa('placeholder')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isLoading}
          />
{error && (
  <div className="auth-pw-error">
    {error}
  </div>
)}
          <Button onClick={handleVerifyOTPForPasswordChange} disabled={isLoading} className="w-full">
            {isLoading ? <LoadingSpinner /> : tMfa('verify')}
          </Button>

    <Button
      onClick={() => setStep('login')}
      className="w-full"
    >
      Back to Login
    </Button>

  </div>
)}

{/*Change PAssword */}
{step === 'changePassword' && (

<div className="space-y-4">
  
                                     
  <Input
    type={showNewPassword ? 'text' : 'password'}
    placeholder="New Password"
    className={`w-full ${hasAttemptedSave && newPasswordErrors.length > 0 ? 'border-destructive' : ''}`}
    value={newPassword}
    onChange={handlePasswordChange}
  />

                    {hasAttemptedSave && newPasswordErrors.map((error, idx) => (
                      <PasswordError key={idx} message={error} />
                    ))}


  <Input
    type={showConfirmPassword ? 'text' : 'password'}
    placeholder="Confirm Password"
    value={confirmPassword}
    onChange={handleConfirmPasswordChange}
  />

                    
                    {hasAttemptedSave && confirmPasswordError && (
                      <PasswordError message={confirmPasswordError} />
                    )}

  {error && (
    <div className="auth-pw-error">
      {error}
    </div>
  )}

  <Button
    onClick={handleResetPassword}
    disabled={isLoading}
    className="w-full"
  >
    {isLoading
      ? <LoadingSpinner />
      : 'Change Password'}
  </Button>


  <Button
    variant="outline"
    onClick={() => setStep('login')}
    className="w-full"
  >
    <LR.ArrowLeft size={16} />
    Back to Login
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