"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Marker, Popup } from "react-map-gl/maplibre";
import { toast } from "sonner";

import { useFile } from "../../../../../../hooks/files/files";
import { Input, Label, Button } from "../../../../../ui";

import type { Building, DbFile } from "../../../../../../types/dbTypes";

/** Extracts position/rotation/elevation from a BIM file, falling back to its building's values. */
export const extractPositionAndRotation = (bimFile: DbFile, building?: Building) => {
    const lng = bimFile.lng ?? building?.buildingLongitude ?? null;
    const lat = bimFile.lat ?? building?.buildingLatitude ?? null;
    const rotation = bimFile.rotation ?? building?.rotation ?? 0;
    const elevation = bimFile.elevation ?? building?.buildingElevation ?? 0;
    return { lng, lat, rotation, elevation };
};

export interface EditPositionProps {
    /** The file whose position is being edited. */
    file: DbFile;
    /** Optional display name override (e.g. building name for BIM models). Defaults to file.name. */
    displayName?: string;
    /**
     * '3d' — shows lat, lng, rotation and elevation (used for BIM / glb / fbx / collada).
     * '2d' — shows only lat and lng (used for PDFs, images, etc.).
     */
    mode: "3d" | "2d";
    /** Fallback initial latitude (e.g. building latitude) when file.lat is null. */
    initialLat?: number | null;
    /** Fallback initial longitude (e.g. building longitude) when file.lng is null. */
    initialLng?: number | null;
    /** Fallback initial rotation for 3D mode. Defaults to 0. */
    initialRotation?: number;
    /** Fallback initial elevation for 3D mode. Defaults to 0. */
    initialElevation?: number;
    onExitEditMode: () => void;
    /**
     * Ref shared with a parent WebGL layer (e.g. BimLayer) so it can read the dragged position
     * in real-time without waiting for a React re-render. Optional — not needed for 2D files.
     */
    tempPositionsRef?: React.MutableRefObject<Record<string, { lat: number; lng: number }>>;
    /** Ref for live rotation updates in the WebGL layer. Optional — 3D mode only. */
    tempRotationsRef?: React.MutableRefObject<Record<string, number>>;
    /** Ref for live elevation updates in the WebGL layer. Optional — 3D mode only. */
    tempElevationsRef?: React.MutableRefObject<Record<string, number>>;
    /** Called whenever temp refs change so the parent map layer can trigger a repaint. */
    onMapRepaint?: () => void;
    /** Called after the position has been successfully saved to the database. */
    onSaveSuccess?: (file: DbFile, lat: number, lng: number, elevation?: number, rotation?: number) => void;
    /**
     * Custom content to render inside the draggable marker.
     * For 2D files this is the file icon card; for 3D / BIM the default blue dot is used.
     */
    dragHandle?: React.ReactNode;
}

