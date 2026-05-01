"use client"

import * as React from 'react'
import { Button } from '../../../../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../../../../components/ui/Card'
import * as LR from 'lucide-react'
import { FilesContext } from '../../../../../../../../store'

import { mutate } from 'swr'
import { FileManagerRow } from './FileManagerRow'
import { DbFile } from '../../../../../../../../types/dbTypes'

const is3DModelFile = (extension?: string | null): boolean => {
  if (!extension) return false
  return ['glb', 'gltf', 'fbx', 'obj', 'collada'].includes(extension.toLowerCase())
}

const isHiddenFileType = (extension?: string | null): boolean => {
  if (!extension) return false
  const ext = extension.toLowerCase()
  return ext === 'frag' || ext === 'ifc'
}

const shouldExcludeByTag = (tag?: string | null): boolean => {
  if (!tag) return false
  return tag === 'user' || tag === 'bim-file' || tag === 'fragment-file' || tag === 'bimModel'
}

type FileManagerProp = {
  closeFileManager?: () => void
}

export default function MapFileManager({ closeFileManager }: FileManagerProp) {
  const { state: fileState, dispatch: fileDispatch } = React.useContext(FilesContext)
  const { files, mapFileIds } = fileState.files

  const mapFiles: DbFile[] = files.filter(file =>
    !is3DModelFile(file.extension) && !isHiddenFileType(file.extension) && !shouldExcludeByTag(file.tag)
  )

  const allOnMap = mapFiles.length > 0 && mapFiles.every(file => mapFileIds.includes(file.id))

  const toggleAll = () => {
    if (allOnMap) {
      mapFiles.forEach(file => fileDispatch({ type: 'REMOVE_FROM_MAP', payload: { id: file.id } }))
    }
    else {
      fileDispatch({ type: 'ADD_ALL_TO_MAP', payload: { ids: mapFiles.map(f => f.id) } })
    }
  }

  const handleDeleteFile = async (file: DbFile) => {
    try {
      const response = await fetch(`/api/files/${file.id}`, { method: 'DELETE' })
      if (response.ok) {
        fileDispatch({ type: 'REMOVE_FILE', payload: { id: file.id } })
      }
      mutate(['files'])
    }
    catch (error) {
      console.error('Error when deleting a file', error)
    }
  }

  return (
    <Card className="fixed bottom-12 right-[50%] translate-x-[50%] bg-background round-sm shadow-md z-10 pointer-events-auto max-w-[410px] max-h-[60vh]">
      <CardHeader className="flex flex-row justify-between items-center pointer-events-auto py-0">
        <CardTitle className="text-sm">
          Added Files (
          {mapFiles.length}
          )
        </CardTitle>
        <div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleAll}
            className="opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
          >
            {allOnMap ? <LR.Eye size={18} /> : <LR.EyeOff size={18} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => closeFileManager()}
            className="opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
          >
            <span className="sr-only">Clear</span>
            <LR.X size={18} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mapFiles.length === 0
          ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No files added to map
              </div>
            )
          : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {mapFiles.map(file => (
                  <FileManagerRow
                    key={file.id}
                    file={file}
                    isOnMap={mapFileIds.includes(file.id)}
                    onVisibilityToggle={() => {
                      const isOnMap = mapFileIds.includes(file.id)
                      fileDispatch({
                        type: isOnMap ? 'REMOVE_FROM_MAP' : 'ADD_TO_MAP',
                        payload: { id: file.id },
                      })
                    }}
                    onRemoveFile={() => handleDeleteFile(file)}
                    onEditFile={() => console.log('Editing file with id', file.id)}
                  />
                ))}
              </div>
            )}
      </CardContent>
    </Card>
  )
}
