//###############This is the START of the Old Sign In page CODE for Nico to reference to when doing UI Design ###############
 // 'use client'

// import * as React from 'react'
// import { signIn } from 'next-auth/react'
// import { useTranslations } from 'next-intl'
// import * as LR from 'lucide-react'
// import { Button, Input, LoadingSpinner } from '../ui'
// import { AuthPage, useAuthTheme } from './AuthPage'
// import { useParams } from 'next/navigation'
// import ReCAPTCHA from 'react-google-recaptcha'

// function SignInContent() {
//   const [email, setEmail] = React.useState('')
//   const [password, setPassword] = React.useState('')
//   const [step, setStep] = React.useState<'login' | 'mfa'>('login')
//   const [captchaStatus, setCaptchaStatus] = React.useState(false)
//   const [captchaToken, setCaptchaToken] = React.useState('')
//   const [isLoading, setIsLoading] = React.useState(false)
//   const [error, setError] = React.useState('')
//   const [showPassword, setShowPassword] = React.useState(false)
//   const t = useTranslations('Signin')
//   const tHero = useTranslations('HomePage.hero')
//   const authTheme = useAuthTheme()

//   const params = useParams()
//   const orgName = params.instance ?? 'canada'
//   const reCaptchaSiteKey = `${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`

//   const onReCaptchaSuccess = (captchaToken) => {
//     setCaptchaToken(captchaToken)
//     setCaptchaStatus(true)
//   }

//   const handleSubmit = async (e) => {
//     e.preventDefault()
//     setIsLoading(true)
//     setCaptchaStatus(false)
//     setError('')

//     try {
//       const result = await signIn('credentials', {
//         redirect: false,
//         email,
//         password,
//         captchaToken,
//       })

//       if (result?.error) {
        
//         if (result.code === "mfa_required"){
//           setError('Redirecting to MFA Step')
//         window.location.href = `/${orgName}/auth/mfa`
//         const sessionDataForMfaEmail =sessionStorage.setItem("mfaEmail",email) //Pass email to mfa page to verify the OTP for the MFA process
//         //console.log("The Storage value is: ",sessionStorage.getItem("mfaEmail"))
//         }
        
//           if(!captchaStatus){
//             setTimeout(() => {
//            setError('Login Failed. Please try again later.')
//          }, 500)         
//       }
//       else
//         setTimeout(() => {
//           setError('Invalid email or password')
//         }, 500)

//         console.error('Login failed:', result.error)
//         setTimeout(() => {
//           setIsLoading(false)
//         }, 500)
//       } else {
//         window.location.href = `/${orgName}`
//       }
//     } catch (error_) {
//       setError('An unexpected error occurred. Please try again.')
//       console.error('Login error:', error_)
//       setTimeout(() => {
//         setIsLoading(false)
//       }, 500)
//     }
//   }

//   return (
//     <>
//       {/* Header */}
//       <div className="space-y-2 text-left">
//         <h1
//           className="font-display font-bold"
//           style={{
//             fontSize: '1.75rem',
//             lineHeight: '1.1',
//             letterSpacing: '-0.02em',
//             color: 'var(--hp-on-surface)',
//             fontFamily: "'Space Grotesk', sans-serif",
//           }}
//         >
//           {t('title')}
//         </h1>
//         <p style={{ color: 'var(--hp-on-surface-variant)', fontSize: '0.9rem' }}>
//           {t('message')}
//         </p>
//       </div>

//       {/* Form */}
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div className="space-y-2">
//           <label htmlFor="email" className="auth-label">
//             {t('inputLabel')}
//           </label>
//           <Input
//             id="email"
//             type="email"
//             placeholder={t('placeholder1')}
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             disabled={isLoading}
//             required
//             className="auth-input"
//           />
//         </div>

//         <div className="space-y-2">
//           <label htmlFor="password" className="auth-label">
//             {t('passwordLabel')}
//           </label>
//           <div className="relative">
//             <Input
//               id="password"
//               type={showPassword ? 'text' : 'password'}
//               placeholder={t('placeholder2')}
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               disabled={isLoading}
//               required
//               className="auth-input pr-10"
//             />
//             <button
//               type="button"
//               onClick={() => setShowPassword((v) => !v)}
//               className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
//               style={{ color: 'var(--hp-on-surface-variant)' }}
//               tabIndex={-1}
//             >
//               {showPassword ? <LR.EyeOff size={16} /> : <LR.Eye size={16} />}
//             </button>
//           </div>
//           {error && (
//             <div className="auth-pw-error">{error}</div>
//           )}
//         </div>

//         <Button type="submit" className="auth-btn-primary w-full h-10" disabled={isLoading}>
//           {isLoading ? <LoadingSpinner /> : 'Login'}
//         </Button>
//       </form>

