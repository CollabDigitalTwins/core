// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export const CDT_LOGO = '/images/cdt-logo-stroke.svg'

const ORG_LOGO_EXTENSIONS = ['png', 'svg'] as const

/** Public URL of an object in the `org-logos` bucket, or undefined when either part is missing. */
export function orgLogoUrl(storageBaseUrl: string | undefined, key: string | null | undefined): string | undefined {
  return storageBaseUrl && key ? `${storageBaseUrl}/org-logos/${key}` : undefined
}

/** Conventional `<orgName>-logo.<ext>` URLs, tried when an organization has no stored logo key. */
export function orgLogoCandidates(storageBaseUrl: string | undefined, orgName: string | null | undefined): string[] {
  if (!storageBaseUrl || !orgName) return []
  return ORG_LOGO_EXTENSIONS.map(ext => `${storageBaseUrl}/org-logos/${orgName}-logo.${ext}`)
}
