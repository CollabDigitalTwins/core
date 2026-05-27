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

  // Audit Phase 1.A (F-3): useCallback so the function identity is stable.
  // Closes over `instance` so the dep must be listed.
  const changeContent = React.useCallback((content: ContentType, params?: Partial<CurrentLocation>) => {
    setCurrentContent(content)

    window.history.pushState(
      {},
      '',
      `/${instance}/${content === 'map' ? content : ''}`,
    )
  }, [instance])

  const value = React.useMemo(
    () => ({ currentContent, changeContent, instance }),
    [currentContent, changeContent, instance],
  )

  return (
    <ContentContext.Provider value={value}>
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