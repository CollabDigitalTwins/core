// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import React from 'react'
import { Input } from '../../../ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/Select'
import { Badge } from '../../../ui/Badge'
import { Button } from '../../../ui/Button'
import { X } from 'lucide-react'
import { BuildingHeatingEnergySource, BuildingCoolingEnergySource, BuildingHotWaterEnergySource } from '../../../../types/dbTypes'

interface EnergySourcesGridProps {
  subsection: any
  getFieldValue: (property: string) => any
  handleInputChange: (property: string, value: any) => void
  editing: boolean
}

const EnergySourcesGrid = ({ subsection, getFieldValue, handleInputChange, editing }: EnergySourcesGridProps) => {
  // Explicitly define the rows
  const rows = [
    {
      label: "Heating Energy Source",
      sourceProp: 'buildingHeatingEnergySources',
      metricProp: 'buildingHeatingMetric',
      yearProp: 'buildingHeatingInstallationYear',
      enumType: BuildingHeatingEnergySource,
    },
    {
      label: "Cooling Energy Source",
      sourceProp: 'buildingCoolingEnergySources',
      metricProp: 'buildingCoolingMetric',
      yearProp: 'buildingCoolingInstallationYear',
      enumType: BuildingCoolingEnergySource,
    },
    {
      label: "Hot Water Energy Source",
      sourceProp: 'buildingHotWaterSystemsEnergySources',
      metricProp: 'buildingHotWaterSystemsMetric',
      yearProp: 'buildingHotWaterSystemsInstallationYear',
      enumType: BuildingHotWaterEnergySource,
    },
  ]

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 font-medium">
        <div className="text-sm">Energy Source</div>
        <div className="text-sm">Annual Energy Use (kWh)</div>
        <div className="text-sm">Installation Year</div>
      </div>
      <div className="space-y-4">
        {rows.map((row, rowIdx) => {
          // Get the raw value and ensure it's an array
          const rawValue = getFieldValue(row.sourceProp)
          const selectedValues = Array.isArray(rawValue) ? rawValue : (rawValue ? [] : [])

          // Get metric and year values
          const metricValue = getFieldValue(row.metricProp)
          const yearValue = getFieldValue(row.yearProp)

          // DEBUG:
          console.log('EnergySourcesGrid Debug:', {
            label: row.label,
            sourceProp: row.sourceProp,
            metricProp: row.metricProp,
            yearProp: row.yearProp,
            rawValue,
            selectedValues,
            metricValue,
            yearValue
          })

          return (
            <div
              key={rowIdx}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start py-3 border-b border-border"
            >
              {/* Source Multi-select and badges */}
              <div className="flex flex-col">
                {editing ? (
                  <>
                    <Select
                      value=""
                      onValueChange={val => {
                        if (!selectedValues.includes(val)) {
                          handleInputChange(row.sourceProp, [...selectedValues, val])
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${row.label.toLowerCase()}(s)`} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(row.enumType).filter(v => !selectedValues.includes(v)).map(v => (
                          <SelectItem key={String(v)} value={String(v)}>{(v as string).replaceAll('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedValues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedValues.map((v: string) => (
                          <Badge key={v} variant="secondary" className="gap-1">
                            {v.replaceAll('_', ' ')}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="p-0 hover:bg-transparent w-auto h-auto"
                              onClick={() => {
                                const updated = selectedValues.filter(t => t !== v)
                                handleInputChange(row.sourceProp, updated)
                              }}
                            >
                              <X className="!w-3 !h-3" size={8} />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedValues.length > 0 ? (
                      selectedValues.map((v: string) => (
                        <Badge key={v} variant="secondary" className="gap-1">
                          {v.replaceAll('_', ' ')}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm">---</span>
                    )}
                  </div>
                )}
              </div>
              {/* Metric input */}
              <div className="flex flex-col justify-start">
                {editing ? (
                  <Input
                    type="number"
                    value={metricValue ?? ''}
                    onChange={e => handleInputChange(row.metricProp, e.target.value === '' ? null : Number(e.target.value))}
                  />
                ) : (
                  <span className="text-sm">{metricValue ?? '---'}</span>
                )}
              </div>
              {/* Installation Year input */}
              <div className="flex flex-col justify-start">
                {editing ? (
                  <Input
                    type="number"
                    value={yearValue ?? ''}
                    onChange={e => handleInputChange(row.yearProp, e.target.value === '' ? null : Number(e.target.value))}
                  />
                ) : (
                  <span className="text-sm">{yearValue ?? '---'}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default EnergySourcesGrid