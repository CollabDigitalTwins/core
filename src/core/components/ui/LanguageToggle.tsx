'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Button } from '../../components/ui/Button'
import { Globe } from 'lucide-react'
import { Language } from '../../types/dbTypes'

interface LanguageToggleProps {
  language: Language
  onToggle: () => void
}

export default function LanguageToggle({ language, onToggle }: LanguageToggleProps) {

  const printLanguage = language.toUpperCase() ?? 'EN'
  return (
    <Button
      onClick={onToggle}
      variant="outline"
      size="sm"
      className="gap-2 border-border/60 hover:border-accent-primary/40"
    >
      <Globe className="w-4 h-4" />
      {printLanguage}
    </Button>
  )
}
