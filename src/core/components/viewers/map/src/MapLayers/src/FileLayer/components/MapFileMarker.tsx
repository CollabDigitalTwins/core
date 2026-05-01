import * as LR from 'lucide-react'
import { Button } from '../../../../../../../../components/ui/Button'

import FileIcon from './FileIcon'

interface MapFileMarkerProps {
  mimeType: string
  extension?: string
  url?: string | null
  onClick?: () => void
  onDbClick?: () => void
}

export default function MapFileMarker({
  mimeType,
  extension,
  url,
  onClick,
  onDbClick,
}: MapFileMarkerProps) {
  return (
    <Button
      variant="outline"
      size="default"
      onClick={onClick}
      onDoubleClick={onDbClick}
      className="bg-white/90 w-9 h-9 rounded-[50%] hover:bg-white pointer-events-auto cursor-pointer border border-gray-200 shadow-lg p-0 text-xs font-sans flex items-center gap-2 max-w-[200px] transition-transform duration-200 ease-in-out hover:scale-105 group"
    >
      <FileIcon mimeType={mimeType} extension={extension} url={url} size={18} />
    </Button>
  )
}
