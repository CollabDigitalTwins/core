'use client'
import * as React from "react";
import * as THREE from 'three'
import Comment from '../../../../../../ui/Comments/Comment'
import { markerStyle, markerStyleHighlight } from './markerUtils'

interface CommentProps {
  userName: string
  userImage: number | null
  userImageFileId?: number | null
  worldCamera: THREE.Camera
  targetPoint: THREE.Vector3          
  onRemove?: () => void
  onEdit?: () => void
  onClose: () => void
  buildingId?: number
  timestamp: Date
  text: string
  sphere: THREE.Object3D
  isPending?: boolean
  highlight?: boolean
}

export default function BimComment({
  userName,
  userImage,
  userImageFileId,
  onRemove,
  onEdit,
  onClose,
  buildingId,
  timestamp,
  text,
  isPending = false,
  highlight = false,
}: CommentProps): React.ReactElement {
  return (
      <Comment
        userName={userName}
        userImage={userImage}
        userImageFileId={userImageFileId}
        buildingId={buildingId}
        text={text}
        createdAt={timestamp}
        isPending={isPending}
        // onRemove={onRemove} // Remove is disabled because the card is not clickable for now
        onClose={onClose}
        enableCollapse
        defaultCollapsed
        highlight={highlight}
      />
  )
}