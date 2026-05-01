"use client"

import { useSession } from 'next-auth/react'
import * as React from 'react'
import { useTranslations } from 'next-intl'
import * as LR from 'lucide-react'
import { toast } from 'sonner'

import { Badge, Button, Input, LoadingSpinner, Separator } from '../../ui/'
import { UserAvatar } from '../../ui/UserAvatar'
import { useUploadFileToUser } from '../../../hooks/files/files'
import { getFileExtension } from '../../../utils/utils'
import { DescriptionListItem } from '../../ui/DescriptionList'

import ChangePassword from './ChangePassword'
import SettingsSkeleton from './SettingsSkeleton'

import { useUser, useUserRole } from '../../../hooks/users/users'
import { usePermissions } from '../../../store'


type EditValues = Record<string, string | number | boolean | undefined>

type UserEntry = [string, unknown]

const FILTERED_USER_FIELDS = new Set([
  'id',
  'imageFileId',
  'image',
  'password',
  'emailVerified',
  'createdAt',
  'updatedAt',
  'organizationId',
  'accounts',
  'organization',
])

export default function AccountSettingsPanel() {
  const t = useTranslations('UserSettings')

  // Permissions
  const { ability } = usePermissions()

  const { data: session } = useSession()
  const { user, isLoading, updateUser, isMutating } = useUser(session?.user?.id || '')
  const { uploadFile: uploadUserImage } = useUploadFileToUser(user?.id ?? 0)

  const { userRole } = useUserRole(user?.id ? String(user.id) : '')

  const [isEditing, setIsEditing] = React.useState(false)
  const [editValues, setEditValues] = React.useState<EditValues>({})

  const entries = React.useMemo<UserEntry[]>(() => {
    if (!user) return []
    return Object.entries(user).filter(([key]) => !FILTERED_USER_FIELDS.has(key))
  }, [user])

  const handleInputChange = React.useCallback((key: string, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetEdits = React.useCallback(() => {
    setIsEditing(false)
    setEditValues({})
  }, [])

  const getUpdatePayload = React.useCallback(() => {
    const payload: EditValues = { ...editValues }

    if ('firstName' in editValues || 'lastName' in editValues) {
      const first = editValues.firstName ?? user?.name?.split(' ')[0] ?? ''
      const last = editValues.lastName ?? user?.name?.split(' ').slice(1).join(' ') ?? ''
      payload.name = `${first} ${last}`.trim()
      delete payload.firstName
      delete payload.lastName
    }

    for (const key of Object.keys(payload)) {
      if (payload[key] === undefined) delete payload[key]
    }

    return payload
  }, [editValues, user])

  const hasChanges = React.useCallback(() => {
    if (!user) return false

    if (
      (editValues.firstName && editValues.firstName !== user.name?.split(' ')[0])
      || (editValues.lastName && editValues.lastName !== user.name?.split(' ').slice(1).join(' '))
    ) {
      return true
    }

    return Object.entries(editValues).some(([key, value]) => {
      if (key === 'firstName' || key === 'lastName') return false
      return user[key as keyof typeof user] !== value
    })
  }, [editValues, user])

  const handleUserImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (!file || !user?.id) return
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
    } catch {
      toast.error(t('toastError'))
    }
  }

  return (
    <>
      {isLoading ? (
        <SettingsSkeleton />
      ) : (
        <div className="w-full flex flex-col lg:flex-row lg:gap-6 overflow-hidden">
          <div className="flex-shrink-0 pb-2 px-6 lg:w-1/2 flex flex-col gap-2">
            <p className="text-xl text-foreground font-semibold">{t('header')}</p>
            <p className="text-sm text-muted-foreground">{t('subheader')}</p>
          </div>

          <div className="flex-1 px-6 overflow-auto lg:w-1/2">
            {user && (
              <div className="w-32 h-32 float-right ml-4 mb-3 bg-muted border-2 rounded-lg relative overflow-hidden group">
                <label className={`block w-full h-full ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
                  <UserAvatar
                    imageFileId={user?.imageFileId}
                    name={user?.name}
                    className="w-full h-full object-cover"
                  />

                  {isEditing && (
                    <>
                      <div className="absolute inset-0 transition-opacity flex items-center justify-center">
                        <div
                          className="rounded-full p-4 flex items-center justify-center group-hover:scale-110 transition-transform"
                          title={t('changeImage')}
                        >
                          <LR.Edit className="size-5 m-1 text-foreground text-primary-light" />
                        </div>
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        title="Change image"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleUserImageChange}
                      />
                    </>
                  )}
                </label>
              </div>
            )}

            {user && entries.map(([key, value], index) => {
              if (key === 'name') {
                const nameParts = String(value).split(' ')
                const firstName = nameParts[0]
                const lastName = nameParts.slice(1).join(' ')
                return (
                  <React.Fragment key={`name-${index}`}>
                    <div className={`grid grid-cols-1 gap-3 py-3 w-full ${!isEditing ? 'border-b border-border' : ''}`}>
                      <DescriptionListItem label={t('fName')}>
                        {isEditing
                          ? (
                            <Input
                              value={String(editValues.firstName ?? firstName)}
                              onChange={e => handleInputChange('firstName', e.target.value)}
                              type="text"
                            />
                          )
                          : (
                            firstName
                          )}
                      </DescriptionListItem>
                    </div>
                    <div className={`grid grid-cols-1 gap-3 py-3 w-full ${!isEditing ? 'border-b border-border' : ''}`}>
                      <DescriptionListItem label={t('lName')}>
                        {isEditing
                          ? (
                            <Input
                              value={String(editValues.lastName ?? lastName)}
                              onChange={e => handleInputChange('lastName', e.target.value)}
                              type="text"
                            />
                          )
                          : (
                            lastName
                          )}
                      </DescriptionListItem>
                    </div>
                  </React.Fragment>
                )
              }
                if (key === 'roleId') {
                return (
                  <div key="roleId" className={`grid grid-cols-1 gap-3 py-3 w-full ${!isEditing ? 'border-b border-border' : ''}`}>
                  <DescriptionListItem label={t('role')}>
                    {userRole && userRole.name
                    ? <Badge variant="outline">{userRole.name}</Badge>
                    : <Badge variant="outline">{t('roleUnknown')}</Badge>}
                  </DescriptionListItem>
                  </div>
                )
                }

              const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

              return (
                <div key={key} className={`grid grid-cols-1 gap-3 py-3 w-full ${!isEditing ? 'border-b border-border' : ''}`}>
                  <DescriptionListItem label={key === 'email' ? t('email') : t(key)}>
                    {isEditing && (typeof value === 'string' || key === 'email')
                      ? (
                        <Input
                          type={key === 'email' ? 'email' : 'text'}
                          value={String(editValues[key] ?? value ?? '')}
                          onChange={e => handleInputChange(key, e.target.value)}
                          disabled={key === 'email'}
                        />
                      )
                      : (
                        displayValue
                      )}
                  </DescriptionListItem>
                </div>
              )
            })}

            {user && isEditing && (
              <div className="flex gap-2">
                <Button
                  disabled={!hasChanges() || isMutating || !ability.can('update', 'User')}
                  onClick={async () => {
                    try {
                      await updateUser(getUpdatePayload())
                      toast.success(t('toastSuccess'))
                      resetEdits()
                    }
                    catch {
                      toast.error(t('toastError'))
                    }
                  }}
                >
                  {isMutating ? <LoadingSpinner /> : t('save')}
                </Button>
                <Button onClick={resetEdits} variant="outline" disabled={!ability.can('update', 'User')}>
                  {t('cancel')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {user && !isEditing && (
        <Button
          variant="outline"
          onClick={() => { setIsEditing(true) }}
          className="w-fit mx-auto mt-6"
          disabled={!ability.can('update', 'User')}
        >
          {t('edit')}
        </Button>
      )}

      {user && <Separator className={isEditing ? 'my-6' : ''} />}

      <ChangePassword isEditing={isEditing} />
    </>
  )
}
