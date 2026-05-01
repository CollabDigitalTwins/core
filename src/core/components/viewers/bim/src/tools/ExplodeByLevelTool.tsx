"use client"

// Use this tutorial https://docs.thatopen.com/Tutorials/Fragments/Fragments/FragmentsModels/EditApi

// Dependencies
import * as React from "react";
import { useTranslations } from 'next-intl'

// Utilities
import { Tool } from '../../../../../types/tools'

// Shadcn components
import { Button } from '../../../../ui/Button'

// Icons
import * as LR from 'lucide-react'
import { BimContext } from '../../../../../store/BIM/context'

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
      // TODO: Implement explode by level functionality
      console.log('Explode by level functionality not implemented yet')
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
      onClick={handleExplodeByLevel}
      title={`${tool.title} (${t('comingSoon')})`}
      disabled={true}
    >
      <LR.Layers3 />
    </Button>
  )
}