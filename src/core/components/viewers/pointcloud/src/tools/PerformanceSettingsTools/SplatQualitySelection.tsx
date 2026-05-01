'use client'

import * as React from "react";
import { PointCloudContext } from '../../../../../../store'
import { useTranslations } from 'next-intl'
import { ToolbarSubmenu } from '../../../../../ToolbarSubmenu'
import { SliderWithInput, Slider } from '../../../../../ui/Slider'
import { Label } from '../../../../../ui/Label'
import { Switch } from '../../../../../ui/Switch'
import { DropdownMenuSeparator } from '../../../../../ui/DropdownMenu'
import * as LR from 'lucide-react'

export enum SplatQuality {
    HIGH, 
    STANDARD
}

interface SplatQualityToolProps {
    splatQuality: SplatQuality;
    setSplatQuality: (quality: SplatQuality) => void;
}

export const SplatQualityTool: React.FC<SplatQualityToolProps> = ({ splatQuality, setSplatQuality }) => {
    const { state: pointCloudState } = React.useContext(PointCloudContext)
    const { viewer } = pointCloudState.pointcloud

    React.useEffect(() => {
        if (!viewer) return
        
        try {
            viewer.useHQ = splatQuality === SplatQuality.HIGH

            console.log(splatQuality === SplatQuality.HIGH)
        } catch (err) {
            console.error('Failed to set quality:', err)
        }
    }, [viewer, splatQuality])

    return (
         <div className="space-y-2">
          <Label className="text-sm font-medium">Splat Quality</Label>
          <div className="flex gap-2">
            <button
              onClick={() => setSplatQuality(SplatQuality.STANDARD)}
              disabled={!viewer}
              className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
                splatQuality === SplatQuality.STANDARD
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent border-input'
              } ${!viewer ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-center gap-1">
                <LR.Zap className="h-3 w-3" />
                Standard
              </div>
            </button>
            <button
              onClick={() => setSplatQuality(SplatQuality.HIGH)}
              disabled={!viewer}
              className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
                splatQuality === SplatQuality.HIGH
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent border-input'
              } ${!viewer ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-center gap-1">
                <LR.Sparkles className="h-3 w-3" />
                High
              </div>
            </button>
          </div>
        </div>
    )
}

export default SplatQualityTool