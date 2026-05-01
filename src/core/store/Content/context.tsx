'use client'

import * as React from "react";
import { CurrentLocation } from '../../types/map'

type ContentType = 'dashboard' | 'map' | 'sites' | 'buildings' | 'files' | string

interface ContentContextType {
  currentContent: ContentType
  changeContent: (content: ContentType, params?: Partial<CurrentLocation>) => void
  instance: string
}

const ContentContext = React.createContext<ContentContextType | undefined>(undefined)

export function ContentProvider({
  children,
  initialContent = 'map',
  initialInstance = 'canada',
}: {
  children: React.ReactNode
  initialContent?: ContentType
  initialInstance?: string
}) {
  const [currentContent, setCurrentContent] = React.useState<ContentType>(initialContent)
  const [instance, setInstance] = React.useState<string>(initialInstance)

  const changeContent = (content: ContentType, params?: Partial<CurrentLocation>) => {
    setCurrentContent(content)

    window.history.pushState(
      {},
      '',
      `/${instance}/${content === 'map' ? content : ''}`,
    )
  }

  return (
    <ContentContext.Provider value={{ currentContent, changeContent, instance }}>
      {children}
    </ContentContext.Provider>
  )
}

export function useContent() {
  const context = React.useContext(ContentContext)
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider')
  }
  return context
}