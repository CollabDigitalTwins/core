'use client'

import * as React from 'react'
import { Button } from './Button'
import { Switch } from './Switch'
import * as LR from 'lucide-react'
import { Badge } from './Badge'

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  icon?: React.ElementType
  className?: string
  style?: React.CSSProperties
  chevronPosition?: 'left' | 'right'
  switchVariant?: {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled?: boolean
  }
  itemCount?: number
  onAddItem?: () => void
  onToggleVisibility?: (visibility: boolean) => void
  addItemTitle?: string
  colour?: string
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  icon,
  className,
  style,
  chevronPosition = 'right',
  switchVariant,
  itemCount,
  onAddItem,
  onToggleVisibility,
  addItemTitle = 'Add item',
  colour
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const prevCheckedRef = React.useRef(switchVariant?.checked)

  // Auto-expand when visibility turns on, auto-collapse when turns off
  React.useEffect(() => {
    if (!switchVariant) return
    
    const prevChecked = prevCheckedRef.current
    const currentChecked = switchVariant.checked
    
    if (!prevChecked && currentChecked) {
      // Just turned visible - expand
      setIsOpen(true)
    } else if (prevChecked && !currentChecked) {
      // Just turned invisible - collapse
      setIsOpen(false)
    }
    
    prevCheckedRef.current = currentChecked
  }, [switchVariant?.checked])

  return (
    <div className="w-full min-h-0 flex flex-col" style={style}>
      <div className="px-3 flex-shrink-0">
        <div
          className="flex items-center overflow-hidden gap-2 cursor-pointer hover:bg-accent/50 rounded-md p-1 -m-1 transition-colors"
          onClick={(e) => {
            // Prevent toggle when clicking on switch or add button
            if (e.target instanceof HTMLElement
              && (e.target.closest('[role="switch"]') || e.target.closest('button'))) {
              return
            }
            setIsOpen(!isOpen)
          }}
          title={isOpen ? 'Collapse section' : 'Expand section'}
        >
          {chevronPosition === 'left' && (
            <LR.ChevronRight
              className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            />
          )}
          {icon && React.createElement(icon, { className: 'h-4 w-4', style: colour ? { color: colour } : undefined })}
          <h3 className="text-sm font-medium text-foreground flex-1 flex items-center gap-2">
            {title.replace(/_/g, ' ')}
            {typeof itemCount === 'number' && (
              <Badge variant="secondary" className="text-xs">
                {itemCount}
              </Badge>
            )}
          </h3>

          {/* Switch and chevron positioning */}
          <div className="flex items-center gap-2 ml-auto">
            {onAddItem && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddItem()
                }}
                title={addItemTitle}
              >
                <LR.Plus className="h-3 w-3" />
              </Button>
            )}
            {chevronPosition === 'right' && switchVariant && (
              <Switch
                checked={switchVariant.checked}
                onCheckedChange={switchVariant.onCheckedChange}
                disabled={switchVariant.disabled ?? false}
                title={switchVariant.checked ? `Hide ${title.toLowerCase()}` : `Show ${title.toLowerCase()}`}
              />
            )}
            {chevronPosition === 'right' && (
              <LR.ChevronRight
                className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
              />
            )}
            {chevronPosition === 'left' && switchVariant && (
              <Switch
                checked={switchVariant.checked}
                onCheckedChange={switchVariant.onCheckedChange}
                disabled={switchVariant.disabled ?? false}
              />
            )}
          </div>
        </div>
      </div>
      {isOpen && (
        <div className={`pl-3 pt-2 min-h-0 flex-1 ${className || ''}`}>
          {children}
        </div>
      )}
    </div>
  )
}
