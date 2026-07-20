// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Shadcn Components
import * as LR from 'lucide-react'

import { Button, Checkbox } from '../../../../components/ui/'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../components/ui/DropdownMenu'

// Icons

interface FilterFilesProps {
  availableTypes: string[]
  selectedTypes: string[]
  onTypesChange: (types: string[]) => void
}

export default function FilterFiles({ availableTypes, selectedTypes, onTypesChange }: FilterFilesProps) {
  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type))
    } else {
      onTypesChange([...selectedTypes, type])
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className='border-dashed'
        >
          <LR.Filter />
          Type
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {availableTypes.length === 0 ? (
          <DropdownMenuItem disabled>
            No files available
          </DropdownMenuItem>
        ) : (
          availableTypes.map((type) => (
            <DropdownMenuItem
              key={type}
              onSelect={(e) => e.preventDefault()}
              onClick={() => handleTypeToggle(type)}
            >
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={selectedTypes.includes(type)}
                  onCheckedChange={() => handleTypeToggle(type)}
                />
                <label
                  htmlFor={`type-${type}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {type}
                </label>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}