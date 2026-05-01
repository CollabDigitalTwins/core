'use client'

import * as React from 'react'
import { TopicsSection } from './src/TopicsSection'
import { DbFile } from '../../../../../../../types/dbTypes'
import { CommentsSection } from '../../../../../../ui/Comments/CommentsSection'
export interface FileItem {
  task: DbFile
  icon: React.ElementType
  visible: boolean
}

export function CommunicationTab() {
  return (
    <div className="flex-1 flex flex-col space-y-6 py-4 overflow-hidden">
      <TopicsSection />
      <CommentsSection />
    </div>
  )
}
