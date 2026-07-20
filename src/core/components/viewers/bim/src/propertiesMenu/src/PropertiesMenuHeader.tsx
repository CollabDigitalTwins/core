'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Badge } from '../../../../../ui/Badge'
import { Button } from '../../../../../ui/Button'

interface SidebarHeaderProps {
  elementName: string | null
  onCloseAction: () => void
  idsStatus?: 'pass' | 'fail' | null
}

export function PropertiesMenuHeader({ elementName, onCloseAction, idsStatus }: SidebarHeaderProps) {
  // Translation
  const t = useTranslations('PropertiesMenuHeader')

  return (
    <div className="flex flex-col items-start w-full z-50 pointer-events-auto border-b pb-3 mb-4">
      <div className="flex items-center justify-between w-full pr-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={onCloseAction}
            className="group/sidebar-trigger opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
            variant="ghost"
            size="sm"
          >
            <LR.PanelRightClose className="h-4 w-4" />
            <span className="sr-only">{t('closeButton')}</span>
          </Button>
          <h2 className="text-base font-semibold">{t('header')}</h2>
        </div>
        {idsStatus && (
          <Badge
            variant="secondary"
            className={`${
              idsStatus === 'pass'
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
            } flex items-center gap-1.5`}
          >
            {idsStatus === 'pass' ? (
              <LR.Check className="h-3 w-3" />
            ) : (
              <LR.X className="h-3 w-3" />
            )}
            IDS {idsStatus === 'pass' ? t('pass') : t('fail')}
          </Badge>
        )}
      </div>
      {elementName && (
        <span className="text-xs text-muted-foreground font-normal truncate mt-2 ml-1">
          {elementName}
        </span>
      )}
    </div>
  )
}
