'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as SliderPrimitive from '@radix-ui/react-slider'
import * as React from 'react'

import { cn } from '../../utils/utils'

import { Input } from './Input'

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full" style={{ background: 'linear-gradient(rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.8)), #18181b' }}>
      <SliderPrimitive.Range className="absolute h-full bg-gray-100 rounded-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-gray-200 bg-white shadow-[0px_1px_3px_rgba(0,_0,_0,_0.1),_0px_1px_2px_rgba(0,_0,_0,_0.06)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

interface SliderWithInputProps {
  label: string
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  className?: string
  inputClassName?: string
  sliderClassName?: string
  disabled?: boolean
}

const SliderWithInput = React.forwardRef<
  HTMLDivElement,
  SliderWithInputProps
>(({
  label,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  unit,
  className,
  inputClassName,
  sliderClassName,
  disabled = false,
  ...props
}, ref) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number.parseFloat(e.target.value) || 0
    const clampedValue = Math.min(Math.max(newValue, min), max)
    onValueChange([clampedValue])
  }

  return (
    <div ref={ref} className={cn('space-y-2', className)} {...props}>
      <div className="flex justify-between items-center text-sm">
        <label className={cn('font-medium', disabled && 'text-gray-400')}>{label}</label>
        <div className="flex items-center space-x-1">
          <Input
            type="number"
            value={value[0]}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={cn('w-16 h-6 text-xs', inputClassName)}
          />
          {unit && <span className={cn('text-xs text-gray-500', disabled && 'text-gray-400')}>{unit}</span>}
        </div>
      </div>
      <Slider
        value={value}
        onValueChange={onValueChange}
        max={max}
        min={min}
        step={step}
        disabled={disabled}
        className={cn('w-full', sliderClassName)}
      />
    </div>
  )
})
SliderWithInput.displayName = 'SliderWithInput'

export { Slider, SliderWithInput }
