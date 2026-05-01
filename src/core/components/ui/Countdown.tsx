'use client'

import * as React from "react";
import { cn } from '../../utils/utils'
import { useTranslations } from 'next-intl'

interface CountdownProps {
  targetDate: Date
  className?: string
}

interface TimeUnit {
  value: number
  label: string
}

export default function Countdown({ targetDate, className }: CountdownProps) {
  const [timeLeft, setTimeLeft] = React.useState<TimeUnit[]>([])
  const [mounted, setMounted] = React.useState(false)

  const t = useTranslations('HomePage.countdown')

  React.useEffect(() => {
    setMounted(true)
    
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const target = targetDate.getTime()
      const difference = target - now

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        return [
          { value: days, label: t('days') },
          { value: hours, label: t('hours') },
          { value: minutes, label: t('minutes') },
          { value: seconds, label: t('seconds') }
        ]
      }

      return [
        { value: 0, label: t('days') },
        { value: 0, label: t('hours') },
        { value: 0, label: t('minutes') },
        { value: 0, label: t('seconds') }
      ]
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    setTimeLeft(calculateTimeLeft())

    return () => clearInterval(timer)
  }, [targetDate])

  if (!mounted) {
    return null
  }

  return (
    <div className={cn('flex gap-4', className)}>
      {timeLeft.map((unit, index) => (
        <TimeUnitDisplay
          key={unit.label}
          value={unit.value}
          label={unit.label}
          delay={index * 100}
        />
      ))}
    </div>
  )
}

interface TimeUnitDisplayProps {
  value: number
  label: string
  delay: number
}

function TimeUnitDisplay({ value, label, delay }: TimeUnitDisplayProps) {
  const formattedValue = value.toString().padStart(2, '0')

  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className={cn(
          "w-16 h-16 border-white border rounded-xl shadow-2xl backdrop-blur-sm",
          "flex items-center justify-center transition-all duration-300"
        )}
      >
        <span 
          className={cn(
            "text-primary-light font-black text-2xl font-mono tracking-wider"
          )}
        >
          {formattedValue}
        </span>
      </div>

      {/* Label */}
      <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
        {label}
      </span>
    </div>
  )
}