export const EditPosition: React.FC<EditPositionProps> = ({
    file,
    displayName,
    mode,
    initialLat,
    initialLng,
    initialRotation = 0,
    initialElevation = 0,
    onExitEditMode,
    tempPositionsRef,
    tempRotationsRef,
    tempElevationsRef,
    onMapRepaint,
    onSaveSuccess,
    dragHandle,
}) => {
    const t3d = useTranslations("BimEditPosition");
    const t2d = useTranslations("EditFilePosition");
    const t = mode === "3d" ? t3d : t2d;

    const { updateFile } = useFile(file.id);

    const key = file.name;

    const startLat = file.lat ?? initialLat ?? 0;
    const startLng = file.lng ?? initialLng ?? 0;
    const startRotation = file.rotation ?? initialRotation;
    const startElevation = file.elevation ?? initialElevation;

    const [position, setPosition] = React.useState<{ lat: number; lng: number }>({
        lat: startLat,
        lng: startLng,
    });
    const [rotation, setRotation] = React.useState(startRotation);
    const [elevation, setElevation] = React.useState(startElevation);
    const [isDragging, setIsDragging] = React.useState(false);
    const grabStyleRef = React.useRef<HTMLStyleElement | null>(null);

    const startGrabCursor = React.useCallback(() => {
        if (grabStyleRef.current) return;
        const style = document.createElement('style');
        style.textContent = '* { cursor: grabbing !important; }';
        document.head.appendChild(style);
        grabStyleRef.current = style;
    }, []);

    const stopGrabCursor = React.useCallback(() => {
        grabStyleRef.current?.remove();
        grabStyleRef.current = null;
    }, []);
    const [isSaving, setIsSaving] = React.useState(false);
    const [recentlySaved, setRecentlySaved] = React.useState(false);

    // Initialise refs on mount and clean them up on unmount
    React.useEffect(() => {
        if (tempPositionsRef) tempPositionsRef.current = { ...tempPositionsRef.current, [key]: position };
        if (tempRotationsRef) tempRotationsRef.current = { ...tempRotationsRef.current, [key]: rotation };
        if (tempElevationsRef) tempElevationsRef.current = { ...tempElevationsRef.current, [key]: elevation };
        onMapRepaint?.();

        return () => {
            if (tempPositionsRef) {
                const p = { ...tempPositionsRef.current };
                delete p[key];
                tempPositionsRef.current = p;
            }
            if (tempRotationsRef) {
                const r = { ...tempRotationsRef.current };
                delete r[key];
                tempRotationsRef.current = r;
            }
            if (tempElevationsRef) {
                const e = { ...tempElevationsRef.current };
                delete e[key];
                tempElevationsRef.current = e;
            }
            onMapRepaint?.();
        };

    }, []);

    // Keep refs in sync with local state (drives real-time WebGL rendering in parent layers)
    React.useEffect(() => {
        if (tempPositionsRef) {
            tempPositionsRef.current = { ...tempPositionsRef.current, [key]: position };
        }
        onMapRepaint?.();

    }, [position]);

    React.useEffect(() => {
        if (tempRotationsRef) {
            tempRotationsRef.current = { ...tempRotationsRef.current, [key]: rotation };
        }
        onMapRepaint?.();

    }, [rotation]);

    React.useEffect(() => {
        if (tempElevationsRef) {
            tempElevationsRef.current = { ...tempElevationsRef.current, [key]: elevation };
        }
        onMapRepaint?.();

    }, [elevation]);

    // Esc key exits edit mode; also restore cursor on unmount
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                stopGrabCursor();
                handleCancel();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            stopGrabCursor(); // always restore on unmount
        };

    }, []);

    const handleSave = React.useCallback(async () => {
        onExitEditMode();

        setIsSaving(true);
        try {
            const updatePayload: Partial<DbFile> = { lat: position.lat, lng: position.lng };
            if (mode === "3d") {
                updatePayload.elevation = elevation;
                updatePayload.rotation = rotation;
            }
            await updateFile(updatePayload as any);

            // Mutate the file reference so callers with a direct reference see the update
            file.lat = position.lat;
            file.lng = position.lng;
            if (mode === "3d") {
                file.elevation = elevation;
                file.rotation = rotation;
            }

            toast.success(t("positionAcceptedToast"));
            setRecentlySaved(true);
            setTimeout(() => setRecentlySaved(false), 2000);

            onSaveSuccess?.(file, position.lat, position.lng, elevation, rotation);
        } catch (error) {
            console.error(`Error updating file position for ${file.name}:`, error);
        } finally {
            setIsSaving(false);
        }
    }, [position, rotation, elevation, file, mode, onExitEditMode, updateFile, t, onSaveSuccess]);

    const handleCancel = React.useCallback(() => {
        onExitEditMode();
    }, [onExitEditMode]);

    const name = displayName || file.name;

    return (
        <>
            {/* Origin marker — only meaningful in 3D / BIM context */}
            {mode === "3d" && (
                <Marker latitude={0} longitude={0}>
                    <div className="relative">
                        <div className="bg-red-500 border-2 border-white rounded-full p-2 shadow-lg animate-pulse">
                            <LR.MapPin className="w-4 h-4 text-white" />
                        </div>
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            Origin (0,0)
                        </div>
                    </div>
                </Marker>
            )}

            {/* Draggable position marker */}
            <Marker
                latitude={position.lat}
                longitude={position.lng}
                draggable
                onDragStart={() => {
                    setIsDragging(true);
                    startGrabCursor();
                }}
                onDrag={(event) => {
                    const { lat, lng } = event.lngLat;
                    setPosition({ lat, lng });
                }}
                onDragEnd={() => {
                    setIsDragging(false);
                    stopGrabCursor();
                }}
            >
                {dragHandle ? (
                    // 2D files: the actual file marker card, styled to look "lifted" when dragging
                    <div
                        className={`transition-all duration-150 ${
                            isDragging
                                ? "scale-90 drop-shadow-2xl cursor-grabbing opacity-80"
                                : "drop-shadow-md cursor-grab hover:scale-105"
                        }`}
                    >
                        {dragHandle}
                    </div>
                ) : (
                    // 3D / BIM: default blue dot
                    <div
                        className={`w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md transition-all cursor-move ${
                            isDragging ? "scale-125 shadow-lg" : "hover:scale-110"
                        }`}
                    />
                )}
            </Marker>

            {!isDragging && (
                <>
                    {/* Popup form */}
                    <Popup
                        latitude={position.lat}
                        longitude={position.lng}
                        closeButton={false}
                        closeOnClick={false}
                        closeOnMove={false}
                        anchor="bottom"
                        offset={[0, -20]}
                        className="edit-popup"
                    >
                        <div className="w-64 -m-1 bg-popover border border-border rounded-lg shadow-lg p-4">
                            <div className="grid gap-4">
                                <Button
                                    aria-label="Close"
                                    className="absolute top-1 right-2 p-1 text-muted-foreground hover:text-foreground"
                                    onClick={handleCancel}
                                    variant="ghost"
                                >
                                    <LR.X className="w-4 h-4" />
                                </Button>

                                <div className="space-y-2">
                                    <h4 className="font-semibold leading-none max-w-56">{name}</h4>
                                </div>

                                <div className="grid gap-2">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <LR.Move className="w-4 h-4" />
                                        <span className="text-xs text-muted-foreground">
                                            {t("editPositionTitle")}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label htmlFor={`lat-${key}`} className="text-xs">
                                                {t("latitude")}
                                            </Label>
                                            <Input
                                                id={`lat-${key}`}
                                                type="number"
                                                step="0.00001"
                                                value={position.lat.toFixed(6)}
                                                onChange={(e) => {
                                                    const lat = parseFloat(e.target.value);
                                                    if (!isNaN(lat))
                                                        setPosition((prev) => ({ ...prev, lat }));
                                                }}
                                                className="h-8 text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor={`lng-${key}`} className="text-xs">
                                                {t("longitude")}
                                            </Label>
                                            <Input
                                                id={`lng-${key}`}
                                                type="number"
                                                step="0.00001"
                                                value={position.lng.toFixed(6)}
                                                onChange={(e) => {
                                                    const lng = parseFloat(e.target.value);
                                                    if (!isNaN(lng))
                                                        setPosition((prev) => ({ ...prev, lng }));
                                                }}
                                                className="h-8 text-xs"
                                            />
                                        </div>

                                        {mode === "3d" && (
                                            <>
                                                <div className="space-y-1">
                                                    <Label htmlFor={`rotation-${key}`} className="text-xs">
                                                        {t("rotation")}
                                                    </Label>
                                                    <Input
                                                        id={`rotation-${key}`}
                                                        type="number"
                                                        step="0.1"
                                                        value={rotation.toFixed(2)}
                                                        onChange={(e) => {
                                                            const r = parseFloat(e.target.value);
                                                            if (!isNaN(r)) setRotation(r);
                                                        }}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor={`elevation-${key}`} className="text-xs">
                                                        {t("elevation")}
                                                    </Label>
                                                    <Input
                                                        id={`elevation-${key}`}
                                                        type="number"
                                                        step="0.1"
                                                        value={elevation.toFixed(2)}
                                                        onChange={(e) => {
                                                            const el = parseFloat(e.target.value);
                                                            if (!isNaN(el)) setElevation(el);
                                                        }}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <Button className="h-8" onClick={handleSave} disabled={isSaving}>
                                            {isSaving ? t("saving") : t("save")}
                                        </Button>
                                        <Button
                                            className="h-8"
                                            onClick={handleCancel}
                                            variant="outline"
                                        >
                                            {t("cancel")}
                                        </Button>
                                    </div>

                                    {recentlySaved && (
                                        <div className="text-xs text-green-500 text-center">
                                            {t("saved")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Popup>

                    {/* Floating save/cancel bar below the popup */}
                    <div className="flex gap-2 pt-0">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1"
                            size="sm"
                        >
                            {recentlySaved ? (
                                <LR.CheckCheck className="h-4 w-4 mr-2" />
                            ) : (
                                <LR.Check className="h-4 w-4 mr-2" />
                            )}
                            {recentlySaved ? t("saved") : t("save")}
                        </Button>
                        <Button onClick={handleCancel} variant="outline" size="sm" className="flex-1">
                            <LR.X className="h-4 w-4 mr-2" />
                            {t("cancel")}
                        </Button>
                    </div>
                </>
            )}
        </>
    );
};
