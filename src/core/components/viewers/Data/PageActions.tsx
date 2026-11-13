"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button } from '../../../components/ui/Button'
import { usePermissions } from '../../../store'
import { ViewerNames } from '../../../types/'

import AddBuilding from './buildingDetails/AddBuilding'
import BuildingMoreOptions from './buildingDetails/BuildingsMoreOptions'
import DatatableFileAdder from './files/DatatableFileAdder'
import AddInfrastructure from './infrastructureDetails/AddInfrastructure'
import AddSite from './siteDetails/AddSite'
import AddUser from './userDetails/AddUser'
import UserMoreOptions from './userDetails/UserMoreOptions'

import type { Building, Site, User } from '../../../types/dbTypes'

type PageActionsProps = {
  currentViewer: string
  users?: User[]
  geocodeEarthApiKey?: string
  geocoderUrl?: string
  filteredData?: Array<Building | Site>
}

/** Collection-level actions for a data table: Add for the current viewer plus its ⋯ menu. */
export default function PageActions({ currentViewer, users, geocodeEarthApiKey, geocoderUrl, filteredData }: PageActionsProps) {
  const t = useTranslations('HeaderButtons')
  const { ability } = usePermissions()

  const [newItemName, setNewItemName] = React.useState('')
  const [newBuildingFields, setNewBuildingFields] = React.useState({})
  const [newInfrastructureFields, setNewInfrastructureFields] = React.useState({})
  const [addInfrastructureOpen, setAddInfrastructureOpen] = React.useState(false)
  const [addBuildingOpen, setAddBuildingOpen] = React.useState(false)
  const [addUserOpen, setAddUserOpen] = React.useState(false)

  switch (currentViewer) {
    case ViewerNames.files: {
      return <DatatableFileAdder />
    }
    case ViewerNames.buildings: {
      return (
        <>
          <BuildingMoreOptions buildings={filteredData as Building[]} variant="outline" />
          <Button onClick={() => setAddBuildingOpen(true)} disabled={!ability.can('create', 'Building')}>
            <LR.CirclePlus />
            {t('addBuilding')}
          </Button>
          <AddBuilding
            newBuildingFields={newBuildingFields}
            setNewBuildingFields={setNewBuildingFields}
            open={addBuildingOpen}
            onOpenChange={setAddBuildingOpen}
            geocodeEarthApiKey={geocodeEarthApiKey}
            geocoderUrl={geocoderUrl}
          />
        </>
      )
    }
    case ViewerNames.sites: {
      return <AddSite newItemName={newItemName} setNewItemName={setNewItemName} />
    }
    case ViewerNames.infrastructure: {
      return (
        <AddInfrastructure
          newInfrastructureFields={newInfrastructureFields}
          setNewInfrastructureFields={setNewInfrastructureFields}
          open={addInfrastructureOpen}
          onOpenChange={setAddInfrastructureOpen}
        />
      )
    }
    case ViewerNames.users: {
      return (
        <>
          <UserMoreOptions users={users} variant="outline" />
          <Button onClick={() => setAddUserOpen(true)} disabled={!ability.can('create', 'User')}>
            <LR.CirclePlus />
            {t('addUser')}
          </Button>
          <AddUser open={addUserOpen} onOpenChange={setAddUserOpen} />
        </>
      )
    }
  }
  return null
}
