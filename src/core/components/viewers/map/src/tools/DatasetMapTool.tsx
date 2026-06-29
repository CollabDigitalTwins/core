"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { usePermissions } from '../../../../../store'

import * as LR from 'lucide-react'
import { Button } from '../../../../ui/Button'
import Datasets from '../../datasets'
import { Tool } from '../../../../../types/tools'
import { Organization } from '../../../../../types/dbTypes'

interface DatasetMapToolProps {
  tool: Tool
  organization?: Organization
  minioBaseUrl?: string
  martinBaseUrl?: string
  [key: string]: unknown
}

export default function DatasetMapTool({ tool, organization, minioBaseUrl, martinBaseUrl }: DatasetMapToolProps) {
  // Permissions
  const { ability } = usePermissions()

  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="flex justify-center items-center h-9 w-9 pointer-events-auto"
        onClick={() => setIsOpen(true)}
        title={tool?.title}
        disabled={!ability.can('read', 'File')}

      >
        <LR.Database />
      </Button>
      <Datasets
        isOpen={isOpen}
        setIsOpenAction={setIsOpen}
        organization={organization}
        minioBaseUrl={minioBaseUrl}
        martinBaseUrl={martinBaseUrl}
      />
    </>
  )
}