//       {/* Beta button */}
//       <Button size="lg" className="auth-btn-beta w-full grid place-items-center" asChild>
//         <a
//           href="https://docs.google.com/forms/d/e/1FAIpQLScB12Qc7khiOk4a_E753jDccx6026AjO-_FINBKoZZZtkmqnA/viewform"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           {tHero('betaButton')}
//         </a>
//       </Button>

//       <div className="auth-captcha-wrapper">
//         <ReCAPTCHA
//           key={`recaptcha-${authTheme}`}
//           sitekey={reCaptchaSiteKey}
//           onChange={onReCaptchaSuccess}
//           theme={authTheme}
//         />
//       </div>
//     </>
//   )
// }

// export function SignIn() {
//   return (
//     <AuthPage>
//       <SignInContent />
//     </AuthPage>
//   )
// }
//###############This is the the END of the Old Sign In page CODE for Nico to reference to when doing UI Design ###############



//###############This is the START of the active NEW Single-Sign In page MFA flow CODE###############
'use client'

import * as React from 'react'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as LR from 'lucide-react'
import { Button, Input, LoadingSpinner } from '../ui'
import { AuthPage, useAuthTheme } from './AuthPage'
import { useParams } from 'next/navigation'
import ReCAPTCHA from 'react-google-recaptcha'

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

  const t = useTranslations('Signin')
  const tHero = useTranslations('HomePage.hero')
  const authTheme = useAuthTheme()

  const params = useParams()
  const orgName = params.instance ?? 'canada'
  const reCaptchaSiteKey = `${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`

  const onReCaptchaSuccess = (token) => {
    setCaptchaToken(token)
    setCaptchaStatus(true)
  }

  // Initial LOGIN
  const handleSubmit = async (e) => {
    e.preventDefault()
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
        
        //Commenting out Captcha code for Development 

        //   if(!captchaStatus){
        //     setTimeout(() => {
        //    setError('Login Failed. Please try again later.')
        //  }, 500) 
        //   setIsLoading(false)         
        //   return
        // }
        // MFA TRIGGER
        //else if (result.code === 'mfa_required') {
        if (result.code === 'mfa_required') {
          setStep('mfa')
          setIsLoading(false)
          return
        }


        setError('Invalid email or password')
        setIsLoading(false)
        return
      
    }

      // Completed Login + MFA - Redirect to the Platform's Organization Dashboard 
      window.location.href = `/${orgName}`

    } catch (err) {
      setError('Unexpected error. Please try again.')
      setIsLoading(false)
    }
  }

  // VERIFY OTP
  const handleVerifyOTP = async () => {
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError('Invalid or expired code')
        setIsLoading(false)
        return
      }
      //TODO Nico: Green color backgorund for successful MFA response message 
      setError('Successful MFA. Redirecting to Dashboard')


      // FINAL LOGIN after successful MFA process
      await signIn('credentials', {
        email,
        password,
        mfaVerified: true,
        redirect: true,
        redirectTo: `/${orgName}`,
      })

    } catch (err) {
      setError('Verification failed')
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="space-y-2 text-left">
        <h1 className="font-display font-bold" style={{
          fontSize: '1.75rem',
          lineHeight: '1.1',
          letterSpacing: '-0.02em',
          color: 'var(--hp-on-surface)',
        }}>
          {step === 'login' ? t('title') : 'Verify your identity'}
        </h1>

        <p style={{ color: 'var(--hp-on-surface-variant)', fontSize: '0.9rem' }}>
          {step === 'login'
            ? t('message')
            : `We sent a verification code to ${email}`}
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
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}>
              {showPassword ? <LR.EyeOff size={16}/> : <LR.Eye size={16}/>}
            </button>
          </div>

          {error && <div className="auth-pw-error">{error}</div>}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? <LoadingSpinner /> : 'Login'}
          </Button>
        </form>
      )}

      {/* MFA FORM */}
      {step === 'mfa' && (
        <div className="space-y-4">

          <Input
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isLoading}
          />

          {error && <div className="auth-pw-error">{error}</div>}

          <Button onClick={handleVerifyOTP} disabled={isLoading}>
            {isLoading ? <LoadingSpinner /> : 'Verify Code'}
          </Button>

          {/* 🔙 Back */}
          <Button
            variant="ghost"
            onClick={() => setStep('login')}
          >
            Back to login
          </Button>
        </div>
      )}

      {/* CAPTCHA only on login */}
      {step === 'login' && (
        <div className="auth-captcha-wrapper">
          <ReCAPTCHA
            sitekey={reCaptchaSiteKey}
            onChange={onReCaptchaSuccess}
            theme={authTheme}
          />
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
//###############This is the END of the active NEW Single-Sign In page MFA flow CODE###############
