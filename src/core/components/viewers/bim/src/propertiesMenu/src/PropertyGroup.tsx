'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import * as LR from 'lucide-react'
import { Badge } from '../../../../../ui/Badge'
import { Separator } from '../../../../../ui/Separator'

interface ElementProperty {
  name: string
  value: string | number
  type?: 'string' | 'number' | 'boolean'
}

interface PropertyGroup {
  name: string
  icon: React.ReactNode
  properties: ElementProperty[]
  defaultOpen?: boolean
  id: string
}

interface PropertyGroupProps {
  group: PropertyGroup
  isExpanded: boolean
  onToggleAction: (groupId: string) => void
  formatPropertyValueAction: (value: string | number, groupId?: string) => string
}

export function PropertyGroup({ group, isExpanded, onToggleAction, formatPropertyValueAction }: PropertyGroupProps) {
  return (
    <div className="space-y-2 p-3">
      <button
        onClick={() => onToggleAction(group.id)}
        className="flex items-center justify-between w-full pr-2 text-left hover:bg-muted/50 rounded-md transition-colors"
      >
        <div className="flex items-center gap-2">
          {group.icon}
          <span className="text-sm font-medium">{group.name}</span>
          <Badge variant="outline" className="text-xs">
            {group.properties.length}
          </Badge>
        </div>
        <LR.ChevronDown
          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="pl-6 space-y-1">
          {group.properties.map((property, propIndex) => (
            <div key={propIndex} className="flex flex-wrap items-start gap-x-2 py-1 text-xs">
              <span className="text-muted-foreground font-medium flex-shrink-0">
                {property.name}
                :
              </span>
              <span className="font-mono text-foreground break-words min-w-0 text-right ml-auto">
                {formatPropertyValueAction(property.value, group.id)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Separator className="my-3" />
    </div>
  )
}
