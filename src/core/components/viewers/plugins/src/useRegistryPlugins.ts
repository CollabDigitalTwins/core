'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import useSWR from 'swr'

import type { RegistryActions, RegistryState } from '../types'

const REGISTRY_KEY = ['pluginRegistry']
const EMPTY: RegistryState = { configured: false, plugins: [] }

/** A registry call that failed, carrying the registry's own code and explanation. */
export class RegistryRequestError extends Error {
  constructor(readonly code: string, message: string, readonly details: string[] = []) {
    super(message)
    this.name = 'RegistryRequestError'
  }
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
  const response = await fetch(`/api/plugins/registry${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (response.ok) return response
  const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string; details?: string[] }
  throw new RegistryRequestError(payload.error ?? 'unknown', payload.message ?? `Request failed (${response.status})`, payload.details)
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await send(method, path, body)
  return (await response.json().catch(() => ({}))) as T
}

async function download(path: string, fallbackName: string): Promise<{ fileName: string; contents: Blob }> {
  const response = await send('GET', path)
  const fileName = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName
  return { fileName, contents: await response.blob() }
}

// Fetched directly, like mounted plugins: a deployment without a registry answers `configured: false`.
export function useRegistryPlugins(): { registry: RegistryState; isLoading: boolean; refresh: () => Promise<unknown> } {
  const { data, isLoading, mutate } = useSWR<RegistryState>(
    REGISTRY_KEY,
    async () => {
      const response = await fetch('/api/plugins/registry')
      if (!response.ok) return EMPTY
      return (await response.json()) as RegistryState
    },
    { revalidateOnFocus: false },
  )

  const refresh = React.useCallback(() => mutate(), [mutate])
  return { registry: data ?? EMPTY, isLoading, refresh }
}

/** The registry writes bound to the app's `/api/plugins/registry` routes, refreshing the catalog after each. */
export function useRegistryActions(override?: RegistryActions): RegistryActions {
  const { refresh } = useRegistryPlugins()

  return React.useMemo<RegistryActions>(() => {
    if (override) return override

    const plugin = (slug: string) => `/plugins/${encodeURIComponent(slug)}`
    const thenRefresh = async <T,>(work: Promise<T>) => {
      const result = await work
      await refresh()
      return result
    }

    return {
      publishMounted: slug =>
        thenRefresh(call<{ version: string; claimed: boolean }>('POST', `/publish/${encodeURIComponent(slug)}`)),
      removeVersion: (slug, version) =>
        thenRefresh(call<{ outcome: 'deleted' | 'yanked' }>('DELETE', `${plugin(slug)}/versions/${encodeURIComponent(version)}`)),
      removePlugin: slug => thenRefresh(call<void>('DELETE', plugin(slug))),
      listOrganizations: () => call('GET', '/organizations'),
      setGrant: (slug, organizationId, pinnedVersion) =>
        thenRefresh(call<void>('PUT', `${plugin(slug)}/grants/${organizationId}`, { pinnedVersion })),
      revokeGrant: (slug, organizationId) => thenRefresh(call<void>('DELETE', `${plugin(slug)}/grants/${organizationId}`)),
      exportPackage: (slug, version) =>
        download(`${plugin(slug)}/versions/${encodeURIComponent(version)}/package`, `${slug}-${version}.cdtplugin.json`),
      exportMountedPackage: slug =>
        download(`/mounted/${encodeURIComponent(slug)}/package`, `${slug}.cdtplugin.json`),
      importPackage: pkg => thenRefresh(call('POST', '/import', pkg)),
    }
  }, [override, refresh])
}
