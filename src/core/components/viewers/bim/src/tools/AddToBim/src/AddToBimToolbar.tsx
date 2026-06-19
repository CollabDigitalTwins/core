"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react"
import { useTranslations } from "next-intl"
import * as LR from "lucide-react"
import { usePermissions } from "../../../../../../../store"
import { DropdownMenuItem } from "../../../../../../ui/DropdownMenu"
import { ItemsBadgeButton } from "../../../../../../ui"
import { ToolbarSubmenu } from "../../../../../../ToolbarSubmenu"
import type { Tool } from "../../../../../../../types/tools"

interface AddToBimToolbarProps {
  tool: Tool
  onStartFile: () => void
  onStartComment: () => void
  onStartCAD: () => void
  onStartSensor: () => void
  fileCount: number
  commentCount: number
  sensorCount: number
  onFileBadgeClick: () => void
  onCommentBadgeClick: () => void
  onSensorBadgeClick: () => void
}

export function AddToBimToolbar({
  tool,
  onStartFile,
  onStartComment,
  onStartCAD,
  onStartSensor,
  fileCount,
  commentCount,
  sensorCount,
  onFileBadgeClick,
  onCommentBadgeClick,
  onSensorBadgeClick,
}: AddToBimToolbarProps) {
  const t = useTranslations("AddToBim")
  const { ability } = usePermissions()

  return (
    <ToolbarSubmenu tool={tool}>
      <div className="flex items-center justify-between w-full relative gap-2">
        <DropdownMenuItem
          onClick={onStartFile}
          className="w-full"
          disabled={!ability.can("create", "File")}
        >
          <LR.FilePlus />
          <span>{t("fileButton")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="absolute right-0 w-10 p-0 h-full">
          <ItemsBadgeButton count={fileCount} onClick={onFileBadgeClick} />
        </DropdownMenuItem>
      </div>

      <div className="flex items-center justify-between w-full relative gap-2">
        <DropdownMenuItem
          onClick={onStartComment}
          className="w-full"
          disabled={!ability.can("create", "Comment")}
        >
          <LR.MessageCircle />
          <span>{t("commentButton")}</span>
        </DropdownMenuItem>
        <ItemsBadgeButton count={commentCount} onClick={onCommentBadgeClick} />
      </div>

      <DropdownMenuItem
        onClick={onStartCAD}
        disabled={!ability.can("create", "File")}
      >
        <LR.DraftingCompass />
        <span>CAD (dxf)</span>
      </DropdownMenuItem>

      <div className="flex items-center justify-between w-full relative gap-2">
        <DropdownMenuItem
          onClick={onStartSensor}
          className="w-full"
          disabled={!ability.can("create", "Sensor")}
        >
          <LR.Radio />
          <span>{t("sensorButton")}</span>
        </DropdownMenuItem>
        {sensorCount > 0 && (
          <ItemsBadgeButton count={sensorCount} onClick={onSensorBadgeClick} />
        )}
      </div>
    </ToolbarSubmenu>
  )
}
