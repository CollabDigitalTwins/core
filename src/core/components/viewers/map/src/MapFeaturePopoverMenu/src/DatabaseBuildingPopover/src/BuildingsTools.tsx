"use client"

import React from "react";
import type { MapGeoJSONFeature } from "maplibre-gl";
import * as LR from "lucide-react";
import { useTranslations } from "next-intl";
import { usePermissions } from '../../../../../../../../store'

import { ViewerNames } from "../../../../../../../../types/";
import type { Tool } from "../../../../../../../../types/tools";
import type { Building, DbFile } from "../../../../../../../../types/dbTypes";

import { useFilesByBuildingId, useUploadFileToBuilding } from "../../../../../../../../hooks/files/files";
import { BuildingsContext, BimContext, MapContext, MenusContext, useMenusContext } from "../../../../../../../../store";
import { Button, Label, Skeleton, Switch, Checkbox } from "../../../../../../../../components/ui/";
import { useFileUploadHandler } from "../../../../../../../../components/ui/FilesManager/src/useFileUploadHandler";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../../../../../components/ui/DropdownMenu";
import Compare from '../../../../compare';
import { toggleBimToMap as dispatchToggleBimToMap } from '../../../../../utils/toggleBimToMap';

interface BuildingToolsProps {
  isLoading: boolean;
  isError: boolean;
  building: Building | null;
  feature: MapGeoJSONFeature;
  onCloseAction: () => void;
}

