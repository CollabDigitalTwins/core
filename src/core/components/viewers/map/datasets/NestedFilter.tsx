"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Icons
import {
  ArrowLeft,
  Search,
} from 'lucide-react'
// Dependencies
import * as React from "react";
import { useTranslations } from 'next-intl'

import { Button, Checkbox, Input } from '../../../../components/ui/'
// Shadcn Components
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../../components/ui/DropdownMenu'

type NestedFilterProps = {
  label: string
  handleContent: (event: React.MouseEvent) => void
  setContent: (value: boolean) => void
  availableValues: string[]
  selectedValues: string[]
  onSelectionChange: (selectedValues: string[]) => void
}

export default function NestedFilter({
  label,
  handleContent,
  setContent,
  availableValues,
  selectedValues,
  onSelectionChange,
}: NestedFilterProps) {
  // Translation
  const t = useTranslations('NestedFilter')

  const [searchTerm, setSearchTerm] = React.useState('')

  const handleCheckboxChange = (value: string, checked: boolean) => {
    let newSelectedValues

    newSelectedValues = checked ? [...selectedValues, value] : selectedValues.filter(v => v !== value)

    onSelectionChange(newSelectedValues)
  }

  // Filter available values based on search term
  const filteredValues = availableValues.filter(value =>
    value.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <>
      <DropdownMenuContent align="end" onCloseAutoFocus={() => setContent(true)}>
        <DropdownMenuItem className="p-0 m-0 w-0">
          <Button onClick={handleContent} variant="ghost" className="capitalize font-semibold px-2 justify-start opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent">
            <ArrowLeft />
            {label}
          </Button>
        </DropdownMenuItem>
        <div className="my-2 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${t('searchPlaceholder')} ${label}`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8 border-none shadow-none"
            onKeyDown={(e) => {
              e.stopPropagation() // This disables Randix UI's default behavior for dropdown menu navigation
            }}
          />
        </div>
        <DropdownMenuSeparator />

        {filteredValues.length === 0 ? (
          <DropdownMenuItem disabled>
            {t('no')}
            {' '}
            {label}
            {' '}
            {t('valuesFound')}
          </DropdownMenuItem>
        ) : (
          filteredValues.map(value => (
            <DropdownMenuItem
              key={value}
              onSelect={(e) => {
                e.preventDefault()
              }}
              onClick={(e) => {
                e.stopPropagation()
                // Toggle the checkbox when clicking anywhere on the item
                handleCheckboxChange(value, !selectedValues.includes(value))
              }}
            >
              <Checkbox
                checked={selectedValues.includes(value)}
                onCheckedChange={(checked) => {
                  handleCheckboxChange(value, checked === true)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                }}
              />
              {value}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </>
  )
}