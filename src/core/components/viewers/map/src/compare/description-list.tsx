// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Data
import type { Building } from '../../../../../types/dbTypes'

interface DescriptionListLabelProps {
  label: string
  children: React.ReactNode
  compareBuildings?: Building[]
  index?: number
}

interface DescriptionListItemProps {
  label: string
  children: React.ReactNode
  compareBuildings?: Building[]
  index?: number
}

interface DescriptionListProps {
  compareBuildings: Building[]
  index?: number
}

export function DescriptionListLabel({ label }: DescriptionListLabelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-2 py-5 md:py-6 border-t border-border">
      <div className="col-span-4 text-sm font-semibold text-foreground">
        {label}
      </div>
    </div>
  )
}

export function DescriptionListItem({ label, children }: DescriptionListItemProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-0 py-0 border-b border-border">
      <div className="col-span-4 py-3 px-2 text-sm font-semibold text-foreground">
        {label}
      </div>
      <div className="col-span-8 text-sm text-muted-foreground p-0">
        {children}
      </div>
    </div>
  )
}

export function DescriptionList({ compareBuildings, index = 0 }: DescriptionListProps) {
  // Helper function to capitalize the first letter of each word
  const capitalizeLabel = (key: string) => {
    return key
      .split(/(?=[A-Z])/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="bg-background">
      <div className="flex flex-col">
        {compareBuildings && compareBuildings.length > 0
          && Object.entries(compareBuildings[index] || compareBuildings[0]).map(([key, value]) => (
            <DescriptionListItem key={key} label={capitalizeLabel(key)}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </DescriptionListItem>
          ))}
      </div>
    </div>
  )
}
