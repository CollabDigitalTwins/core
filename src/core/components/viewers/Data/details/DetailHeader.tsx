'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import type { Building, Infrastructure, Site, User } from '../../../../types/dbTypes'
import type { FileRow } from '../../../../types/files'

function getCountryName(code: string | null | undefined): string | null {
  if (!code) return null
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? null
  } catch {
    return null
  }
}

// Types
interface DetailHeaderProps {
  selectedItem?: Building | null
  selectedSite?: Site | null
  selectedInfrastructure?: Infrastructure | null
  selectedFile?: FileRow | null
  selectedUser?: Partial<User> | null
  countryCode?: string | null
}

// Sub-components — one per entity type, all follow the same shape:
// icon + primary title (name || fallback) + optional subtitle

function BuildingHeader({ building, countryName }: { building: Building; countryName: string | null }) {
  const title = building.buildingName || building.buildingAddress
  const parts = [building.buildingCountrySubdivision, countryName].filter(Boolean)
  const subtitle = building.buildingName
    ? building.buildingAddress
    : parts.length ? parts.join(', ') : (building.buildingAddress ?? '')

  return (
    <>
      <LR.Building2 className="h-8 w-8 shrink-0" />
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold truncate">{title}</h1>
        <p className="text-muted-foreground truncate">{subtitle}</p>
      </div>
    </>
  )
}

function SiteHeader({ site, countryName }: { site: Site; countryName: string | null }) {
  const title = site.siteName || site.siteAddress
  const parts = [site.siteCountrySubdivision, countryName].filter(Boolean)
  const subtitle = site.siteName
    ? site.siteAddress
    : parts.length ? parts.join(', ') : (site.siteAddress ?? '')

  return (
    <>
      <LR.BoxSelect className="h-8 w-8 shrink-0" />
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold truncate">{title}</h1>
        <p className="text-muted-foreground truncate">{subtitle}</p>
      </div>
    </>
  )
}

function InfrastructureHeader({ infrastructure, countryName }: { infrastructure: Infrastructure; countryName: string | null }) {
  const title = infrastructure.infrastructureName || infrastructure.infrastructureType
  const parts = [infrastructure.infrastructureCountrySubdivision, countryName].filter(Boolean)
  const subtitle = infrastructure.infrastructureName
    ? infrastructure.infrastructureType
    : parts.length ? parts.join(', ') : (infrastructure.infrastructureType ?? '')

  return (
    <>
      <LR.TrainTrack className="h-8 w-8 shrink-0" />
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold truncate">{title}</h1>
        <p className="text-muted-foreground truncate">{subtitle}</p>
      </div>
    </>
  )
}

function FileHeader({ file }: { file: FileRow }) {
  return (
    <>
      <LR.File className="h-8 w-8 shrink-0" />
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold truncate">{file.name}</h1>
      </div>
    </>
  )
}

function UserHeader({ user }: { user: Partial<User> }) {
  return (
    <>
      <LR.Users className="h-8 w-8 shrink-0" />
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold truncate">{user.name || 'New User'}</h1>
        {user.email && <p className="text-muted-foreground truncate">{user.email}</p>}
      </div>
    </>
  )
}

// DetailHeader — resolves which sub-component to render

export default function DetailHeader({
  selectedItem,
  selectedSite,
  selectedInfrastructure,
  selectedFile,
  selectedUser,
  countryCode,
}: DetailHeaderProps) {
  const countryName = getCountryName(countryCode)

  return (
    <div className="flex items-center gap-4 min-w-0">
      {selectedItem
        ? <BuildingHeader building={selectedItem} countryName={countryName} />
        : selectedSite
          ? <SiteHeader site={selectedSite} countryName={countryName} />
          : selectedInfrastructure
            ? <InfrastructureHeader infrastructure={selectedInfrastructure} countryName={countryName} />
            : selectedFile
              ? <FileHeader file={selectedFile} />
              : selectedUser
                ? <UserHeader user={selectedUser} />
                : null}
    </div>
  )
}