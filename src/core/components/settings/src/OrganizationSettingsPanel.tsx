"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { MapContext, usePermissions } from '../../../store'
import * as LR from 'lucide-react'

import type { Organization } from '../../../types/dbTypes'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Textarea } from '../../ui/Textarea'
import { Separator } from '../../ui/Separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/Select'
import { uploadOrganizationLogoToPublicBucket } from '../../../utils/imageUtils'
import { useOrganization } from '../../../hooks/organizations/organizations'
import OrganizationSkeleton from './OrganizationSkeleton'

//import { useAppConfigContext } from '../../../store/AppConfig/context'

interface OrganizationSettingsPanelProps {
  minioBaseUrl?: string
}

export default function OrganizationSettingsPanel({
  minioBaseUrl,
}: OrganizationSettingsPanelProps) {
  const t = useTranslations('OrganizationSettings')

   // Permissions
  const { ability } = usePermissions()

  const { data: session } = useSession()

  const {state: mapState} = React.useContext(MapContext)
  const { countrySubdivisionsData } = mapState.map;

  const user = session?.user
  const userOrganizationId = user?.organizationId
  const {
    organization: organizationData,
    isLoading: isOrganizationLoading,
  } = useOrganization(userOrganizationId ? String(userOrganizationId) : null)

  const [organization, setOrganization] = React.useState<Organization | null>(organizationData ?? null)
  const [editingValues, setEditingValues] = React.useState<Partial<Organization>>({})
  const [isEditing, setIsEditing] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [selectedLogoFile, setSelectedLogoFile] = React.useState<File | null>(null)
  const [selectedFaviconFile, setSelectedFaviconFile] = React.useState<File | null>(null)

  React.useEffect(() => {
    if (organizationData) {
      setOrganization(organizationData)
    }
  }, [organizationData])

  const handleInputChange = (key: keyof Organization, value: any) => {
    setEditingValues(prev => ({
      ...prev,
      [key]: value,
    }))
    setHasChanges(true)
  }

  const getFieldValue = (property: keyof Organization) => {
    return Object.prototype.hasOwnProperty.call(editingValues, property)
      ? editingValues[property]
      : organization?.[property]
  }

  const handleSave = async () => {
    if (!organization) return

    try {
      const patch: Partial<Organization> = {
        ...editingValues,
      }

      // Upload logo if changed
      if (selectedLogoFile) {
        const logoKey = await uploadOrganizationLogoToPublicBucket(selectedLogoFile)
        patch.logoKey = logoKey
      }

      // Upload favicon if changed
      if (selectedFaviconFile) {
        const faviconKey = await uploadOrganizationLogoToPublicBucket(selectedFaviconFile)
        patch.faviconKey = faviconKey
      }

      const res = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })

      if (!res.ok) throw new Error('Failed to update organization')

      const responseData = await res.json()
      const updatedOrg = responseData?.organization ?? responseData
      setOrganization(updatedOrg)
      setEditingValues({})
      setIsEditing(false)
      setHasChanges(false)
      setSelectedLogoFile(null)
      setSelectedFaviconFile(null)
      toast.success('Organization updated successfully')
    } catch (error) {
      toast.error('Failed to update organization')
    }
  }

  const handleCancel = () => {
    setEditingValues({})
    setIsEditing(false)
    setHasChanges(false)
    setSelectedLogoFile(null)
    setSelectedFaviconFile(null)
  }

  //const { state: { runtimeConfig: { minioUrl } } } = useAppConfigContext()

  const logoUrl = selectedLogoFile
    ? URL.createObjectURL(selectedLogoFile)
    : organization?.logoKey && minioBaseUrl
      ? `${minioBaseUrl}/org-logos/${organization.logoKey}`
      : null

  const faviconUrl = selectedFaviconFile
    ? URL.createObjectURL(selectedFaviconFile)
    : organization?.faviconKey && minioBaseUrl
      ? `${minioBaseUrl}/org-logos/${organization.faviconKey}`
      : null

