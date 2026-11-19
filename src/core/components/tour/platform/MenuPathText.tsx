// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import type { TourItem } from '../tourTypes'

const MENU_ICONS: Record<string, TourItem['icon']> = { support: LR.LifeBuoy, guide: LR.Compass }

const TOKEN = /@(\w+)/g

function renderLine(line: string, labels: Record<string, string>): React.ReactNode[] {
  return line.split(TOKEN).map((part, i) => {
    if (i % 2 === 0) return part
    const Icon = MENU_ICONS[part]
    if (!Icon || !(part in labels)) return `@${part}`
    return <span key={i} className="cdt-tour-menu-path"><Icon />{labels[part]}</span>
  })
}

/** Tour text whose `@support` and `@guide` tokens show as the sidebar menu's icon and label; lines become paragraphs. */
export function MenuPathText({ text, labels }: { text: string; labels: Record<string, string> }) {
  return <>{text.split('\n').map((line, i) => <p key={i}>{renderLine(line, labels)}</p>)}</>
}
