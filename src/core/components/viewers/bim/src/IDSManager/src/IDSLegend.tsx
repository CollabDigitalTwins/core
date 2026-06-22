'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { Badge } from '../../../../../ui/Badge'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import { IdsIcon } from '../../../../../ui/Icons/IdsIcon'

interface IDSLegendProps {
  idsTestResults: { passed: number; failed: number }
  title: string
  description: string
  onClose: () => void
  onHeightChange?: (height: number) => void
}

export function IDSLegend({ idsTestResults, title, description, onClose, onHeightChange }: IDSLegendProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isInitialMount, setIsInitialMount] = React.useState(true)
  const t = useTranslations('ids')

  // Memoize the percentage calculations
  const stats = React.useMemo(() => {
    const total = idsTestResults.passed + idsTestResults.failed
    const passPercentage = total > 0 
      ? Math.round((idsTestResults.passed / total) * 100) 
      : 0
    const failPercentage = total > 0 
      ? Math.round((idsTestResults.failed / total) * 100) 
      : 0
    
    return { total, passPercentage, failPercentage }
  }, [idsTestResults.passed, idsTestResults.failed])

  React.useEffect(() => {
    setIsInitialMount(false)
  }, [])

  React.useEffect(() => {
    if (containerRef.current && onHeightChange) {
      const height = containerRef.current.offsetHeight
      onHeightChange(height)
    }
  }, [onHeightChange, stats, description])

  return (
    <div 
      ref={containerRef}
      className={`fixed right-2 w-80 z-50 rounded-md bg-background/95 backdrop-blur-sm border shadow-lg ${
        isInitialMount 
          ? 'animate-in slide-in-from-right duration-300' 
          : ''
      }`}
      style={{
        bottom: '0.5rem',
        minWidth: '300px',
      }}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3 border-b gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2">
              <IdsIcon className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">{t('idsCheck')}: {title}</h2>
            </div>
            {description && (
              <p className="text-xs text-muted-foreground ml-6">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="opacity-70 hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-muted rounded"
            aria-label="Close IDS verification"
          >
            <LR.X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Pass Results */}
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
            <div className="flex items-center gap-2.5">
              <LR.Check className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">{t('pass')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold">
                {idsTestResults.passed}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ({stats.passPercentage}%)
              </span>
            </div>
          </div>

          {/* Fail Results */}
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
            <div className="flex items-center gap-2.5">
              <LR.X className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">{t('fail')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold">
                {idsTestResults.failed}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ({stats.failPercentage}%)
              </span>
            </div>
          </div>
          {/* Total Summary */}
          <div className="flex items-center justify-between px-3 rounded-md bg-muted/30">
            <span className="text-sm text-muted-foreground">{t('total')}</span>
            <Badge variant="outline" className="font-semibold">
              {stats.total}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
