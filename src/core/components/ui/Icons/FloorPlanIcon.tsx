import { Icon } from 'lucide-react'
import { floorPlan } from '@lucide/lab'

interface FloorplanIconProps {
  className?: string
}

export const FloorplanIcon = ({ className = 'h-4 w-4' }: FloorplanIconProps) => {
  return (
    <Icon iconNode={floorPlan} className={className} />
  )
}
