'use client'

// Components
import * as React from 'react'
import { Button } from './Button'
import { MapContext, MenusContext, ToolsContext } from '../../store'
import { CursorType } from '../../types/global'
import { ToolbarToolType, Tool } from '../../types/tools'

interface Props {
  tool: Tool
  onClick?: () => void // Rename to onClick for clarity
}

export default function ToolbarButton({ tool, onClick }: Props) {
  const { dispatch: toolsDispatch, state: toolsState }
    = React.useContext(ToolsContext)
  const { dispatch: menusDispatch, state: menusState }
    = React.useContext(MenusContext)
  const { dispatch: mapDispatch, state: mapState }
    = React.useContext(MapContext)

  // If this tool has a custom component, render that instead
  if (tool.component) {
    const CustomComponent = tool.component
    return <CustomComponent tool={tool} />
  }

  const setCursor = (cursor: CursorType) => {
    mapDispatch({
      type: 'SET_CURSOR',
      payload: { cursor },
    })
  }

  const setTools = (currentTool: ToolbarToolType) => {
    toolsDispatch({
      type: 'SET-TOOL',
      payload: { currentToolId: currentTool },
    })
  }

  const { currentToolId } = toolsState.tools
  const isActive = currentToolId === tool.id

  const handleToolClick = (tool: Tool) => { // Rename the internal function
    console.log('Tool clicked', tool)

    if (isActive) {
      // Deactivate the tool
      setTools(null)
      setCursor('')
    }
    else {
      // Activate the tool
      setTools(tool.id)
      setCursor(tool.cursor)
    }
  }

  const h = tool.height ? tool.height : '8'
  const w = tool.width ? tool.width : '7'

  return (
    <Button
      size="icon"
      variant="ghost"
      className={`flex justify-center items-center h-${h} w-${w} pointer-events-auto text-primary-dark ${
        tool.stayActive && isActive ? 'bg-primary-dark/15' : ''
      }`}
      onClick={() => {
        handleToolClick(tool) // Call internal logic first
        onClick?.() // Then call the prop if provided
      }}
      title={tool.title}
    >
      <tool.icon className="w-5 h-5" />
    </Button>
  )
}
