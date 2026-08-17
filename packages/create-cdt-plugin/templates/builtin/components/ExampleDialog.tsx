// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Button } from '../../sdk/components'
import { usePluginTranslations } from '../../sdk/messages'

// The host owns the overlay, title bar, focus trap and Escape. Render the body only.
interface Props {
  close: () => void
  subject?: string
}

export function {{COMPONENT}}({ close, subject }: Props) {
  const t = usePluginTranslations()

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {subject
          ? t('body', 'Showing details for ') + subject
          : t('bodyEmpty', 'Opened without a subject.')}
      </p>

      <Button className="self-end" onClick={close}>{t('close', 'Close')}</Button>
    </div>
  )
}
