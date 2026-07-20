"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as LR from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

// Utilities
import { DropdownMenuItem } from "../../../../../../components/ui/DropdownMenu";
import { PointCloudContext } from "../../../../../../store";


// Icons
import { ToolbarSubmenu } from "../../../../../ToolbarSubmenu";

//typedefs
import { ClipTask } from '../../../define'

import type { Tool } from "../../../../../../types/tools";

interface GenericTool {
  tool: Tool;
}

export const ClippingTool: React.FC<GenericTool> = ({ tool }) => {
  // Translation
  const t = useTranslations("ClippingTool");

  const { state: pointCloudStates, dispatch: pointCloudDispatch } =
    React.useContext(PointCloudContext);
  const {viewer} = pointCloudStates.pointcloud
  const [isActive, setIsActive] = React.useState(false);
  const [clipOption, setClipOption] = React.useState<ClipTask>(ClipTask.NONE);

  const Tick = () => <LR.Check className="ml-auto h-4 w-4 opacity-80" />;

  const setClip = (task: ClipTask) => {
    if (!viewer) return;
    viewer.setClipTask(task);
    setClipOption(task);
  };

  const addClipBox = () => {
    if (!viewer) return;

    const item = viewer.volumeTool.startInsertion({ clip: true });
    viewer.setClipTask(ClipTask.HIGHLIGHT);
  }

  return (
    <div>
      <ToolbarSubmenu tool={tool}>
        <DropdownMenuItem onClick={addClipBox}>
          <LR.Box />
          <span>Insert Clip Box</span>
          {isActive && <Tick />}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setClip(ClipTask.SHOW_INSIDE)}>
          <LR.SquareArrowDown className="mr-2 h-4 w-4" />
          <span>Show Inside</span>
          {clipOption === ClipTask.SHOW_INSIDE && <Tick />}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setClip(ClipTask.SHOW_OUTSIDE)}>
          <LR.ExternalLink className="mr-2 h-4 w-4" />
          <span>Show Outside</span>
          {clipOption === ClipTask.SHOW_OUTSIDE && <Tick />}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setClip(ClipTask.HIGHLIGHT)}>
          <LR.Highlighter className="mr-2 h-4 w-4" />
          <span>Highlight</span>
          {clipOption === ClipTask.HIGHLIGHT && <Tick />}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setClip(ClipTask.NONE)}>
          <LR.X className="mr-2 h-4 w-4" />
          <span>Not applied</span>
          {clipOption === ClipTask.NONE && <Tick />}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => viewer?.scene.removeAllClipVolumes()}>
          <LR.Trash2 className="mr-2 h-4 w-4" />
          <span>Remove all</span>
        </DropdownMenuItem>
      </ToolbarSubmenu>

      {/* <ClipBox active={isActive} currentClipBoxes={[]} /> */}
    </div>
  );
};
