// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useCoreHooks } from '../provider'

/** Convenience wrappers, matching the per-domain shape of the other hook modules. */

export const usePluginInstallations = () => useCoreHooks().plugin.usePluginInstallations()

export const usePluginUserSettings = () => useCoreHooks().plugin.usePluginUserSettings()

/** The write functions, for the extensions page's actions port. */
export const usePluginActions = () => useCoreHooks().plugin.pluginActions
