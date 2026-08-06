'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { CommentsSection } from '../Comments/CommentsSection'

import { ViewerSidebarPanel } from './Panel'

interface CommunicationTabProps {
  /** Rendered above the comments. The BIM viewer passes its BCF topics list here. */
  topics?: React.ReactNode
}

/** Comments tab, plus whatever viewer-specific collaboration content sits above them. */
export function CommunicationTab({ topics }: CommunicationTabProps) {
  return (
    <ViewerSidebarPanel>
      {topics}
      <CommentsSection />
    </ViewerSidebarPanel>
  )
}
