import * as LR from 'lucide-react'
import { Button } from '../../Button'
import Image from 'next/image'
import type { DbFile } from '../../../../types/dbTypes'

interface FileMarkerProps {
  file: DbFile
  onClick: () => void
}

// Added file marker component
export default function FileMarker({ file, onClick }: FileMarkerProps) {
  return (
    <Button
      variant="outline"
      size="default"
      onClick={onClick}
      className="bg-white/90 rounded-[50%] hover:bg-white pointer-events-auto cursor-pointer border border-gray-200 shadow-lg p-2 text-xs font-sans flex items-center gap-2 max-w-[200px] transition-transform duration-200 ease-in-out hover:scale-105 group"
    >
      {file.type.startsWith('image/') && file.url
        ? (
            <Image
              width={18}
              height={18}
              src={file.url}
              alt={file.name}
              className="rounded object-cover"
            />
          )
        : file.type.startsWith('video/')
          ? (
              <LR.Video size="icon" />
            )
          : file.type.includes('model') || /\.(obj|fbx|gltf|glb|3ds|dae|ply|stl)$/i.test(file.name)
            ? (
                <LR.Box size="icon" />
              )
            : file.name.toLowerCase().endsWith('.dxf')
              ? (
                  <LR.DraftingCompass size="icon" />
                )
              : (
                  <LR.FileText size="icon" />
                )}
    </Button>
  )
};
