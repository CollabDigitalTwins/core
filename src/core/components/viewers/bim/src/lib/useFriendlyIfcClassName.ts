import * as React from 'react'
import { useTranslations } from 'next-intl'

/**
 * Hook returning a function that maps a layer class name to a display label.
 * IFC class names (IFCWALL, IFCSLAB, …) are returned verbatim per-spec.
 * Special non-IFC layer keys (e.g. "Door Swings") are looked up in the
 * DrawingLayers i18n namespace so they get localized.
 */
export function useFriendlyIfcClassName(): (className: string) => string {
  const tLayers = useTranslations('DrawingLayers')

  return React.useCallback(
    (className: string) => {
      if (!className.startsWith('IFC') && tLayers.has(className)) {
        return tLayers(className)
      }
      return className
    },
    [tLayers],
  )
}
