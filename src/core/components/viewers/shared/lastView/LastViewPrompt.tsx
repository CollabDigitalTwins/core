'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { namesALocation, readLastView } from './lastViewStore'
import { useLastViewScope } from './useLastViewScope'

const LAST_VIEW_TOAST_MS = 15_000

/** On an entry whose URL names no location, offers to reopen the user's last remembered map or building view. */
export function LastViewPrompt() {
  const t = useTranslations('LastView')
  const scope = useLastViewScope()
  const [entrySearch] = React.useState(() => (typeof window === 'undefined' ? '' : window.location.search))
  const offered = React.useRef(false)

  React.useEffect(() => {
    if (!scope || offered.current) return
    offered.current = true
    if (namesALocation(new URLSearchParams(entrySearch))) return

    const view = readLastView(scope)
    if (!view) return
    toast(t('title'), {
      description: t(view.viewer === 'bim' ? 'bimDescription' : 'mapDescription'),
      duration: LAST_VIEW_TOAST_MS,
      action: { label: t('goBack'), onClick: () => window.location.assign(view.url) },
    })
  }, [scope, entrySearch, t])

  return null
}