// const faviconUrl = selectedFaviconFile
//   ? URL.createObjectURL(selectedFaviconFile)
//   : organization?.faviconKey && minioUrl
//     ? `${minioUrl}/org-logos/${organization.faviconKey}`
//     : null
    
  if (isOrganizationLoading) {
    return (
      <OrganizationSkeleton />
    )
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('messages.noOrganization')}</p>
      </div>
    )
  }

  const countrySubdivisions = 
  countrySubdivisionsData
    ? Object.values(countrySubdivisionsData).map((subdivision: any) => subdivision.name)
    : []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b">
        <div>
          <h2 className="text-2xl font-semibold">{t('header')}</h2>
          <p className="text-sm text-muted-foreground">{t('subheader')}</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={!ability.can('update', "Organization")}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges || !ability.can('update', "Organization")}>
                <LR.Save className="mr-2" />
                {t('save')}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} disabled={!ability.can('update', "Organization")}>
              <LR.Pencil className="mr-2" />
              {t('edit')}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Branding Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('sections.branding')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.logo')}</label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 border rounded-lg overflow-hidden bg-muted flex items-center justify-center relative group">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Organization logo" className="w-full h-full object-contain" />
                    ) : (
                      <LR.Building2 className="h-12 w-12 text-muted-foreground" />
                    )}
                    {isEditing && (
                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <LR.Upload className="h-6 w-6 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setSelectedLogoFile(file)
                              setHasChanges(true)
                            }
                          }}
                          disabled={!ability.can('update', "Organization")}
                        />
                      </label>
                    )}
                  </div>
                  {isEditing && logoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLogoFile(null)
                        handleInputChange('logoKey', null)
                      }}
                      disabled={!ability.can('update', "Organization")}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              {/* Favicon */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.favicon')}</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border rounded-lg overflow-hidden bg-muted flex items-center justify-center relative group">
                    {faviconUrl ? (
                      <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                    ) : (
                      <LR.Image className="h-6 w-6 text-muted-foreground" />
                    )}
                    {isEditing && (
                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <LR.Upload className="h-4 w-4 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setSelectedFaviconFile(file)
                              setHasChanges(true)
                            }
                          }}
                          disabled={!ability.can('update', "Organization")}
                        />
                      </label>
                    )}
                  </div>
                  {isEditing && faviconUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFaviconFile(null)
                        handleInputChange('faviconKey', null)
                      }}
                      disabled={!ability.can('update', "Organization")}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.mainColor')}</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={(getFieldValue('mainColor') as string) || '#000000'}
                    onChange={(e) => handleInputChange('mainColor', e.target.value)}
                    disabled={!isEditing || !ability.can('update', "Organization")}
                    className="w-20 h-10 p-1"
                    
                  />
                  <Input
                    type="text"
                    value={(getFieldValue('mainColor') as string) || ''}
                    onChange={(e) => handleInputChange('mainColor', e.target.value)}
                    disabled={!isEditing || !ability.can('update', "Organization")}
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.secondaryColor')}</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={(getFieldValue('secondaryColor') as string) || '#000000'}
                    onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                    disabled={!isEditing || !ability.can('update', "Organization")}
                    className="w-20 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={(getFieldValue('secondaryColor') as string) || ''}
                    onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                    disabled={!isEditing || !ability.can('update', "Organization")}
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('sections.basicInfo')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.name')}</label>
                <Input
                  value={(getFieldValue('name') as string) || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={!isEditing || !ability.can('update', "Organization")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.title')}</label>
                <Input
                  value={(getFieldValue('title') as string) || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  disabled={!isEditing || !ability.can('update', "Organization")  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('fields.description')}</label>
              <Textarea
                value={(getFieldValue('description') as string) || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={!isEditing || !ability.can('update', "Organization")}
                rows={4}
              />
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('sections.location')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.countrySubdivision')}</label>
                <Select
                  value={String(getFieldValue('countrySubdivision') || '')}
                  onValueChange={(value) => handleInputChange('countrySubdivision', value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholders.selectProvince')} />
                  </SelectTrigger>
                  <SelectContent>
                    {countrySubdivisions.map((csName) => (
                      <SelectItem key={csName} value={csName}>
                        {csName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.municipality')}</label>
                <Input
                  value={(getFieldValue('municipality') as string) || ''}
                  onChange={(e) => handleInputChange('municipality', e.target.value)}
                  disabled={!isEditing || !ability.can('update', "Organization")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.postalCode')}</label>
                <Input
                  value={(getFieldValue('postalCode') as string) || ''}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  disabled={!isEditing || !ability.can('update', "Organization")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.locationId')}</label>
                <Input
                  value={(getFieldValue('locationId') as string) || ''}
                  onChange={(e) => handleInputChange('locationId', e.target.value)}
                  disabled={!isEditing || !ability.can('update', "Organization")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Map Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('sections.mapConfig')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.latitude')}</label>
                <Input
                  type="number"
                  step="any"
                  value={(getFieldValue('lat') as number) ?? ''}
                  onChange={(e) => handleInputChange('lat', e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={!isEditing || !ability.can('update', "Organization")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.longitude')}</label>
                <Input
                  type="number"
                  step="any"
                  value={(getFieldValue('long') as number) ?? ''}
                  onChange={(e) => handleInputChange('long', e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={!isEditing || !ability.can('update', "Organization")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.zoom')}</label>
                <Input
                  type="number"
                  step="any"
                  value={(getFieldValue('zoom') as number) ?? ''}
                  onChange={(e) => handleInputChange('zoom', e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={!isEditing || !ability.can('update', "Organization")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.minZoom')}</label>
                <Input
                  type="number"
                  step="any"
                  value={(getFieldValue('minZoom') as number) ?? ''}
                  onChange={(e) => handleInputChange('minZoom', e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={!isEditing || !ability.can('update', "Organization")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.bearing')}</label>
                <Input
                  type="number"
                  step="any"
                  value={(getFieldValue('bearing') as number) ?? ''}
                  onChange={(e) => handleInputChange('bearing', e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={!isEditing || !ability.can('update', "Organization")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.pitch')}</label>
                <Input
                  type="number"
                  step="any"
                  value={(getFieldValue('pitch') as number) ?? ''}
                  onChange={(e) => handleInputChange('pitch', e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={!isEditing || !ability.can('update', "Organization")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
