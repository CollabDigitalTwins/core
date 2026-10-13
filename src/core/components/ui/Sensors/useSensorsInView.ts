// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useSensors } from '../../../hooks/sensors/sensors'
import { BuildingsContext, MenusContext } from '../../../store'

import { sensorsInView } from './sensorScope'

import type { Sensor } from '../../../types/dbTypes'

/** Every sensor, and the ones the open viewer and building list, so each panel scopes them the same way. */
export function useSensorsInView(): { allSensors: Sensor[], sensors: Sensor[] } {
  const { sensors: allSensors }: { sensors: Sensor[] } = useSensors()
  const { state: menusState } = React.useContext(MenusContext)
  const { state: buildingsState } = React.useContext(BuildingsContext)
  const viewer = menusState.menus.currentViewer as Sensor['viewer']
  const buildingId = buildingsState?.buildings?.building?.id
  return { allSensors, sensors: sensorsInView(allSensors, { viewer, buildingId }) }
}
