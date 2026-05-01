"use client"

import * as React from 'react'
import * as LR from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { useCreateUser } from '../../../../hooks/users/users'
import { useOrganizationRoles } from '../../../../hooks/organizations/organizations'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../ui/Dialog'
import { Button } from '../../../ui/Button'
import { Input } from '../../../ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/Select'

interface AddUserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s])[^\s]{12,65}$/

export default function AddUser({ open, onOpenChange }: AddUserProps) {
  const t = useTranslations('AddUser')
  const { data: session } = useSession()
  const { createUser } = useCreateUser()
  const { organizationRoles } = useOrganizationRoles(
    session?.user?.organizationId ? String(session.user.organizationId) : null
  )

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [passwordValid, setPasswordValid] = React.useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const reset = () => {
    setName('')
    setEmail('')
    setRole('')
    setPassword('')
    setShowPassword(false)
    setPasswordValid(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handlePasswordChange = (val: string) => {
    setPassword(val)
    setPasswordValid(val ? passwordRegex.test(val) : null)
  }

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error(t('errors.nameEmailRequired'))
      return
    }
    if (!role) {
      toast.error(t('errors.roleRequired'))
      return
    }
    if (!passwordRegex.test(password)) {
      toast.error(t('errors.weakPassword'))
      return
    }

    const roleObj = organizationRoles?.find(r => r.name.toLowerCase() === role.toLowerCase())
    if (!roleObj) {
      toast.error(t('errors.roleRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      await createUser({
        userData: {
          name: name.trim(),
          email: email.trim(),
          password,
          roleId: roleObj.id,
        },
      })
      toast.success(t('success.userCreated'))
      handleOpenChange(false)
    } catch {
      toast.error(t('errors.createUserFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-foreground">{t('fields.name')}</div>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-foreground">{t('fields.email')}</div>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Role */}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-foreground">{t('fields.role')}</div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder={t('roleSelectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {(organizationRoles ?? []).map(r => (
                  <SelectItem key={r.id} value={r.name.toLowerCase()}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-foreground">{t('fields.password')}</div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => handlePasswordChange(e.target.value)}
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(prev => !prev)}
              >
                {showPassword ? <LR.EyeOff className="size-4" /> : <LR.Eye className="size-4" />}
              </button>
            </div>
            {passwordValid === false && (
              <p className="text-sm text-destructive">{t('errors.weakPassword')}</p>
            )}
            {passwordValid === true && (
              <p className="text-sm text-green-600">{t('passwordStrong')}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <LR.Loader2 className="size-4 animate-spin" /> : <LR.UserPlus className="size-4" />}
            {t('submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
