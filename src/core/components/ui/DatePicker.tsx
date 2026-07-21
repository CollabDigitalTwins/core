'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ChevronDownIcon } from 'lucide-react'
import * as React from 'react'

import { Button } from './Button'
import { Calendar } from './Calendar'
import { Label } from './Label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './Popover'
interface DatePickerProps {
  date?: Date | undefined
  onSelect?: (date: Date | undefined) => void
  label?: string
  disabled?: boolean
}

export function DatePicker({ date, onSelect, label, disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <Label htmlFor="date" className="px-1">
          {label}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            {date ? date.toLocaleDateString() : 'Select date'}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            onSelect={(date) => {
              if (onSelect) onSelect(date)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
