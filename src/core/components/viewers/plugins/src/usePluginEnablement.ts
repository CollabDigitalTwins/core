'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { usePluginInstallations, usePluginUserSettings } from '../../../../hooks/plugins/plugins'
import { resolvePluginEnablement } from '../../../../plugins/enablement'

import type { ResolvedPluginEnablement } from '../../../../plugins/enablement'

/**
 * Which plugins run for the signed-in user. Wiring only — the rule lives in
 * `plugins/enablement.ts`. Mount above `AppProvider`:
 *
 *   const { enabledSlugs, configs } = usePluginEnablement()
 *   <AppProvider enabledSlugs={enabledSlugs} configs={configs}>
 *
 * Empty while the fetches are in flight, never undefined: the host reads undefined
 * as "activate everything", and an unresolved fetch is not permission to run
 * full-privilege code.
 */
export function usePluginEnablement(): ResolvedPluginEnablement & { isLoading: boolean } {
  const { installations, isLoading: loadingInstalls } = usePluginInstallations()
  const { userSettings, isLoading: loadingSettings } = usePluginUserSettings()

  const isLoading = loadingInstalls || loadingSettings

  return React.useMemo(() => {
    if (isLoading) return { enabledSlugs: [], configs: {}, isLoading }

    const { enabledSlugs, configs } = resolvePluginEnablement(installations, userSettings)
    return { enabledSlugs, configs, isLoading }
  }, [installations, userSettings, isLoading])
}
