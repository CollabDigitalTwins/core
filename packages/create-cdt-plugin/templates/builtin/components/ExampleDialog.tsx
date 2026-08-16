// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Button } from '../../sdk/components'
import { usePluginTranslations } from '../../sdk/messages'

// The host supplies `close` and owns everything around this: the overlay, the title bar, the
// focus trap and Escape. Render the body only.
//
// Whatever `open(id, props)` passed arrives here as props, so type them and they are checked
// at the call site.
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
