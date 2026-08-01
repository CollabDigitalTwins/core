'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../../../../../store'
import { ElementAppearance } from '../../../../ElementAppearance'

import type {
  AppearanceSource,
  NodeAppearance,
} from '../../../../lib/appearanceOverrides'

/** What a tree row and a panel header need from the override store. */
export interface AppearanceApi {
  overrideFor: (source: AppearanceSource, nodeId: string) => NodeAppearance | undefined
  /**
   * `coalesceKey` folds a run of changes, such as one slider drag, into a single
   * undo step. See `ElementAppearance.setNodeAppearance`.
   */
  setAppearance: (
    source: AppearanceSource,
    nodeId: string,
    change: NodeAppearance,
    coalesceKey?: string,
  ) => void
  /** Closes the current coalescing group, e.g. on slider release. */
  endCoalescing: () => void
  clearNode: (source: AppearanceSource, nodeId: string) => void
  clearSource: (source: AppearanceSource) => void
  hasOverrides: (source: AppearanceSource) => boolean
}

/** Used until the viewer's components exist; every read comes back empty. */
const INERT: AppearanceApi = {
  overrideFor: () => undefined,
  setAppearance: () => {},
  endCoalescing: () => {},
  clearNode: () => {},
  clearSource: () => {},
  hasOverrides: () => false,
}

const AppearanceContext = React.createContext<AppearanceApi>(INERT)

export function useAppearance(): AppearanceApi {
  return React.useContext(AppearanceContext)
}

/**
 * Adapts the {@link ElementAppearance} component to React for the Layers tab.
 *
 * The overrides live in the component, not here — the sidebar unmounts the tab
 * you are not looking at, and they have to survive that. This only subscribes and
 * hands out callbacks.
 *
 * The value is memoised because `LayersTab` re-renders on every pointer move
 * while a splitter is being dragged, and `BimTreeRow` is memoised to keep the
 * tree out of those renders. A fresh context value each time would defeat it.
 */
export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim

  const appearance = React.useMemo(
    () => (bimComponents ? bimComponents.get(ElementAppearance) : null),
    [bimComponents],
  )

  const [version, setVersion] = React.useState(0)

  React.useEffect(() => {
    if (!appearance) return

    const onChanged = () => setVersion(v => v + 1)
    appearance.onChanged.add(onChanged)
    return () => appearance.onChanged.remove(onChanged)
  }, [appearance])

  const api = React.useMemo<AppearanceApi>(() => {
    if (!appearance) return INERT

    return {
      overrideFor: (source, nodeId) => appearance.overrideFor(source, nodeId),
      setAppearance: (source, nodeId, change, coalesceKey) =>
        appearance.setNodeAppearance(source, nodeId, change, coalesceKey),
      endCoalescing: () => appearance.endCoalescing(),
      clearNode: (source, nodeId) => appearance.clearNode(source, nodeId),
      clearSource: source => appearance.clearSource(source),
      hasOverrides: source => appearance.hasOverrides(source),
    }
    // `version` belongs in the deps: these callbacks read live component state,
    // so a new identity is what tells the rows their answers have changed.
  }, [appearance, version])

  return <AppearanceContext.Provider value={api}>{children}</AppearanceContext.Provider>
}
