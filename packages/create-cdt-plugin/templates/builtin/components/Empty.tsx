'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginTranslations } from '../../sdk/messages'

import type { {{PROPS_TYPE}} } from '{{CORE_ENTRY}}'
import type { ToolbarToolProps } from '../../sdk/types'

// Core wraps every toolbar contribution in the standard button and dropdown, built from the
// `label` and `icon` in the registration. Render panel content, not chrome: a plugin that
// draws its own floating card ends up with it inside the toolbar strip.
//
// Every translation call passes an inline English fallback, so this reads correctly in a
// locale the manifest has not translated.
export function {{COMPONENT}}(_props: ToolbarToolProps & {{PROPS_TYPE}}) {
  const t = usePluginTranslations()

  return (
    <div className="w-60 p-1">
      <p className="px-2 py-1 text-sm font-medium">{t('title', '{{NAME}}')}</p>
    </div>
  )
}
