// Audit Phase 1.A (F-1c): types-only import. Every reference to OBC in this
// file is in a type position (OBC.Components | null, OBC.World, etc.) so the
// import never reaches the runtime. With `import type` TypeScript erases it
// at compile time and webpack stops bundling @thatopen on behalf of the
// global BimProvider. Critical: this reducer is loaded on every route via
// CombineProviders, so without this fix @thatopen leaks into the initial
// bundle even after F-1 and F-1b.
import type * as OBC from "@thatopen/components";
import { ActionMap } from "../ActionMap";
import type { Plan } from "../../types/bim";
import { Building, DbFile } from '../../types/dbTypes';

interface BimTypes {
    bimComponents: OBC.Components | null;
    world: OBC.World | null;
    fragments: OBC.FragmentsManager | null;
    modelId: string | null;
    modelIds: string[];
    floorplans: Plan[];
    grid: OBC.SimpleGrid | null;
    // For now, store the file with the building
    buildingModel: {
        bimFile: DbFile | null;
        building: Building | null;
    };
    bimModelsAddedToMap: {
        "bimFile": DbFile;
        building?: Building | null;
    }[];
    editingBimModel: string | null;
    bimModelName: string | null;
    bcfTopic: OBC.Topic | Partial<OBC.Topic> | null;
    bcfTopics: OBC.Topic[] | Partial<OBC.Topic>[];
    bcfTopicId: string | null;
    modelUIState: Record<number, { isVisible?: boolean; isGhost?: boolean }>;
}

export type BimState = BimTypes;

export type BimPayload = {
    ["SET_COMPONENTS"]: Pick<BimTypes, "bimComponents" | "world" | "fragments">;
    ["SET_WORLD"]: Pick<BimTypes, "world">;
    ["SET_MODEL"]: Pick<BimTypes, "modelId">;
    ["SET_FLOORPLANS"]: Pick<BimTypes, "floorplans">;
    ["SET_GRID"]: Pick<BimTypes, "grid">;
    ["DISPOSE-BIM"]: void;
    ["DISPOSE-BIM-VIEWER"]: void;
    ["TOGGLE_BIM_TO_MAP"]: Pick<BimTypes, "buildingModel">;
    ["REMOVE_BIM_FROM_MAP"]: Pick<BimTypes, "bimModelName">;
    ["REMOVE_ALL_BIM_FROM_MAP"]: void;
    ["EDIT_BIM_MODEL_BY_NAME"]: Pick<BimTypes, "editingBimModel">;
    ["ADD_BCF_TOPIC"]: Pick<BimTypes, "bcfTopic">;
    ["REMOVE_BCF_TOPIC"]: Pick<BimTypes, "bcfTopicId">;
    ['EDIT_BCF_TOPIC']: Pick<BimTypes, "bcfTopic">;
    ["SET_MODEL_UI_STATE"]: { fileId: number; isVisible?: boolean; isGhost?: boolean };
};

export type BimActions = ActionMap<BimPayload>[keyof ActionMap<BimPayload>];

export const BimReducer = (state: BimState, action: BimActions) => {

    switch (action.type) {

        case "SET_COMPONENTS":
            return {
                ...state,
                "bimComponents": action.payload.bimComponents,
                "world": action.payload.world,
                "fragments": action.payload.fragments,
            };
        case "SET_WORLD":
            return {
                ...state,
                "world": action.payload.world,
            };
        case "SET_MODEL":
            return {
                ...state,
                "modelId": action.payload.modelId,
            };
        case "SET_FLOORPLANS":
            return {
                ...state,
                "floorplans": action.payload.floorplans,
            }
        case "SET_GRID":
            return {
                ...state,
                "grid": action.payload.grid,
            };
        case "DISPOSE-BIM":
            return {
                ...state,
                "bimComponents": null,
                "world": null,
                "fragments": null,
                "modelId": null,
            };
        case "TOGGLE_BIM_TO_MAP": {

            const { bimFile } = action.payload.buildingModel;
            const exists = state.bimModelsAddedToMap.some((model) => model.bimFile.id === bimFile.id
            );
            let bimModelsAddedToMap;
            bimModelsAddedToMap = exists
                ? state.bimModelsAddedToMap.filter((model) => model.bimFile.id !== bimFile.id,
                ) : [
                    ...state.bimModelsAddedToMap,
                    {
                        bimFile,
                        "building": action.payload.buildingModel.building
                    },
                ];
            console.log(
                "BimReducer - ADD_BIM_TO_MAP",
                { bimModelsAddedToMap }
            );
            return {
                ...state,
                bimModelsAddedToMap
            };

        }
        case "REMOVE_BIM_FROM_MAP": {

            const removeName = action.payload.bimModelName;
            return {
                ...state,
                bimModelsAddedToMap: state.bimModelsAddedToMap.filter((model) => model.bimFile.name !== removeName
                ),
            };

        }
        case "REMOVE_ALL_BIM_FROM_MAP":
            return {
                ...state,
                "bimModelsAddedToMap": [],
            };
        case "EDIT_BIM_MODEL_BY_NAME": {
            return {
                ...state,
                "editingBimModel": action.payload.editingBimModel,
            }
        }
        case "ADD_BCF_TOPIC":
            return {
                ...state,
                "bcfTopics": [...state.bcfTopics, action.payload.bcfTopic],
            };
        case "REMOVE_BCF_TOPIC":
            return {
                ...state,
                "bcfTopics": state.bcfTopics.filter((topic) => topic.guid !== action.payload.bcfTopicId),
            };
        case "EDIT_BCF_TOPIC":
            return {
                ...state,
                "bcfTopics": state.bcfTopics.map((topic) =>
                    topic.guid === action.payload.bcfTopic.guid
                        ? action.payload.bcfTopic
                        : topic
                ),
            };
        case "SET_MODEL_UI_STATE": {
            const { fileId, ...uiProps } = action.payload
            return {
                ...state,
                modelUIState: {
                    ...state.modelUIState,
                    [fileId]: {
                        ...state.modelUIState[fileId],
                        ...uiProps,
                    },
                },
            }
        }
        default:
            return state;

    }

};
