"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as LR from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'
import { mutate } from 'swr'

import { useUploadFileToUser } from '../../../../hooks/files/files'
import { useOrganizationRoles } from '../../../../hooks/organizations/organizations'
import { useCreateUser, useUserRole } from '../../../../hooks/users/users'
import { usePermissions } from '../../../../store'
import { RoleNames } from '../../../../types/global'
import { getFileExtension } from '../../../../utils/utils'
import { Badge } from '../../../ui/Badge'
import { DescriptionListItem } from '../../../ui/DescriptionList'


// Custom hooks



// Shadcn Components
import { Input } from '../../../ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/Select'
import { Separator } from '../../../ui/Separator'


// Custom Components
import { UserAvatar } from '../../../ui/UserAvatar'
import FieldValue from '../details/FieldValue'

import type { User } from '../../../../types/dbTypes'

type UserEditingValues = Partial<User> & {
  password?: string
}

interface UserDetailsProps {
  selectedUser?: Partial<User>
  setSelectedUser?: (user: User) => void
  editing?: boolean
  setEditing?: (editing: boolean) => void
  setActiveChanges?: (editing: boolean) => void
  users?: User[]
  hideTitle?: boolean
  onDelete?: () => void
  onCreated?: () => void
}

// Create a ref type for the component
export type UserDetailsRef = {
  saveChanges: () => Promise<void>
}

