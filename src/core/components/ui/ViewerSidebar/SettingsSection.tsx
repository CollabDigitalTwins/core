'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { CollapsibleSection } from '../CollapsibleSection'

interface SettingsSectionProps {
  /** Lucide component, shown at the left of the header. */
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
  /** Optional header toggle, for sections that own a visibility flag. */
  switchVariant?: {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled?: boolean
  }
  defaultOpen?: boolean
}

/**
 * One settings section, styled the same everywhere: icon left, chevron right, collapsed by
 * default. Tabs compose these instead of each restating the CollapsibleSection props.
 */
export function SettingsSection({
  icon,
  title,
  children,
  switchVariant,
  defaultOpen = false,
}: SettingsSectionProps) {
  return (
    <CollapsibleSection
      icon={icon}
      title={title}
      chevronPosition="right"
      switchVariant={switchVariant}
      defaultOpen={defaultOpen}
    >
      {children}
    </CollapsibleSection>
  )
}
