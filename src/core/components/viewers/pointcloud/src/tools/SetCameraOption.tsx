'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { PointCloudContext } from '../../../../../store'
import { PointCloudTools, CameraControl } from '../../../../../store/PointCloud/reducer'

// Dependencies
import { useTranslations } from 'next-intl'

// Shadcn components
import { ToolbarSubmenu } from '../../../../ToolbarSubmenu'
import { DropdownMenuSeparator } from '../../../../ui/DropdownMenu'
import { Label, DropdownMenu } from '../../../../ui/'

// Custom components
import { CustomButton } from './PerformanceSettingsTools/NodeSizeSelectionTool'
import { CameraMode } from '../../define'

// Icons
import * as LR from 'lucide-react'

export const SetCameraOption = ({ tool }) => {
    const t = useTranslations('CameraSettings')
    const { state: pointCloudState, dispatch: pointCloudDispatch } = React.useContext(PointCloudContext);
    const { viewer, cameraProjection, cameraControl, moveSpeed, lockElevation } = pointCloudState.pointcloud

    React.useEffect(() => {
        if (!viewer) return
    }, [viewer])

    React.useEffect(() => {
        if (!viewer) return;
        viewer.setMoveSpeed?.(moveSpeed);
    }, [moveSpeed, viewer])

    React.useEffect(() => {
        if (!viewer) return;
        const fp = viewer?.fpControls;
        if (!fp) return;

        if (typeof fp.setLockElevation === "function") fp.setLockElevation(lockElevation);
        else fp.lockElevation = !!lockElevation;
    }, [lockElevation, viewer]);

    if (!viewer) return null;

    const setCameraOption = (cameraOption: CameraControl) => {
        if (!viewer) return;
        
        pointCloudDispatch({
            type: 'SET_CAMERA_CONTROL',
            payload: { cameraControl: cameraOption }
        });

        switch (cameraOption) {
            case CameraControl.EARTH_CONTROL:
                viewer.setControls(viewer.earthControls);
                break;
            case CameraControl.FIRST_PERSON:
                viewer.setControls(viewer.fpControls);
                // Optional: set a comfortable default speed
                viewer.setMoveSpeed?.(moveSpeed);
                break;
            case CameraControl.ORBIT_CONTROL:
            default:
                viewer.setControls(viewer.orbitControls);
                break;
        }
    };

    const setCameraMode = (cameraMode: CameraMode) => {
        if (!viewer) return;
        
        pointCloudDispatch({
            type: 'SET_CAMERA_PROJECTION',
            payload: { cameraProjection: cameraMode }
        });
        
        viewer.setCameraMode(cameraMode);
    }

    const handleSpeedChange = (value: number[]) => {
        pointCloudDispatch({
            type: 'SET_MOVE_SPEED',
            payload: { moveSpeed: value[0] }
        });
    }

    const handleLockElevationChange = (checked: boolean) => {
        pointCloudDispatch({
            type: 'SET_LOCK_ELEVATION',
            payload: { lockElevation: checked }
        });
    }

    return (
        <div>
            <ToolbarSubmenu tool={tool}>
                <div className="p-4 w-80 space-y-4">

                    {/* Camera Projection Selection */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium">{t('cameraProjection')}</Label>
                        <div className="flex gap-2">
                            <CustomButton
                                active={cameraProjection === CameraMode.PERSPECTIVE}
                                onClick={() => setCameraMode(CameraMode.PERSPECTIVE)}
                                disabled={!viewer}
                                icon={<LR.Orbit size={14} />}
                                label={t('perspective')}
                            />
                            <CustomButton
                                active={cameraProjection === CameraMode.ORTHOGRAPHIC}
                                onClick={() => setCameraMode(CameraMode.ORTHOGRAPHIC)}
                                disabled={!viewer}
                                icon={<LR.Orbit size={14} />}
                                label={t('orthographic')}
                            />
                        </div>
                    </div>

                    {/* Camera Control Selection */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium">{t('cameraControl')}</Label>
                        <div className="flex gap-2">
                            <CustomButton
                                active={cameraControl === CameraControl.EARTH_CONTROL}
                                onClick={() => setCameraOption(CameraControl.EARTH_CONTROL)}
                                disabled={!viewer}
                                icon={<LR.Globe2 size={14} />}
                                label={t('earth')}
                            />
                            <CustomButton
                                active={cameraControl === CameraControl.ORBIT_CONTROL}
                                onClick={() => setCameraOption(CameraControl.ORBIT_CONTROL)}
                                disabled={!viewer}
                                icon={<LR.Orbit size={14} />}
                                label={t('orbit')}
                            />
                            <CustomButton
                                active={cameraControl === CameraControl.FIRST_PERSON}
                                onClick={() => setCameraOption(CameraControl.FIRST_PERSON)}
                                disabled={!viewer}
                                icon={<LR.PersonStanding size={14} />}
                                label={t('firstPerson')}
                            />
                        </div>
                    </div>
                    <DropdownMenuSeparator />
                
                </div>
            </ToolbarSubmenu>
        </div>
    )
}

export default SetCameraOption;