const UserDetails = React.forwardRef<UserDetailsRef, UserDetailsProps>(({
  selectedUser,
  setSelectedUser,
  editing = false,
  setEditing,
  setActiveChanges,
  hideTitle,
  onDelete,
  onCreated,
}, ref) => {

  const t = useTranslations('UserDetails')

  // Permissions
  const { ability } = usePermissions()

  const normalizeRoleName = (role?: string) => (role || '').toLowerCase()

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  const getRoleLabel = (role: string) => {
    const normalizedRole = normalizeRoleName(role)
    if (normalizedRole === RoleNames.admin) return t('roles.admin')
    if (normalizedRole === RoleNames.user) return t('roles.user')
    if (normalizedRole === RoleNames.viewer) return t('roles.viewer')
    return capitalizeFirstLetter(role)
  }

  const { data: session } = useSession()
  const { userRole: selectedUserRole } = useUserRole(selectedUser?.id && selectedUser.id > 0 ? String(selectedUser.id) : '')
  const { createUser } = useCreateUser()
  const { organizationRoles } = useOrganizationRoles(session?.user?.organizationId ? String(session?.user?.organizationId) : null)

  const isNewUser = !!selectedUser && selectedUser.id < 0

  const { uploadFile: uploadUserImage } = useUploadFileToUser(selectedUser?.id && selectedUser.id > 0 ? selectedUser.id : 0)

  const [editingValues, setEditingValues] = React.useState<UserEditingValues>({})
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null)
  const [selectedRole, setSelectedRole] = React.useState('')
  const [passwordErrors, setPasswordErrors] = React.useState<string[]>([])
  const [roleError, setRoleError] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s])[^\s]{12,65}$/

  const validatePassword = (pwd: string): string[] => {
    if (!pwd) return [t('errors.passwordRequired')]
    if (!passwordRegex.test(pwd)) return [t('errors.weakPassword')]
    return []
  }

  const roleName = selectedUserRole?.name || ''
  const roleOptions = Array.from(new Set([
    ...Object.values(RoleNames),
    normalizeRoleName(roleName),
  ].filter(Boolean)))

  React.useEffect(() => {
    setEditingValues({})
    setActiveChanges?.(false)
    setSelectedRole(normalizeRoleName(roleName) || '')
    setPasswordErrors([])
    setRoleError('')
    setShowPassword(false)
    setImagePreviewUrl(null)
  }, [selectedUser?.id])

  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  const handleInputChange = (key: keyof UserEditingValues, value: any) => {
    setEditingValues(prev => ({
      ...prev,
      [key]: value,
    }))
    setActiveChanges?.(true)
    // Propagate name changes to the parent so the header updates live
    if (isNewUser && key === 'name' && setSelectedUser) {
      setSelectedUser({ ...selectedUser, name: value } as User)
    }
  }

  const getFieldValue = (property: keyof UserEditingValues) => {
    return Object.prototype.hasOwnProperty.call(editingValues, property)
      ? editingValues[property]
      : selectedUser?.[property as keyof User]
  }

  const handleSaveChanges = async () => {
    if (!selectedUser) return

    try {
      if (isNewUser) {
        const name = String(editingValues.name || '').trim()
        const email = String(editingValues.email || '').trim()
        const password = String(editingValues.password || '').trim()

        if (!name || !email) {
          toast.error(t('errors.nameEmailRequired'))
          return
        }

        if (!selectedRole) {
          setRoleError(t('errors.roleRequired'))
          return
        }

        const pwdErrors = validatePassword(password)
        if (pwdErrors.length > 0) {
          setPasswordErrors(pwdErrors)
          return
        }

        const roleObj = organizationRoles?.find(r => r.name.toLowerCase() === selectedRole.toLowerCase())
        if (!roleObj) {
          setRoleError(t('errors.roleRequired'))
          return
        }

        await createUser({
          userData: {
            name,
            email,
            password,
            roleId: roleObj.id,
          },
        })

        setEditingValues({})
        setEditing?.(false)
        setActiveChanges?.(false)
        toast.success(t('success.userCreated'))
        onCreated?.()
      }
      else {
        const payload: Partial<User> = { ...editingValues }
        delete (payload as UserEditingValues).password

        // Include the role if it has changed
        const originalRole = normalizeRoleName(roleName) || ''
        if (selectedRole && selectedRole !== originalRole) {
          (payload as any).role = selectedRole
        }

        if (Object.keys(payload).length === 0) return

        const res = await fetch(`/api/users/${selectedUser.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        )

        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || t('errors.updateUserFailed'))
        }

        const data = await res.json()
        const updatedUser = data?.user ?? data
        if (updatedUser && setSelectedUser) {
          setSelectedUser({ ...selectedUser, ...updatedUser })
        }

        void mutate(['users'])
        void mutate(['user', String(selectedUser.id)])

        setEditingValues({})
        setEditing?.(false)
        setActiveChanges?.(false)
        toast.success(t('success.userUpdated'))
      }
    }
    catch (error) {
      if ((error as any)?.status !== 401) {
        toast.error(t('errors.saveChangesFailed'))
      }
    }
  }

  React.useImperativeHandle(ref, () => ({
    saveChanges: handleSaveChanges,
  }), [selectedUser, editingValues, selectedRole])

  const renderInputField = (
    label: string,
    property: keyof UserEditingValues,
    type: 'text' | 'email' | 'number' | 'password' = 'text',
  ) => {
    const value = getFieldValue(property)
    const displayValue = value instanceof Date ? value.toISOString() : (value ?? '')
    return (
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <Input
          type={type}
          value={displayValue}
          onChange={e => {
            const next = type === 'number'
              ? (e.target.value === '' ? null : Number(e.target.value))
              : e.target.value
            handleInputChange(property, next)
          }}
          disabled={!ability.can('update', 'Role')}
        />
      </div>
    )
  }

  const renderFieldRow = (
    label: string,
    property: keyof UserEditingValues,
  ) => {
    const value = getFieldValue(property)
    return (
      <DescriptionListItem className="break-words" label={label}>
        <FieldValue
          value={value}
          label={label}
          property={String(property)}
          editing={editing}
        />
      </DescriptionListItem>
    )
  }

  const handleImageUpload = async (file: File) => {
    if (!selectedUser?.id || selectedUser.id <= 0) return
    const objectUrl = URL.createObjectURL(file)
    setImagePreviewUrl(objectUrl)
    try {
      const assetId = crypto.randomUUID()
      const presignedRes = await fetch(`/api/presigned-url-upload?asset=${assetId}`)
      if (!presignedRes.ok) throw new Error('Failed to fetch presigned URL')
      const { presignedUrl } = await presignedRes.json()

      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!uploadRes.ok) throw new Error('Failed to upload image')

      await uploadUserImage({
        fileData: {
          name: file.name,
          mimeType: file.type,
          extension: getFileExtension(file),
          sizeBytes: file.size,
          tag: 'user',
          assetId,
          uploadedAt: new Date().toISOString(),
        },
      })
      setImagePreviewUrl(null)
      toast.success(t('success.imageUpdated'))
    } catch {
      setImagePreviewUrl(null)
      toast.error(t('errors.uploadImageFailed'))
    }
  }

  if (!selectedUser) return null

  if (isNewUser) {
    const newUserField = (
      label: string,
      key: keyof UserEditingValues,
      type: 'text' | 'email' = 'text',
    ) => (
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <Input
          type={type}
          value={String(editingValues[key] ?? '')}
          onChange={e => handleInputChange(key, e.target.value)}
          disabled={!ability.can('update', 'Role')}
          autoComplete="off"
        />
      </div>
    )

    return (
      <div className="p-6 max-w-md">
        <div className="flex flex-col gap-4">
          {newUserField(t('fields.name'), 'name')}
          {newUserField(t('fields.email'), 'email', 'email')}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-foreground">{t('fields.role')}</div>
            <Select
              value={selectedRole}
              onValueChange={value => {
                setSelectedRole(value)
                setRoleError('')
                setActiveChanges?.(true)
              }}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder={t('roleSelectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map(role => (
                  <SelectItem key={role} value={role}>
                    {getRoleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roleError && <p className="text-sm text-destructive">{roleError}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-foreground">{t('fields.password')}</div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={String(editingValues.password ?? '')}
                onChange={e => {
                  const val = e.target.value
                  handleInputChange('password', val)
                  setPasswordErrors(val ? validatePassword(val) : [])
                }}
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
            {editingValues.password && (
              passwordErrors.length > 0
                ? <p className="text-sm text-destructive">{passwordErrors[0]}</p>
                : <p className="text-sm text-green-600">{t('passwordStrong')}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (isNewUser) {
    return (
      <div className="p-6 max-w-md">
        <div className="flex flex-col gap-4">
          {renderInputField(t('fields.name'), 'name')}
          {renderInputField(t('fields.email'), 'email', 'email')}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-foreground">{t('fields.role')}</div>
            <Select
              value={selectedRole}
              onValueChange={value => {
                setSelectedRole(value)
                setRoleError('')
                setActiveChanges?.(true)
              }}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder={t('roleSelectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map(role => (
                  <SelectItem key={role} value={role}>
                    {getRoleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roleError && <p className="text-sm text-destructive">{roleError}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-foreground">{t('fields.password')}</div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={String(editingValues.password ?? '')}
                onChange={e => {
                  const val = e.target.value
                  handleInputChange('password', val)
                  setPasswordErrors(val ? validatePassword(val) : [])
                }}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(prev => !prev)}
              >
                {showPassword ? <LR.EyeOff className="size-4" /> : <LR.Eye className="size-4" />}
              </button>
            </div>
            {passwordErrors.length > 0 && (
              <p className="text-sm text-destructive">{passwordErrors[0]}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-row gap-2 p-6 h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {!hideTitle && (
          <div className="flex-shrink-0 pb-2 px-6">
            <p className="text-xl text-foreground font-semibold">{t('title')}</p>
          </div>
        )}

        <div className="flex-1 px-6 overflow-auto">
          <div className="flex flex-col gap-6 pt-3">
            <div>
              <h3 className="font-semibold text-base mb-3 text-foreground">{t('sections.account')}</h3>
              <div className="flex flex-col md:flex-row md:items-center gap-10">
                <div className="flex flex-col items-start gap-2 shrink-0">
                  <div className="w-32 h-32 bg-muted border-2 rounded-lg overflow-hidden relative group">
                    <label className={`block w-full h-full ${editing ? 'cursor-pointer' : 'cursor-default'}`}>
                      <UserAvatar
                        imageFileId={selectedUser?.imageFileId}
                        name={selectedUser?.name}
                        className="w-full h-full object-cover"
                        previewSrc={imagePreviewUrl}
                      />
                      {editing && (
                        <>
                          <div className="absolute inset-0 transition-opacity flex items-center justify-center">
                            <div className=" p-4 flex items-center justify-center group-hover:scale-110 transition-transform" title={t('imageChangeTitle')}>
                              <LR.Edit className="size-5 m-1 text-foreground text-primary-light" />
                            </div>
                          </div>
                          <Input
                            type="file"
                            accept="image/*"
                            title={t('imageChangeTitle')}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={e => {
                              const file = e.target.files?.[0] || null
                              if (!file) return
                              void handleImageUpload(file)
                            }}
                            disabled={!ability.can('update', 'Role')}
                          />
                        </>
                      )}
                    </label>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 w-full border-b border-border">
                    {editing
                      ? renderInputField(t('fields.name'), 'name')
                      : renderFieldRow(t('fields.name'), 'name')}
                    {renderFieldRow(t('fields.email'), 'email')}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 w-full border-b border-border">
                    <DescriptionListItem className="break-words" label={t('fields.role')}>
                      {editing
                        ? (
                            <Select
                              value={selectedRole}
                              onValueChange={value => {
                                setSelectedRole(value)
                                setActiveChanges?.(true)
                              }}
                            >
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder={t('roleSelectPlaceholder')} />
                              </SelectTrigger>
                              <SelectContent>
                                {roleOptions.map(role => (
                                  <SelectItem key={role} value={role}>
                                    {getRoleLabel(role)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )
                        : (
                            <div className="flex gap-2 flex-wrap">
                              {roleName ? (
                                <Badge variant="secondary" className="font-medium">
                                  {getRoleLabel(roleName)}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">{t('roleEmptyValue')}</span>
                              )}
                            </div>
                          )}
                    </DescriptionListItem>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-3 text-foreground">{t('sections.status')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 w-full border-b border-border">
                {renderFieldRow(t('fields.createdAt'), 'createdAt')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 w-full border-b border-border">
                {renderFieldRow(t('fields.updatedAt'), 'updatedAt')}
                <div className="hidden md:block" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

UserDetails.displayName = 'UserDetails'

export default UserDetails
