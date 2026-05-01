'use client'

import * as React from 'react'
import { ChevronDownIcon } from 'lucide-react'

import { Button } from './Button'
import { Calendar } from './Calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './Popover'
import { Label } from './Label'
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
