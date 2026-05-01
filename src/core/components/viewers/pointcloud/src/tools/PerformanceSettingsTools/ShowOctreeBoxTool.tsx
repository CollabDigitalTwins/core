'use client'

import React from 'react'
import { PointCloudContext } from '../../../../../../store'
import { Label } from '../../../../../ui/Label'
import { Switch } from '../../../../../ui/Switch'
import * as LR from 'lucide-react'

export enum SplatQuality {
    HIGH,
    STANDARD
}

interface ShowOctreeBoxProps {
    showOctreeBox: boolean;
    setShowOctreeBox: (value: boolean) => void;
}

export const ShowOctreeBoxTool: React.FC<ShowOctreeBoxProps> = ({ showOctreeBox, setShowOctreeBox }) => {
    const { state: pointCloudState } = React.useContext(PointCloudContext)
    const { viewer } = pointCloudState.pointcloud

    React.useEffect(() => {
        if (!viewer) return

        try {
            // Use the viewer's method as shown in viewer.js:488
            viewer.setShowBoundingBox(showOctreeBox)
        } catch (err) {
            console.error('Failed to toggle octree box:', err)
        }
    }, [viewer, showOctreeBox])

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <LR.Box className="h-4 w-4 text-gray-600" />
                <Label htmlFor="octree-box" className="text-sm font-medium cursor-pointer">
                    Show Octree Box
                </Label>
            </div>
            <Switch
                id="octree-box"
                checked={showOctreeBox}
                onCheckedChange={(checked) => setShowOctreeBox(checked)}
                disabled={!viewer}
            />
        </div>

    )
}

export default ShowOctreeBoxTool