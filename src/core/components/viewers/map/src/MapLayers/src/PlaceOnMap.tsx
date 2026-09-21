"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from "next-intl"
import * as React from "react"
import { toast } from "sonner"

import { useBuildings } from "../../../../../../hooks/buildings/buildings"
import { useFile } from "../../../../../../hooks/files/files"
import { MapContext } from "../../../../../../store"

import { resolveClickPlacement } from "../../Placement/resolveClickPlacement"
import { useBuildingLinkConfirm } from "../../Placement/useBuildingLinkConfirm"

import type { Building, DbFile } from "../../../../../../types/dbTypes"
import type * as maplibregl from "maplibre-gl"



interface PlaceOnMapProps {
    file: DbFile
    /** Which gesture places it. A model rides on the map's own click, so it asks for a double. */
    gesture?: "click" | "dblclick"
    onPlaced: (file: DbFile, lat: number, lng: number, buildingId: number | null) => void
    onCancel: () => void
}

/**
 * Puts the map into click-to-place: the next gesture writes where the file stands,
 * and the building under it when it lands on one. Escape cancels.
 */
export const PlaceOnMap: React.FC<PlaceOnMapProps> = ({ file, gesture = "click", onPlaced, onCancel }) => {
    const { state: mapState } = React.useContext(MapContext)
    const { map, mapClickManager } = mapState.map
    // The organization's buildings, not the store's: nothing fills that list.
    const { buildings } = useBuildings()
    const buildingsRef = React.useRef<Building[]>(buildings ?? [])
    buildingsRef.current = buildings ?? []
    const { updateFile } = useFile(file.id)
    const t = useTranslations("Placement")
    const { confirmLink, dialog } = useBuildingLinkConfirm()
    const confirmLinkRef = React.useRef(confirmLink)
    confirmLinkRef.current = confirmLink

    // Stable refs so the map effect never needs to re-register
    const onPlacedRef = React.useRef(onPlaced)
    const onCancelRef = React.useRef(onCancel)
    onPlacedRef.current = onPlaced
    onCancelRef.current = onCancel

    // A popover opening on the first click would swallow the second, so nothing else answers clicks.
    React.useEffect(() => {
        if (!mapClickManager) return
        mapClickManager.setSuspended(true)
        return () => mapClickManager.setSuspended(false)
    }, [mapClickManager])

    React.useEffect(() => {
        if (!map) return

        const canvas = map.getCanvas()

        // MapLibre resets the cursor on every mousemove, so we re-apply it each time
        const keepCrosshair = () => { canvas.style.cursor = "crosshair" }
        const clearCursor   = () => { canvas.style.cursor = "" }

        canvas.style.cursor = "crosshair"
        map.on("mousemove", keepCrosshair)

        const handleClick = async (e: maplibregl.MapMouseEvent) => {
            const { lat, lng, elevation, buildingId } = resolveClickPlacement(map, e, buildingsRef.current)

            map.off("mousemove", keepCrosshair)
            clearCursor()

            // A click on a footprint offers that building, but the file is the user's to file.
            const building = buildingId === null
                ? null
                : buildingsRef.current.find(candidate => candidate.id === buildingId) ?? null
            const linked = building !== null
                && await confirmLinkRef.current(building.buildingName ?? String(building.id), file.name)

            try {
                const patch: Partial<DbFile> = { lat, lng, elevation, type: 'map-file' }
                if (linked && buildingId !== null) patch.attachedFilesBuildingId = buildingId
                await updateFile(patch)
                Object.assign(file, patch)
                onPlacedRef.current(file, lat, lng, linked ? buildingId : null)
                toast.success(t("positionAcceptedToast"))
            } catch (err) {
                console.error("Error placing file:", err)
                // Restore on failure
                map.on("mousemove", keepCrosshair)
                canvas.style.cursor = "crosshair"
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                map.off("mousemove", keepCrosshair)
                clearCursor()
                onCancelRef.current()
            }
        }

        const onClick = (e: maplibregl.MapMouseEvent) => { void handleClick(e) }

        map.on(gesture, onClick)
        document.addEventListener("keydown", handleKeyDown)

        return () => {
            map.off("mousemove", keepCrosshair)
            map.off(gesture, onClick)
            document.removeEventListener("keydown", handleKeyDown)
            clearCursor()
        }
    }, [map, gesture, updateFile])

    return <>{dialog}</>
}
