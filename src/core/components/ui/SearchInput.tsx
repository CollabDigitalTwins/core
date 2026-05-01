import * as React from 'react'
import * as LR from 'lucide-react'
import { Input } from './Input'
import { cn } from '../../utils'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, placeholder = 'Search', ...props }, ref) => {
    return (
      <div className="relative">
        <LR.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={ref}
          placeholder={placeholder}
          className={cn('pl-9 h-9 text-sm', className)}
          {...props}
        />
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'
