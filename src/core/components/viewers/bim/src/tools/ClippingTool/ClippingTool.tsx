"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as OBC from '@thatopen/components'
import * as OBF from "@thatopen/components-front"
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";
import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

// Utilities
import { MenusContext, ToolsContext } from '../../../../../../store'
import { BimContext } from '../../../../../../store'


// Shadcn components
import { ToolbarSubmenu, SubmenuContext } from '../../../../../ToolbarSubmenu'
import { Button } from '../../../../../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../ui/Card'
import { DropdownMenuItem } from '../../../../../ui/DropdownMenu'

// Icons
import { Cursor } from '../../Cursor'

import type { CursorType } from '../../../../../../types/global'
import type { Tool, ToolbarToolType } from '../../../../../../types/tools'

// Submenu wrapper

interface ClippingToolProps {
  tool: Tool
}

export const ClippingTool: React.FC<ClippingToolProps> = ({ tool }) => {
  const { dispatch: toolsDispatch, state: toolsState } = React.useContext(ToolsContext)
  const { dispatch: menusDispatch } = React.useContext(MenusContext)
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents, world } = bimState.bim

  const [active, setActive] = React.useState(false)
  const keydownRef = React.useRef<(e: KeyboardEvent) => void>(() => {})

  const setCursor = (cursor: CursorType) => {
    if (!bimComponents) return
    const currentCursor = bimComponents.get(Cursor)
    if (!currentCursor) return
    currentCursor.cursor = cursor
  }

  const setTools = (currentToolId: ToolbarToolType) => {
    toolsDispatch({
      type: 'SET-TOOL',
      payload: { currentToolId },
    })
  }

  const flipAddingPlaneState = async () => {
    const _active = !active

    setActive(_active)
    setTools(_active ? tool.id : null)
    setCursor(_active ? 'crosshair' : '')
  }

  const removeAllClippingPlanes = React.useCallback(() => {
    if (!world || !bimComponents) return
    console.log("Remove all clipping planes")
    bimComponents.get(OBC.Clipper).deleteAll()
  }, [world, bimComponents])

  //use effect to handle controlling the state of adding clipping plane
  const handleCreateClippingPlane = React.useCallback(async () => {
    if (!world || !bimComponents) return
    // set up
    const casters = bimComponents.get(OBC.Raycasters)
    casters.get(world)

    //styling
    const clipStyler = bimComponents.get(OBF.ClipStyler)
    clipStyler.world = world;
    clipStyler.styles.set("Black", {
      linesMaterial: new LineMaterial({
        color: "black",
        linewidth: 2,                 // thick, screen-space lines
      }),
      fillsMaterial: new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide,       // see the cap from both sides
        // transparent: true,            // enable opacity blending
        // opacity: 0.2,                // soft see-through cap
        // depthWrite: false,            // reduce sorting issues with transparency
        // polygonOffset: true,          // nudge to prevent z-fighting
        // polygonOffsetFactor: -2,
        // polygonOffsetUnits: 1,
      }),
    });

    //set up items to be filled
    const finder = bimComponents.get(OBC.ItemsFinder);
    finder.create("Walls", [{ categories: [/WALL/] }]);
    finder.create("Slabs", [{ categories: [/SLAB/] }]);
    finder.create("Columns", [{ categories: [/COLUMN/] }]);
    finder.create("Doors", [{ categories: [/DOOR/] }]);
    finder.create("Curtains", [{ categories: [/PLATE/, /MEMBER/] }]);
    finder.create("Windows", [{ categories: [/WINDOW/] }]);

    const classifier = bimComponents.get(OBC.Classifier);
    const classificationName = "ClipperGroups";
    classifier.setGroupQuery(classificationName, "Walls", { name: "Walls" });
    classifier.setGroupQuery(classificationName, "Slabs", { name: "Slabs" });
    classifier.setGroupQuery(classificationName, "Columns", { name: "Columns" });
    classifier.setGroupQuery(classificationName, "Doors", { name: "Doors" });
    classifier.setGroupQuery(classificationName, "Curtains", { name: "Curtains" });
    classifier.setGroupQuery(classificationName, "Windows", { name: "Windows" });

    //Create clipper
    const clipper = bimComponents.get(OBC.Clipper)
    clipper.enabled = true

    //Apply styling
    clipper.list.onItemSet.add(({ key }) => {
      clipStyler.createFromClipping(key, {
        items: { All: { style: "Black" } },
      });
    });

    const result = await clipper.create(world)

    if (result) {
      console.log(result)
    }
  }, [world, bimComponents])

  React.useEffect(() => {
    keydownRef.current = (event: KeyboardEvent) => {
      if (event.key === 'Backspace') {
        // Remove the clipping plane under the cursor
        if (!world || !bimComponents) return
        bimComponents.get(OBC.Clipper).delete(world, undefined)
      }
    }
  }, [world, bimComponents])

  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    keydownRef.current?.(e)
  }, [])

  // Handle deleting plane using Backspace
  React.useEffect(() => {
    if (!active) {
      window.removeEventListener('keydown', handleKeyDown)
      return
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [active, handleKeyDown])

  React.useEffect (() => {
    if (!world || !bimComponents) return

    const container = world.renderer.three.domElement

    if (active) {
      container.addEventListener("dblclick", handleCreateClippingPlane)
    }
    else {
      container.removeEventListener("dblclick", handleCreateClippingPlane)
    }

  }, [active, world, bimComponents])

  return (
    <div>
      <ToolbarSubmenu tool={tool}>
        <DropdownMenuItem onClick={flipAddingPlaneState}>
          <LR.PlusSquare />
          <span>{active? 'Cancel add' : 'Add'} clipping Plane</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => removeAllClippingPlanes()}>
          <LR.Trash2/>
          <span> Delete all clipping planes</span>
        </DropdownMenuItem>
      </ToolbarSubmenu>

      {active  &&
       <Card className="p-3 absolute bottom-10 left-0 bg-background shadow-md z-10 w-full">
            <span className="text-muted-foreground text-xs">
              Double click on the model to add a clipping plane. Press Backspace to remove the clipping plane.
            </span>
        </Card>
      }
    </div>

  )
}