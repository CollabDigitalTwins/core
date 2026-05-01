import type { Building, DbFile } from '../../../../types/dbTypes'

type BimDispatch = (action: {
  type: 'TOGGLE_BIM_TO_MAP'
  payload: {
    buildingModel: {
      bimFile: DbFile
      building: Building | null
    }
  }
}) => void

export function toggleBimToMap(
  bimDispatch: BimDispatch,
  bimFile: DbFile,
  building: Building | null,
) {
  if (!building) return

  bimDispatch({
    type: 'TOGGLE_BIM_TO_MAP',
    payload: {
      buildingModel: {
        bimFile,
        building,
      },
    },
  })
}