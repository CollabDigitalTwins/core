'use client'
import * as React from 'react'
import * as OBC from '@thatopen/components'
import { ElementProperty, PropertyGroup, analyzeProperty } from './utils'
import { useTranslations } from 'next-intl'

export function useElementProperties(bimComponents: any) {
  // Function to get element attributes using ThatOpen API
  const getElementAttributes = React.useCallback(async (localId: number, attributes?: string[]) => {
    if (!bimComponents) return null

    const fragments = bimComponents.get(OBC.FragmentsManager)
    if (!fragments?.core?.models?.list) return null
    const models = [...fragments.core.models.list.values()]; for (const model of models) {
      try {
        const [data] = await (model as any).getItemsData([localId], {
          attributesDefault: !attributes,
          attributes,
        })

        if (data) return data
      }
      catch {
        continue
      }
    }

    return null
  }, [bimComponents])

  // Function to get element property sets using ThatOpen API
  const getElementPropertySets = React.useCallback(async (localId: number) => {
    if (!bimComponents) return null

    const fragments = bimComponents.get(OBC.FragmentsManager)
    if (!fragments?.core?.models?.list) return null
    const models = [...fragments.core.models.list.values()]; for (const model of models) {
      try {
        const [data] = await (model as any).getItemsData([localId], {
          attributesDefault: false,
          attributes: ['Name', 'NominalValue'],
          relations: {
            IsDefinedBy: { attributes: true, relations: true },
            DefinesOcurrence: { attributes: false, relations: false },
          },
        })

        if (data?.IsDefinedBy) {
          return data.IsDefinedBy
        }
      }
      catch {
        continue
      }
    }

    return null
  }, [bimComponents])

  // Function to format property sets into a more usable format
  const formatPropertySets = React.useCallback((rawPsets: any[]) => {
    const result: Record<string, Record<string, any>> = {}

    for (const [_, pset] of rawPsets.entries()) {
      const { Name: psetName, HasProperties } = pset
      if (!('value' in psetName && Array.isArray(HasProperties))) continue

      const props: Record<string, any> = {}
      for (const [_, prop] of HasProperties.entries()) {
        const { Name, NominalValue } = prop
        if (!('value' in Name && 'value' in NominalValue)) continue

        const name = Name.value
        const nominalValue = NominalValue.value
        if (!(name && nominalValue !== undefined)) continue

        props[name] = nominalValue
      }

      result[psetName.value] = props
    }

    return result
  }, [])

  // Function to fetch element properties from ThatOpen model
  const t = useTranslations('analyzeProperty')
  const fetchElementProperties = React.useCallback(async (localId: number): Promise<{ groups: PropertyGroup[], elementName: string | null }> => {
    try {
      const allProperties: ElementProperty[] = []

      // Add local ID for reference
      allProperties.push({
        name: 'LocalId',
        value: localId,
        type: 'number',
      })

      // Get basic attributes
      const attributes = await getElementAttributes(localId)
      if (attributes) {
        for (const [key, attr] of Object.entries(attributes)) {
          if (attr && typeof attr === 'object' && 'value' in attr && (attr as any).value !== undefined && (attr as any).value !== null) {
            allProperties.push({
              name: key,
              value: (attr as any).value as string | number,
              type: typeof (attr as any).value as 'string' | 'number',
            })
          }
        }
      }

      // Get property sets
      const rawPsets = await getElementPropertySets(localId)
      if (rawPsets && Array.isArray(rawPsets)) {
        const formattedPsets = formatPropertySets(rawPsets)

        for (const [psetName, psetProps] of Object.entries(formattedPsets)) {
          for (const [propName, propValue] of Object.entries(psetProps)) {
            allProperties.push({
              name: `${psetName}.${propName}`,
              value: propValue,
              type: typeof propValue as 'string' | 'number',
            })
          }
        }
      }

      // Group properties dynamically
      const groupMap = new Map<string, {
        id: string
        name: string
        icon: React.ReactNode
        properties: ElementProperty[]
        defaultOpen: boolean
      }>()

      for (const property of allProperties) {
        const { cleanName, groupId, groupName, icon } = analyzeProperty(property.name, property.value, t)

        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, {
            id: groupId,
            name: groupName,
            icon: icon,
            properties: [],
            defaultOpen: ['identity-data'].includes(groupId),
          })
        }

        const group = groupMap.get(groupId)!
        const isDuplicate = group.properties.some(existingProp =>
          existingProp.name === cleanName && existingProp.value === property.value,
        )

        if (!isDuplicate) {
          group.properties.push({ ...property, name: cleanName })
        }
      }

      // Convert to array and sort groups by priority
      const groupPriority: Record<string, number> = {
        'identity-data': 1,
        'dimensions': 2,
        'materials': 3,
        'geometry': 4,
        'constraints': 5,
        'phasing': 6,
      }

      const groups = [...groupMap.values()].sort((a, b) => {
        const priorityA = groupPriority[a.id] || 999
        const priorityB = groupPriority[b.id] || 999
        return priorityA - priorityB || a.name.localeCompare(b.name)
      })

      // Extract element name from properties
      const nameProperty = allProperties.find(prop =>
        prop.name.toLowerCase() === 'name'
        || prop.name.toLowerCase().includes('name'),
      )
      const elementName = nameProperty ? String(nameProperty.value) : null

      return { groups, elementName }
    }
    catch (error) {
      console.error('Error fetching element properties:', error)
      return { groups: [], elementName: null }
    }
  }, [getElementAttributes, getElementPropertySets, formatPropertySets, t])

  return { fetchElementProperties }
}
