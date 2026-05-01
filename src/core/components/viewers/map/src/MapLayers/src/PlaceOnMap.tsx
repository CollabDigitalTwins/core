"use client"
import * as React from "react"
import type maplibregl from "maplibre-gl"
import { MapContext } from "../../../../../../store"
import type { DbFile } from "../../../../../../types/dbTypes"
import { useFile } from "../../../../../../hooks/files/files"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface PlaceOnMapProps {
    file: DbFile
    onPlaced: (file: DbFile, lat: number, lng: number) => void
    onCancel: () => void
}

/**
 * Invisible component that puts the map into "click-to-place" mode.
 * Sets crosshair cursor, listens for a single click, saves the coords to the DB,
 * then calls onPlaced. Esc calls onCancel.
 */
export const PlaceOnMap: React.FC<PlaceOnMapProps> = ({ file, onPlaced, onCancel }) => {
    const { state: mapState } = React.useContext(MapContext)
    const { map } = mapState.map
    const { updateFile } = useFile(file.id)
    const t = useTranslations("EditFilePosition")

    // Stable refs so the map effect never needs to re-register
    const onPlacedRef = React.useRef(onPlaced)
    const onCancelRef = React.useRef(onCancel)
    onPlacedRef.current = onPlaced
    onCancelRef.current = onCancel

    React.useEffect(() => {
        if (!map) return

        const canvas = map.getCanvas()

        // MapLibre resets the cursor on every mousemove, so we re-apply it each time
        const keepCrosshair = () => { canvas.style.cursor = "crosshair" }
        const clearCursor   = () => { canvas.style.cursor = "" }

        canvas.style.cursor = "crosshair"
        map.on("mousemove", keepCrosshair)

        const handleClick = async (e: maplibregl.MapMouseEvent) => {
            const lat = e.lngLat.lat
            const lng = e.lngLat.lng

            map.off("mousemove", keepCrosshair)
            clearCursor()

            try {
                await updateFile({ lat, lng, type: 'map-file' } as Partial<DbFile>)
                file.lat = lat
                file.lng = lng
                file.type = 'map-file'
                onPlacedRef.current(file, lat, lng)
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

        map.on("click", handleClick)
        document.addEventListener("keydown", handleKeyDown)

        return () => {
            map.off("mousemove", keepCrosshair)
            map.off("click", handleClick)
            document.removeEventListener("keydown", handleKeyDown)
            clearCursor()
        }
    }, [map, updateFile])

    return null
}
