// Dependencies
import React from 'react'

// Shadcn Components
import { Checkbox } from '../../../ui/Checkbox'
import { DescriptionListItem } from '../../../ui/DescriptionList'

interface CheckboxGroupProps {
  fields: any[]
  getFieldValue: (property: string) => any
  handleInputChange: (property: string, value: any) => void
  editing: boolean
}

const CheckboxGroup = ({ fields, getFieldValue, handleInputChange, editing }: CheckboxGroupProps) => {
  if (editing) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 py-3 w-full">
        {fields.map((field, idx) => {
          const value = getFieldValue(field.property)
          const bool = value === 'yes'

          return (
            <div key={idx} className="flex items-center space-x-2">
              <Checkbox
                id={field.property}
                checked={bool}
                onCheckedChange={checked => handleInputChange(field.property, checked ? 'yes' : 'no')}
              />
              <label
                htmlFor={field.property}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {field.label}
              </label>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 py-3 w-full border-b border-border">
      {fields.map((field, idx) => {
        const value = getFieldValue(field.property)

        return (
          <DescriptionListItem
            key={idx}
            className="break-words"
            label={field.label}
          >
            {value === 'yes' ? 'Yes' : 'No'}
          </DescriptionListItem>
        )
      })}
    </div>
  )
}

export default CheckboxGroup
