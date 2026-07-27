"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Use this tutorial https://docs.thatopen.com/Tutorials/Fragments/Fragments/FragmentsModels/EditApi

// Dependencies
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";

// Utilities
import { BimContext } from '../../../../../store/BIM/context'
import { Button } from '../../../../ui/Button'

import type { Tool } from '../../../../../types/tools'

// Shadcn components

// Icons


interface ExplodeByLevelProps {
  tool: Tool
}

export const ExplodeByLevelTool: React.FC<ExplodeByLevelProps> = ({ tool }) => {
  // Translation
  const t = useTranslations('ExplodeByLevelTool')

  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim

  const handleExplodeByLevel = async () => {
    if (!bimComponents) return

    try {
      // ⚠️ Explode-by-level functionality not implemented
    }
    catch (error) {
      console.error('Error exploding by level:', error)
    }
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="flex justify-center items-center h-9 w-9 pointer-events-auto opacity-50"
      onClick={() => void handleExplodeByLevel()}
      title={`${tool.title} (${t('comingSoon')})`}
      disabled={true}
    >
      <LR.Layers3 />
    </Button>
  )
}