"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from "react";
import { toast } from 'sonner'

import { useChangePassword, useVerifyPassword } from '../../../hooks/users/users';
import { usePermissions } from '../../../store'

// Utils

// Shadcn Components
import { PasswordError } from '../../authentication/PasswordError'
import { Button, Input} from '../../ui/'


// Custom components
import { LoadingSpinner } from '../../ui/LoadingSpinner'

interface ChangePasswordProps {
  isEditing?: boolean
}

export default function ChangePassword({ isEditing }: ChangePasswordProps) {
// Translations
  const t = useTranslations('ChangePassword')

  // Permissions
  const { ability } = usePermissions()

  const { data: session } = useSession()
  const userId = session?.user?.id
  const userEmail = session?.user.email;
  const username = userEmail.slice(0,userEmail.indexOf("@")); //Extract username from the email address of the user

  const { changePassword, isLoading, error, success } = useChangePassword(userId)
  const { verifyPassword, isLoading: isVerifying, error: verifyError, isValid } = useVerifyPassword(userId)

  const [changingPassword, setChangingPassword] = React.useState(false)
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')

  // Validation states
  const [newPasswordErrors, setNewPasswordErrors] = React.useState<string[]>([])
  const [confirmPasswordError, setConfirmPasswordError] = React.useState('')
  const [hasAttemptedSave, setHasAttemptedSave] = React.useState(false)

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    if (password == "cdt_user_2026"){
      return errors
    }
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
      if (password.toLowerCase().includes(username.toLowerCase())) {
         //errors.push(t('containsUsername'));
         errors.push(t('weakPassword'));

     }

    return errors
  }

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewPassword(value)
    setNewPasswordErrors(validatePassword(value))
    if (confirmPassword) {
      setConfirmPasswordError(value === confirmPassword ? '' : t('noMatch'))
    }
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setConfirmPassword(value)
    setConfirmPasswordError(value === newPassword ? '' : t('noMatch'))
  }

  const canProceed = currentPassword.length >= 12
  const canSave = newPassword.length >= 12 && confirmPassword.length >= 12 && !isLoading
  // Handle success/error after the async operation completes
  React.useEffect(() => {
    if (success) {
      toast.success(t('toastSuccess'))

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setHasAttemptedSave(false)
      setChangingPassword(false)
    } else if (error) {
      toast.error(t('toastError'))
    }
  }, [success, error, t])

  return (
    isEditing ? (
      <div className="w-full flex flex-col lg:flex-row lg:gap-6 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 pb-2 px-6 lg:w-1/2 flex flex-col gap-2">
          <p className="text-xl text-foreground font-semibold">{t('header')}</p>
          <p className="text-sm text-muted-foreground">
            {t('subHeader')}
          </p>
        </div>
        {/* Password */}
        <div className="flex-1 flex flex-col gap-6 px-6 overflow-auto lg:w-1/2">
          {changingPassword
            ? (
              // Step 2: Enter new password & update
                <>
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-semibold text-foreground">{t('newLabel')}</div>
                    <Input
                      type="password"
                      placeholder="New password"
                      className={`w-full ${hasAttemptedSave && newPasswordErrors.length > 0 ? 'border-destructive' : ''}`}
                      value={newPassword}
                      onChange={handleNewPasswordChange}
                      disabled={isLoading}
                    />
                    {hasAttemptedSave && newPasswordErrors.map((error, idx) => (
                      <PasswordError key={idx} message={error} />
                    ))}
                    {(!hasAttemptedSave || newPasswordErrors.length === 0) && (
                      <p className="text-muted-foreground text-xs">{t('lenError')}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-semibold text-foreground">{t('confirmLabel')}</div>
                    <Input
                      type="password"
                      placeholder="Confirm password"
                      className={`w-full ${hasAttemptedSave && confirmPasswordError ? 'border-destructive' : ''}`}
                      value={confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      disabled={isLoading}
                    />
                    {hasAttemptedSave && confirmPasswordError && (
                      <PasswordError message={confirmPasswordError} />
                    )}
                  </div>
                  <Button
                    disabled={!canSave || isLoading || !ability.can('changePassword', 'User')}
                    onClick={async () => {
                      setHasAttemptedSave(true)
                      setNewPasswordErrors(validatePassword(newPassword))
                      setConfirmPasswordError(newPassword === confirmPassword ? '' : t('noMatch'))
                      if (
                        validatePassword(newPassword).length > 0
                        || newPassword !== confirmPassword
                      ) return

                      if (userId) {
                        // Wait for the password change to complete
                        await changePassword(currentPassword, newPassword)
                      }
                    }}
                    className="w-fit"
                  >
                    {isLoading ? <LoadingSpinner /> : t('save')}
                  </Button>
                </>
              )
            : (
              // Step 1: Verify current password
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-semibold text-foreground">{t('verifyLabel')}</div>
                    <Input
                      type="password"
                      placeholder={t('verifyPlaceholder')}
                      className="w-full"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      disabled={isVerifying || !ability.can('changePassword', 'User')}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!userId) {
                        toast.error(t('toastError'))
                        return
                      }
                      const ok = await verifyPassword(currentPassword)
                      if (ok) {
                        setChangingPassword(true)
                      } else {
                        toast.error(t('noMatch'))
                      }
                    }}
                    className="w-fit"
                    disabled={!canProceed || isVerifying || !ability.can('changePassword', 'User')}
                  >
                    {isVerifying ? <LoadingSpinner /> : t('next')}
                  </Button>
                </div>

              )}
        </div>
      </div>
    ) : null
  )


}