"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { cn } from '../../utils/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    const isColorInput = type === 'color'

    return (
      <input
        type={type}
        className={cn(
          isColorInput
            ? 'w-full h-full p-0 border-0 cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-none'
            : 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

const ColorInput = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<'input'>, 'type'> & {
  onValueChange?: (value: string) => void
  disabled?: boolean
  defaultColor?: string
}>(
    ({ className, value, onChange, onValueChange, disabled = false, defaultColor = '#000000', ...props }, ref) => {
      const [textValue, setTextValue] = React.useState(value?.toString() || defaultColor)

      React.useEffect(() => {
        setTextValue(value?.toString() || defaultColor)
      }, [value, defaultColor])

      const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setTextValue(newValue)
        onChange?.(e)
        onValueChange?.(newValue)
      }

      const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setTextValue(newValue)

        // Validate if it's a valid hex color
        const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
        if (hexPattern.test(newValue)) {
          const syntheticEvent = {
            ...e,
            target: { ...e.target, value: newValue },
          } as React.ChangeEvent<HTMLInputElement>
          onChange?.(syntheticEvent)
          onValueChange?.(newValue)
        }
      }

      return (
        <div className={cn('flex items-center gap-2', disabled && 'opacity-50', className)}>
          <div className={cn(
            'w-4 h-4 rounded-sm overflow-hidden border border-gray-300 shadow-sm flex-shrink-0 flex items-center justify-center',
            disabled && 'cursor-not-allowed',
          )}
          >
            <Input
              type="color"
              value={value}
              onChange={handleColorChange}
              ref={ref}
              className="!m-0"
              disabled={disabled}
              {...props}
            />
          </div>
          <Input
            type="text"
            value={textValue}
            onChange={handleTextChange}
            className="text-sm w-20 h-6 px-1 py-0"
            placeholder={defaultColor}
            disabled={disabled}
          />
        </div>
      )
    },
    )
ColorInput.displayName = 'ColorInput'

export { Input, ColorInput }