export default function BuildingTools({
  isLoading,
  isError,
  building,
  feature,
  onCloseAction
}: BuildingToolsProps) {

  const t = useTranslations('BuildingTools')
  // Permissions
  const { ability } = usePermissions()

  const { dispatch: menusDispatch } = React.useContext(MenusContext);
  const { state: mapState, } = React.useContext(MapContext);
  const { dispatch: bimDispatch, state: bimState } = React.useContext(BimContext);
  const { bimModelsAddedToMap } = bimState.bim;
  const { dispatch: buildingsDispatch } = React.useContext(BuildingsContext);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { setView } = useMenusContext();
  const { setSelectedItem } = useMenusContext();

  const buildingId = React.useMemo(
    () => {

      const featureProps = feature?.properties || {};
      const id = Number(featureProps.dbId);
      return isNaN(id)
        ? null
        : id;

    },
    [feature?.properties],
  );

  const { files } = useFilesByBuildingId(buildingId);

  const bimAdded = React.useMemo(
    () => (buildingId
      ? mapState.map.bimModelsAddedToMap.includes(buildingId)
      : false),
    [
      mapState.map.bimModelsAddedToMap,
      buildingId,
    ],
  );

  const { uploadFile, isMutating: isUploadingFromHook } = useUploadFileToBuilding(building?.id || null);

  // Local state to track the entire upload process from file selection to completion
  const [
    isLocallyUploading,
    setIsLocallyUploading,
  ] = React.useState(false);

  // Combined uploading state
  const isUploading = isLocallyUploading || isUploadingFromHook;

  // Use the reusable upload handler without passing bimComponents
  const { handleFileUpload } = useFileUploadHandler({
    buildingId: buildingId || -1,
    uploadFile,
    onUploadStart: () => setIsLocallyUploading(true),
    onUploadEnd: () => setIsLocallyUploading(false),
    customMessages: {
      success: t('toastFIleUploadSuccess'),
      errorPrefix: t('toastFIleUploadError'),
      errorSuffix: t('toastUnknownError'),
      noIdError: t('buildingIdRequired')
    }
  });

  const changeViewer = React.useCallback(
    (viewer: ViewerNames) => {

      menusDispatch({
        type: "SET_VIEWER",
        payload: { "currentViewer": viewer },
      });

      buildingsDispatch({
        type: "SET-CURRENT-BUILDING",
        payload: { building },
      });
      onCloseAction();

    },
    [
      menusDispatch,
      buildingsDispatch,
      building,
      onCloseAction
    ]
  );

  const triggerFileInput = React.useCallback(
    () => {

      fileInputRef.current?.click();

    },
    [],
  );

  const toggleBimToMap = React.useCallback(
    (bimFile: DbFile) => {
      dispatchToggleBimToMap(bimDispatch, bimFile, building);

    },
    [
      building,
      bimDispatch
    ]
  );

  const onOpenBimViewer = () => {
    buildingsDispatch({ type: "SET-CURRENT-BUILDING", payload: { building } });
    changeViewer(ViewerNames.bim);
    setSelectedItem(building);
  }

  const buildingFiles = React.useMemo(
    () => files || [],
    [files],
  );

  const bimFiles = React.useMemo(
    () => buildingFiles.filter((file: DbFile) => file.type === "bim-file" || file.extension === "frag"
    ),
    [buildingFiles],
  )

  const pcFiles = React.useMemo(
    () => buildingFiles.filter((file: DbFile) => file.type === 'point-cloud-file' || ['laz', 'las'].includes(file.extension || '')),
    [buildingFiles],
  )

  const buildingButtons: Tool[] = React.useMemo(
    () => [
      {
        id: "map-compare-buildings",
        icon: LR.Columns3,
        title: t('compareTitle'),
        component: Compare,
        disabled: !ability.can('read', 'Building')
      },
      {
        id: "open-building-page",
        icon: LR.Building2,
        title: t('openBIMTitle'),
        onClick: () => {

          changeViewer(ViewerNames.buildings);
          setSelectedItem(building);
          setView("detail");

        },
        disabled: !ability.can('read', 'Building')
      },
      {
        id: "open-bim-viewer",
        icon: LR.Box,
        title: t('OpenBIMViewerTitle'),
        onClick: onOpenBimViewer,
        disabled: !ability.can('read', 'File')
      },
      {
        id: 'open-pointcloud',
        title: t('openPointCloudTitle'),
        icon: LR.Grip,
        onClick: () => changeViewer(ViewerNames.pointcloud),
        disabled: pcFiles.length === 0 || !ability.can('read', 'File')
      },
      {
        id: "map-add-file",
        icon: isUploading
          ? LR.Loader
          : LR.FilePlus,
        title: t('addFileTitle'),
        onClick: triggerFileInput,
        disabled: !ability.can('create', 'File')
      },
    ],
    [
      changeViewer,
      building,
      setSelectedItem,
      setView,
      isUploading,
      triggerFileInput
    ]
  );

  const onLoadBIM = React.useCallback(
    (file: DbFile = null) => {
      if (bimFiles.length === 0) return;
      toggleBimToMap(bimFiles[0]);
    },
    [
      bimFiles,
      toggleBimToMap
    ]
  );

  const handleEditClick = (fileName: string) => {
    bimDispatch({
      type: "EDIT_BIM_MODEL_BY_NAME",
      payload: { editingBimModel: fileName }
    });

    onCloseAction();
  }


  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
        ref={fileInputRef}
        style={{ "display": "none" }}
        type="file"
      />

      {/* BIM Controls */}
      {!isError &&
        <div className="flex items-center space-x-2">
          {isLoading
            ? <>
              <Skeleton className="h-4 w-20" />

              <Skeleton className="h-6 w-10" />
            </>
            : (
              <div className="flex items-center justify-between w-full">
                {bimFiles.length > 1 ? (
                  <div className="flex items-center space-x-2">
                    <Label className="font-semibold" htmlFor="bim-file-dropdown">
                      {t('selectBimLabel')}
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" id="bim-file-dropdown">
                          {bimModelsAddedToMap.length > 0
                            ? `${bimModelsAddedToMap.filter(model => model.bimFile.attachedFilesBuildingId === buildingId).length} ${t('filesSelected')}`
                            : t('selectFiles')
                          }
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {bimFiles.map((file: DbFile) => {
                          const isSelected = bimModelsAddedToMap.some(model => model.bimFile.name === file.name);
                          return (
                            <DropdownMenuItem
                              key={file.name}
                              onClick={(e) => {
                                e.preventDefault();
                                toggleBimToMap(file);
                              }}
                              className="flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={isSelected}
                                  onClick={(e) => e.stopPropagation()}
                                  onCheckedChange={() => {
                                    toggleBimToMap(file);
                                  }}
                                />
                                <span>{file.name}</span>
                              </div>
                              {isSelected && (
                                <Button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleEditClick(file.name);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  title={t('editBimButton')}
                                >
                                  <LR.LocationEdit className="h-3 w-3" />
                                </Button>
                              )}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Label
                      className={`font-semibold ${bimFiles.length === 0 ? 'text-muted-foreground' : ''}`}
                      htmlFor="show-bim"
                    >
                      {bimAdded ? t('hideBIM') : t('showBIM')}
                    </Label>
                    <Switch
                      id="show-bim"
                      checked={bimFiles.length === 1 && bimModelsAddedToMap.some(model => model.bimFile.name === bimFiles[0]?.name)}
                      disabled={bimFiles.length === 0 || !ability.can('read', 'File')}
                      onCheckedChange={() => onLoadBIM()}
                    />
                  </div>
                )}
                {bimFiles.length === 1 && bimModelsAddedToMap.some(model => model.building.id === buildingId) && (() => {
                  const selectedModel = bimModelsAddedToMap.find(model => model.building.id === buildingId);
                  console.log('selectedModel', selectedModel);
                  return true ? (
                    <Button
                      onClick={() => handleEditClick(selectedModel.bimFile.name)}
                      variant="ghost"
                      size="sm"
                      title={t('editBimButton')}
                      disabled={!ability.can('update', 'File')}
                    >
                      <LR.LocationEdit className="h-4 w-4" />
                    </Button>
                  ) : null;
                })()}
              </div>
            )
          }
        </div>}

      {/* Tool Buttons */}
      <div className="flex items-center gap-3">
        {isLoading
          ? Array.from({ "length": 4 }).map((_, index) => (<Skeleton
            key={index}
            className="w-8 h-8 rounded-sm"
          />),)
          : (!isError && building ? (
            buildingButtons.map((button) => {
              if (button.component) {
                const ButtonComponent = button.component
                const shouldAnimateSpin = button.id === 'map-add-file' && isUploading
                return (
                  <div
                    key={button.id}
                    className={`w-8 h-8 rounded-sm border-2 border-gray-200 inline-flex justify-center items-center ${shouldAnimateSpin ? 'animate-spin' : ''}`}
                  >
                    <ButtonComponent tool={button} building={building} />
                  </div>
                )
              }
              return (
                <Button
                  key={button.id}
                  variant="ghost"
                  className="w-8 h-8 rounded-sm border-2 border-gray-200 inline-flex justify-center items-center"
                  aria-label={button.title}
                  onClick={button.onClick}
                  title={button.title}
                  disabled={button.disabled}
                >
                  <button.icon className={`w-6 h-6 ${button.id === 'map-add-file' && isUploading ? 'animate-spin' : ''}`} />
                </Button>
              )
            })
          ) : null)}
      </div>
    </div>
  );

}
