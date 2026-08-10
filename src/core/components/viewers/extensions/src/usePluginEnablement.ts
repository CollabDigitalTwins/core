'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { usePluginInstallations, usePluginUserSettings } from '../../../../hooks/plugins/plugins'
import { resolvePluginEnablement } from '../../../../plugins/enablement'

import type { ResolvedPluginEnablement } from '../../../../plugins/enablement'

/**
 * Which plugins should run for the signed-in user, resolved from the two levels.
 *
 * Feeds `PluginHostProvider`'s `enabledSlugs` and `configs`, so the toolbars only
 * show what this user should see. Mount it above `AppProvider` in the app:
 *
 *   const { enabledSlugs, configs } = usePluginEnablement()
 *   <AppProvider enabledSlugs={enabledSlugs} configs={configs}>
 *
 * The rule itself lives in `plugins/enablement.ts` and is unit tested there; this
 * is only the wiring that hands it the two lists.
 *
 * While the fetches are in flight `enabledSlugs` is undefined rather than empty —
 * undefined means "activate everything", which keeps the previous behaviour on
 * first paint instead of blinking every plugin off and back on.
 */
export function usePluginEnablement(): Partial<ResolvedPluginEnablement> & { isLoading: boolean } {
  const { installations, isLoading: loadingInstalls } = usePluginInstallations()
  const { userSettings, isLoading: loadingSettings } = usePluginUserSettings()

  const isLoading = loadingInstalls || loadingSettings

  return React.useMemo(() => {
    if (isLoading) return { isLoading }

    const { enabledSlugs, configs } = resolvePluginEnablement(installations, userSettings)
    return { enabledSlugs, configs, isLoading }
  }, [installations, userSettings, isLoading])
}
