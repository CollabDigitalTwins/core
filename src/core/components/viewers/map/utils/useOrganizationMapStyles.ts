'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { AppConfigContext, MapContext } from '../../../../store'

import { buildMapStylesCatalog, organizationDefaultMapStyle, resolveMapStyle } from './mapStyleCatalog'

/** The organization's style catalog and the style the map shows from it, its default until the user picks one. */
export function useOrganizationMapStyles() {
  const { state: appConfigState } = React.useContext(AppConfigContext)
  const { state: mapState } = React.useContext(MapContext)
  const organization = appConfigState.appConfig.organization
  const selected = mapState.map.mapStyle

  const styles = React.useMemo(() => buildMapStylesCatalog(organization?.mapStyles), [organization?.mapStyles])
  const current = React.useMemo(
    () => resolveMapStyle(selected, styles, organizationDefaultMapStyle(organization?.defaultMapStyle)),
    [selected, styles, organization?.defaultMapStyle],
  )
  return { styles, current }
}
