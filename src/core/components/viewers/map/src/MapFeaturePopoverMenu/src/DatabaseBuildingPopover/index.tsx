"use client";
import type {MapGeoJSONFeature} from "maplibre-gl";
import * as LR from "lucide-react";
import * as React from "react";
import {useTranslations} from "next-intl";

import {useBuilding} from "../../../../../../../hooks/buildings/buildings";
import {MapContext} from "../../../../../../../store";
import {Button, Separator, Skeleton, Badge} from "../../../../../../../components/ui/";
import {PopoverContent} from "../../../../../../../components/ui/Popover";
import BuildingTools from "./src/BuildingsTools";

type DatabaseBuildingPopoverProps = {
    "feature": MapGeoJSONFeature;
    "isOpen": boolean;
    "onCloseAction": () => void;
};

export default function DatabaseBuildingPopover ({
    feature,
    isOpen,
    onCloseAction,
    }: DatabaseBuildingPopoverProps) {

    const t = useTranslations('DatabaseBuildingPopover')
    

    const {state: mapState} = React.useContext(MapContext);

    const featureProps = React.useMemo(
        () => feature?.properties || {},
        [feature?.properties],
    );
    const buildingId = React.useMemo(
        () => {

            const id = Number(featureProps.dbId);
            return isNaN(id)
                ? null
                : id;

        },
        [featureProps.dbId],
    );

    const locationData = React.useMemo(
        () => ({
            "countrySubdivision": featureProps.de_ao_prov || mapState.map.currentLocation.countrySubdivision || null,
            "municipality": featureProps.de_ao_city || mapState.map.currentLocation.municipality || null,
            "address": featureProps.de_ao_stre || mapState.map.currentLocation.address || null,
            "postalCode": featureProps.de_ao_post || mapState.map.currentLocation.postalCode || null,
            "site": mapState.map.currentLocation.site || null,
    }),
        [
            featureProps.de_ao_prov,
            featureProps.de_ao_city,
            featureProps.de_ao_stre,
            featureProps.de_ao_post,
            mapState.map.currentLocation.countrySubdivision,
            mapState.map.currentLocation.municipality,
            mapState.map.currentLocation.address,
            mapState.map.currentLocation.postalCode,
            mapState.map.currentLocation.site,
        ]);

    const shouldFetchData = Boolean(buildingId && isOpen);
    const {building, isLoading, isError} = useBuilding(shouldFetchData
        ? buildingId
        : null);

    const displayData = React.useMemo(
        () => ({
            "name": building?.buildingName || t('namePlaceholder'),
            "displayAddress": building?.buildingAddress || locationData.address,
            "buildingType": building?.buildingType,
            "NumberOfStoreys": building?.buildingStoreyNum,
        }),
        [
            building?.buildingName,
            building?.buildingAddress,
            building?.buildingType,
            building?.buildingStoreyNum,
            locationData.address,
]
    );

    if (!buildingId) {

        return null;

    }

    const [expanded, setExpanded] = React.useState(false);

    // Show only the short subdivision code (e.g. "ON" from "CA-ON")
    const shortSubdivision = React.useMemo(() => {
        const code = locationData.countrySubdivision;
        if (!code) return null;
        const dash = code.lastIndexOf('-');
        return dash >= 0 ? code.slice(dash + 1) : code;
    }, [locationData.countrySubdivision]);

    return (
        <PopoverContent
            className="w-64 -m-1"
            side="top"
        >
            {/* Header row: title + close button, no overlap */}
            <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                    {isLoading
                        ? <Skeleton className="h-4 w-32" />
                        : isError
                            ? (
                                <div className="flex items-center gap-2 text-destructive">
                                    <LR.AlertCircle className="w-4 h-4 shrink-0" />
                                    <h4 className="font-medium leading-none truncate">{t('loadingError')}</h4>
                                </div>
                            )
                            : <h4 className="font-medium leading-snug">{displayData.name}</h4>
                    }
                    {isError && <p className="text-xs text-muted-foreground mt-1">{String(isError)}</p>}
                </div>
                <Button
                    aria-label="Close"
                    className="shrink-0 p-0 m-0 text-muted-foreground hover:text-foreground"
                    onClick={onCloseAction}
                    variant="ghost"
                    size="icon"
                >
                    <LR.X className="w-4 h-4" />
                </Button>
            </div>
            {/* Expand/collapse details */}
            {!isError && (
                <>
                    {isLoading
                        ? <Skeleton className="h-5 w-24 mt-1" />
                        : (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-7 text-xs text-muted-foreground justify-start gap-1 px-0 hover:text-foreground hover:bg-transparent"
                                onClick={() => setExpanded(v => !v)}
                            >
                                {expanded ? <LR.ChevronUp className="w-3 h-3" /> : <LR.ChevronDown className="w-3 h-3" />}
                                {expanded ? t('hideDetails') : t('showDetails')}
                            </Button>
                        )}

                    {expanded && !isLoading && (
                        <div className="mt-2 flex flex-col gap-2">
                            {/* Address */}
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">{t('address')}</p>
                                {locationData.site && (
                                    <p className="text-sm">{locationData.site.replace("_", " ")}</p>
                                )}
                                {displayData.displayAddress && (
                                    <p className="text-sm">{displayData.displayAddress}</p>
                                )}
                                {(locationData.municipality || shortSubdivision || locationData.postalCode) && (
                                    <p className="text-sm">
                                        {[locationData.municipality, shortSubdivision, locationData.postalCode]
                                            .filter(Boolean)
                                            .join(", ")}
                                    </p>
                                )}
                            </div>
                            {/* Building Type */}
                            {displayData.buildingType && (
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">{t('buildingType')}</p>
                                    <Badge variant="secondary">{displayData.buildingType}</Badge>
                                </div>
                            )}
                            {/* Number of Storeys */}
                            {displayData.NumberOfStoreys && (
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">{t('StoreysNum')}</p>
                                    <p className="text-sm">{displayData.NumberOfStoreys}</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <Separator className="my-3" />
            <BuildingTools
                building={building}
                feature={feature}
                isError={isError}
                isLoading={isLoading}
                onCloseAction={onCloseAction}
            />
        </PopoverContent>
    );

}
