'use client'

import * as React from "react";
import { PointCloudContext } from '../../../../../../store'
import { useTranslations } from 'next-intl'

import { SliderWithInput, Slider } from '../../../../../ui/Slider'
import { Label } from '../../../../../ui/Label'

interface PointBudgetToolProps {
    pointBudget: number[];
    setPointBudget: (value: number[]) => void;
}

export const PointBudgetTool: React.FC<PointBudgetToolProps> = ({ pointBudget, setPointBudget }) => {
    const { state: pointCloudState } = React.useContext(PointCloudContext)
    const { viewer } = pointCloudState.pointcloud

    React.useEffect(() => {
        if (!viewer) return

        viewer.setPointBudget(pointBudget[0] * 1_000_000)

    }, [viewer, pointBudget])

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Point Budget</Label>
                <span className="text-xs text-gray-500">
                    {(pointBudget[0] * 1_000_000).toLocaleString()} points
                </span>
            </div>

            <SliderWithInput
                label="Budget"
                value={pointBudget}
                onValueChange={setPointBudget}
                min={0.5}
                max={50}
                step={0.5}
                unit="M"
                disabled={!viewer}
                className="mt-2"
            />
        </div>
    )
}

export default PointBudgetTool