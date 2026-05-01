'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { PointCloudContext } from '../../../../../../../../store'
import { CameraControl } from '../../../../../../../../store/PointCloud/reducer'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { Slider } from '../../../../../../../ui/Slider'
import { Label } from '../../../../../../../ui/Label'
import { Switch } from '../../../../../../../ui/Switch'
import * as LR from 'lucide-react'
import { CameraMode } from '../../../../../define'

// Custom Button Component
interface CustomButtonProps {
  active: boolean
  onClick: () => void
  disabled?: boolean
  icon: React.ReactNode
  label: string
}

const CustomButton: React.FC<CustomButtonProps> = ({
  active,
  onClick,
  disabled = false,
  icon,
  label
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background hover:bg-accent border-input'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="flex items-center justify-center gap-1">
        {icon}
        {label}
      </div>
    </button>
  )
}

export function CameraSettings() {
  const t = useTranslations('CameraSettings')
  // Point Cloud context
  const { state: pointCloudState, dispatch: pointCloudDispatch } = React.useContext(PointCloudContext)
  const { viewer, cameraProjection, cameraControl, moveSpeed, lockElevation } = pointCloudState.pointcloud

  // Speed effect
  React.useEffect(() => {
    if (!viewer) return
    viewer.setMoveSpeed?.(moveSpeed)
  }, [moveSpeed, viewer])

  // Lock elevation effect
  React.useEffect(() => {
    if (!viewer) return
    const fp = viewer?.fpControls
    if (!fp) return

    if (typeof fp.setLockElevation === 'function') fp.setLockElevation(lockElevation)
    else fp.lockElevation = !!lockElevation
  }, [lockElevation, viewer])

  const setCameraOption = (cameraOption: CameraControl) => {
    if (!viewer) return
    
    pointCloudDispatch({
      type: 'SET_CAMERA_CONTROL',
      payload: { cameraControl: cameraOption }
    })

    switch (cameraOption) {
      case CameraControl.EARTH_CONTROL:
        viewer.setControls(viewer.earthControls)
        break
      case CameraControl.FIRST_PERSON:
        viewer.setControls(viewer.fpControls)
        viewer.setMoveSpeed?.(moveSpeed)
        break
      case CameraControl.ORBIT_CONTROL:
      default:
        viewer.setControls(viewer.orbitControls)
        break
    }
  }

  const setCameraMode = (cameraMode: CameraMode) => {
    if (!viewer) return
    
    pointCloudDispatch({
      type: 'SET_CAMERA_PROJECTION',
      payload: { cameraProjection: cameraMode }
    })
    
    viewer.setCameraMode(cameraMode)
  }

  const handleSpeedChange = (value: number[]) => {
    pointCloudDispatch({
      type: 'SET_MOVE_SPEED',
      payload: { moveSpeed: value[0] }
    })
  }

  const handleLockElevationChange = (checked: boolean) => {
    pointCloudDispatch({
      type: 'SET_LOCK_ELEVATION',
      payload: { lockElevation: checked }
    })
  }

  return (
    <CollapsibleSection title={t('title')} chevronPosition="right" icon={LR.Camera} defaultOpen={false}>
      <div className="space-y-6">
        {/* Camera Projection Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('cameraProjection')}</Label>
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
          <Label className="text-sm font-medium">{t('cameraControl')}</Label>
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

        {/* First Person Settings */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">{t('firstPersonSettings')}</Label>

          {/* Move Speed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LR.Rabbit className="h-4 w-4" />
                <span className="text-sm font-medium">{t('moveSpeed')}</span>
              </div>
              <span className="text-xs tabular-nums opacity-70">{moveSpeed}</span>
            </div>
            <Slider 
              value={[moveSpeed]} 
              onValueChange={handleSpeedChange} 
              max={10} 
              min={1} 
              disabled={!viewer} 
            />
            <div className="flex justify-between text-[11px] opacity-60">
              <span>{t('slow')}</span>
              <span>{t('fast')}</span>
            </div>
          </div>

          {/* Lock Elevation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LR.Lock className="h-4 w-4 text-gray-600" />
              <Label htmlFor="lock-elev" className="text-sm font-medium cursor-pointer">
                {t('lockElevation')}
              </Label>
            </div>
            <Switch
              id="lock-elev"
              checked={lockElevation}
              onCheckedChange={handleLockElevationChange}
              disabled={!viewer}
            />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  )
}
