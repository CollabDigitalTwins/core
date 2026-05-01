'use client'
import * as React from 'react'
import * as LR from 'lucide-react'

export interface ElementProperty {
  name: string
  value: string | number
  type?: 'string' | 'number' | 'boolean'
}

export interface PropertyGroup {
  name: string
  icon: React.ReactNode
  properties: ElementProperty[]
  defaultOpen?: boolean
  id: string
}

// Function to format property values
export const formatPropertyValue = (value: string | number, groupId?: string): string => {
  if (typeof value === 'number') {
    if (groupId === 'dimensions') {
      return value.toFixed(2)
    }
    return value % 1 === 0 ? value.toString() : value.toString()
  }

  const numValue = Number.parseFloat(value as string)
  if (!isNaN(numValue) && isFinite(numValue)) {
    if (groupId === 'dimensions') {
      return numValue.toFixed(2)
    }
    return numValue % 1 === 0 ? numValue.toString() : numValue.toString()
  }
  return value as string
}

// Function to analyze property and determine group
export const analyzeProperty = (
  fullName: string,
  value: string | number,
  t: (key: string) => string = (k) => k,
) => {
  let cleanName = fullName
  let groupId = 'other'
  let groupName = t('other')
  let icon = <LR.HelpCircle className="h-4 w-4" />

  // Extract clean name
  if (fullName.includes('.')) {
    const [, ...rest] = fullName.split('.')
    cleanName = rest.join('.')
  }

  if (cleanName.startsWith('_')) {
    cleanName = cleanName.slice(1)
    cleanName = cleanName.replaceAll(/\b\w/g, char => char.toUpperCase())
    cleanName = cleanName.replaceAll(/\s+(.)/g, (_, char) => char.toUpperCase())
  }

  const cleanNameLower = cleanName.toLowerCase()
  const fullNameLower = fullName.toLowerCase()

  // Determine group based on property name
  if (['name', 'globalid', 'tag', 'localid', 'id', 'guid', 'ifcguid', 'type', 'category', 'objecttype', 'description', 'predefinedtype', 'class'].some(term =>
    cleanNameLower.includes(term) || fullNameLower.includes(term))) {
    groupId = 'identity-data'
    groupName = t('identity')
    icon = <LR.User2 className="h-4 w-4" />
  }
  else if (['length', 'width', 'height', 'area', 'volume', 'thickness', 'radius', 'diameter', 'size', 'dimension'].some(dim =>
    cleanNameLower.includes(dim) || fullNameLower.includes(dim))) {
    groupId = 'dimensions'
    groupName = t('dimensions')
    icon = <LR.Ruler className="h-4 w-4" />
  }
  else if (['material'].some(term => cleanNameLower.includes(term) || fullNameLower.includes(term))) {
    groupId = 'materials'
    groupName = t('materials')
    icon = <LR.Palette className="h-4 w-4" />
  }
  else if (['geom', 'shape'].some(term => cleanNameLower.includes(term) || fullNameLower.includes(term))) {
    groupId = 'geometry'
    groupName = t('geometry')
    icon = <LR.Box className="h-4 w-4" />
  }
  else if (['constraint', 'limit'].some(term => cleanNameLower.includes(term) || fullNameLower.includes(term))) {
    groupId = 'constraints'
    groupName = t('constraints')
    icon = <LR.Lock className="h-4 w-4" />
  }
  else if (['createdby', 'creationdate', 'lastmodifiedby', 'lastmodifyingdate', 'phase', 'status'].some(term =>
    cleanNameLower.includes(term) || fullNameLower.includes(term))) {
    groupId = 'phasing'
    groupName = t('phasing')
    icon = <LR.Clock className="h-4 w-4" />
  }
  else if (fullNameLower.startsWith('pset_')) {
    groupId = 'property-sets'
    groupName = t('propertySets')
    icon = <LR.ListChecks className="h-4 w-4" />
  }

  return { cleanName, groupId, groupName, icon }
}
