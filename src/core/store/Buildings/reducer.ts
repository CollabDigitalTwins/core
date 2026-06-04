

import { Building } from '../../types/dbTypes';
import { ActionMap } from '../ActionMap';

interface BuildingsTypes {
  buildings: Building[];
  building: Building | null;
}

export type BuildingsState = BuildingsTypes

export type BuildingsPayload = {
  ['SET-BUILDINGS']: Pick<BuildingsTypes, 'buildings'>;
  ['SET-CURRENT-BUILDING']: Pick<BuildingsTypes, 'building'>;
  ['REMOVE-BUILDING']: { buildingId: number };
  ['CLEAR-BUILDINGS']: void;
};

export type BuildingsActions
  = ActionMap<BuildingsPayload>[keyof ActionMap<BuildingsPayload>]

export const BuildingsReducer = (state: BuildingsState, action: BuildingsActions) => {
  switch (action.type) {
    case 'SET-BUILDINGS':
      const { buildings } = action.payload
      return {
        ...state,
        buildings,
      }
    case 'SET-CURRENT-BUILDING':
      const { building } = action.payload;
      return {
        ...state,
        building,
      };
    case 'REMOVE-BUILDING':
      const { buildingId } = action.payload
      return {
        ...state,
        buildings: state.buildings.filter(building => building.id !== buildingId),
        // Fix: clear the selected `building` (the actual state field). Was writing a
        // stray `currentBuilding` key, so the selection never cleared. (Bug found via
        // unit test; action is currently unused → zero blast radius.)
        building: state.building?.id === buildingId ? null : state.building,
      };
    case 'CLEAR-BUILDINGS':
      return {
        ...state,
        buildings: [],
        // Fix: clear `building` (was writing stray `currentBuilding`/`newBuilding` keys).
        building: null,
      }

    default:
      return state
  }
}
