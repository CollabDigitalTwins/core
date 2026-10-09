'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'
import useSWR, { mutate } from 'swr'

import { PLUGIN_INSTALLATIONS_KEY } from '../../../../hooks/plugins/createPluginHooks'

import { sharedPluginChanges } from './sharedPluginChanges'
import { useMountedPlugins } from './useMountedPlugins'

import type { SharedPluginChange } from './sharedPluginChanges'
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

async function asFile(response: Response, fallbackName: string): Promise<{ fileName: string; contents: Blob }> {
  const fileName = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName
  return { fileName, contents: await response.blob() }
}

async function download(path: string, fallbackName: string): Promise<{ fileName: string; contents: Blob }> {
  return asFile(await send('GET', path), fallbackName)
}

async function deleteRegistryPlugin(path: string, slug: string, force: boolean): Promise<{ backup?: { fileName: string; contents: Blob } }> {
  const response = await send('DELETE', force ? `${path}?force=1` : path)
  if (!response.headers.get('content-type')?.startsWith('text/csv')) return {}
  return { backup: await asFile(response, `${slug}-data.csv`) }
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

/** Re-reads what this organization is shared, and says so when a registry write changed it. */
function useRefreshSharedPlugins(): () => Promise<void> {
  const t = useTranslations('PluginRegistry')
  const { mounted, refresh } = useMountedPlugins()
  const latest = React.useRef(mounted)
  React.useEffect(() => {
    latest.current = mounted
  }, [mounted])

  return React.useCallback(async () => {
    const message = (change: SharedPluginChange): string => {
      switch (change.kind) {
        case 'added': return t('toastSharedAdded', { name: change.name })
        case 'updated': return t('toastSharedUpdated', { name: change.name, version: change.version })
        case 'removed': return t('toastSharedRemoved', { name: change.name })
      }
    }
    const before = latest.current
    for (const change of sharedPluginChanges(before, await refresh())) toast.info(message(change))
  }, [refresh, t])
}

/** The registry writes bound to the app's `/api/plugins/registry` routes, refreshing the catalog and this organization's plugins after each. */
export function useRegistryActions(override?: RegistryActions): RegistryActions {
  const { refresh } = useRegistryPlugins()
  const refreshShared = useRefreshSharedPlugins()

  return React.useMemo<RegistryActions>(() => {
    if (override) return override

    const plugin = (slug: string) => `/plugins/${encodeURIComponent(slug)}`
    const thenRefresh = async <T,>(work: Promise<T>) => {
      const result = await work
      await Promise.allSettled([refresh(), refreshShared(), mutate(PLUGIN_INSTALLATIONS_KEY)])
      return result
    }

    return {
      publishMounted: slug =>
        thenRefresh(call<{ version: string; claimed: boolean }>('POST', `/publish/${encodeURIComponent(slug)}`)),
      removeVersion: (slug, version) =>
        thenRefresh(call<{ outcome: 'deleted' | 'yanked' }>('DELETE', `${plugin(slug)}/versions/${encodeURIComponent(version)}`)),
      removePlugin: (slug, options) => thenRefresh(deleteRegistryPlugin(plugin(slug), slug, options?.force ?? false)),
      installHere: slug => thenRefresh(call<void>('POST', `${plugin(slug)}/install`)),
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
  }, [override, refresh, refreshShared])
}
