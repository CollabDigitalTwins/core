// Dependencies
import React from 'react'

// Shadcn Components
import { Checkbox, Input } from '../../../../components/ui/'

interface UnitsGridProps {
  subsection: any
  getFieldValue: (property: string) => any
  handleInputChange: (property: string, value: any) => void
  editing: boolean
}

const UnitsGrid = ({ subsection, getFieldValue, handleInputChange, editing }: UnitsGridProps) => {
  if (!subsection.columns || !subsection.rows) return null

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 font-medium">
        {subsection.columns.map((column, idx) => (
          <div key={idx} className="text-sm">{column.header}</div>
        ))}
      </div>

      <div className="space-y-4">
        {subsection.rows.map((row, rowIdx) => {
          const baseProperty = row.baseProperty
          const isToggleEnabled = getFieldValue(baseProperty) === 'yes'

          return (
            <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center py-3 border-b border-border">
              {/* First column: Unit Type */}
              <div>
                {editing
                  ? (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={baseProperty}
                          checked={isToggleEnabled}
                          onCheckedChange={checked =>
                            handleInputChange(baseProperty, checked ? 'yes' : 'no')}
                        />
                        <label
                          htmlFor={baseProperty}
                          className="text-sm font-medium leading-none"
                        >
                          {row.label}
                        </label>
                      </div>
                    )
                  : (
                      <div className="flex items-center gap-4">
                        <Checkbox
                          id={baseProperty}
                          checked={getFieldValue(`${baseProperty}${subsection.columns[1].propertyPrefix}`) > 0}
                          disabled
                        />
                        <span className="text-sm">{row.label}</span>
                      </div>
                    )}
              </div>

              {/* Second column: Number input */}
              {subsection.columns[1] && (
                <div>
                  {editing
                    ? (
                        <Input
                          type="number"
                          value={getFieldValue(`${baseProperty}${subsection.columns[1].propertyPrefix}`) || ''}
                          onChange={e => handleInputChange(`${baseProperty}${subsection.columns[1].propertyPrefix}`, Number(e.target.value))}
                          disabled={!isToggleEnabled}
                        />
                      )
                    : (
                        <div className="text-sm">
                          {getFieldValue(`${baseProperty}${subsection.columns[1].propertyPrefix}`)
                            || (isToggleEnabled ? '0' : '')}
                        </div>
                      )}
                </div>
              )}

              {/* Third column: Sq Ft input */}
              {subsection.columns[2] && (
                <div>
                  {editing
                    ? (
                        <Input
                          type="number"
                          value={getFieldValue(`${baseProperty}${subsection.columns[2].propertyPrefix}`) || ''}
                          onChange={e => handleInputChange(`${baseProperty}${subsection.columns[2].propertyPrefix}`, Number(e.target.value))}
                          disabled={!isToggleEnabled}
                        />
                      )
                    : (
                        <div className="text-sm">
                          {getFieldValue(`${baseProperty}${subsection.columns[2].propertyPrefix}`)
                            || (isToggleEnabled ? '0' : '')}
                        </div>
                      )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default UnitsGrid
