"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../../ui/Table";

import { Badge, Button, Checkbox, Input, ScrollArea } from '../../../../ui';

import { Tabs, TabsList, TabsTrigger } from "../../../../ui/Tabs";

import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import ConfirmDialog from '../../../../ConfirmDialog'
// import { useAppConfigContext } from '../../../../../store/AppConfig/context'

import {
    Star,
    StarOff,
    Eye,
    Trash2,
    Filter,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

type PointCloud = {
    id: string;
    name: string;
    point_cloud_uploaded: boolean;
    point_cloud_potree_converted: boolean;
    createdAt: string;
    potree_metadata_presigned_url?: string | null;
    potree_metadata_file_key?: string | null;
};

type StatusFilter = "all" | "uploaded" | "converted" | "not-converted";

enum PAGE {
    TABLE = "table",
    UPLOAD = "upload",
}

type PointCloudTableProps = React.HTMLAttributes<HTMLDivElement> & {
    onUploadButtonClick: () => void;
    pointcloudApiUrl?: string;
};

export function PointCloudTable({
    onUploadButtonClick,
    pointcloudApiUrl,
    ...divProps
}: PointCloudTableProps) {
    const API_BASE = pointcloudApiUrl ?? 'http://localhost:5101'
    const [pointClouds, setPointClouds] = React.useState<PointCloud[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
    const [favorites, setFavorites] = React.useState<Set<string>>(new Set());
    const [currentUrl, setCurrentUrl] = React.useState<URL | null>(null);
    const [deleteTarget, setDeleteTarget] = React.useState<PointCloud | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)
    const t = useTranslations('PointCloudManagement')

    React.useEffect(() => {
        // This only runs in the browser
        const url = new URL(window.location.href);
        setCurrentUrl(url);
    }, []);

    const [currentPage, setCurrentPage] = React.useState<PAGE>(PAGE.TABLE)

    // route and navigation
    const router = useRouter()
    const pathname = usePathname()

    const loadPointClouds = React.useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/point-cloud`, {
                headers: { "Accept": "application/json" },
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch point clouds (${res.status})`);
            }

            const data: PointCloud[] = await res.json();
            setPointClouds(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error ? err.message : "Unknown error while loading data",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadPointClouds();
    }, [loadPointClouds]);

    const openViewer = (pointCloudId) => {
        if (!pointCloudId) return;
        const origin = window.location.origin
        const pathname = window.location.pathname
        const params = new URLSearchParams(currentUrl.search)
        params.set('viewer', 'pointcloud')
        params.set('pointCloudId', pointCloudId)
        const newurl = `${origin}${pathname}?${params.toString()}`
        router.push(newurl, { scroll: false }) // push but do not refresh
    };

    const handleDelete = async () => {
        if (!deleteTarget) return

        setIsDeleting(true)

        try {
            const res = await fetch(`${API_BASE}/point-cloud/${deleteTarget.id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || `Delete failed (${res.status})`);
            }

            setPointClouds((prev) => prev.filter((pc) => pc.id !== deleteTarget.id));
            setFavorites((prev) => {
                const next = new Set(prev);
                next.delete(deleteTarget.id);
                return next;
            });
            toast.success(t('deleteSuccess', { name: deleteTarget.name }))
        } catch (err) {
            console.error(err);
            toast.error(
                err instanceof Error
                    ? t('deleteFailedWithReason', { error: err.message })
                    : t('deleteFailed'),
            );
        } finally {
            setIsDeleting(false)
            setDeleteTarget(null)
        }
    };

    const toggleFavorite = (id: string) => {
        setFavorites((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const filtered = React.useMemo(() => {
        return pointClouds.filter((pc) => {
            const matchesSearch =
                !search ||
                pc.name.toLowerCase().includes(search.toLowerCase()) ||
                pc.id.toLowerCase().includes(search.toLowerCase());

            let matchesStatus = true;
            if (statusFilter === "uploaded") {
                matchesStatus = pc.point_cloud_uploaded;
            } else if (statusFilter === "converted") {
                matchesStatus = pc.point_cloud_potree_converted;
            } else if (statusFilter === "not-converted") {
                matchesStatus =
                    pc.point_cloud_uploaded && !pc.point_cloud_potree_converted;
            }

            return matchesSearch && matchesStatus;
        });
    }, [pointClouds, search, statusFilter]);

    return (
        <div className={`p-2 mt-20 ${divProps}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Point Clouds
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Search point clouds..."
                        className="w-[240px]"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button variant="outline" size="icon" title="Filters (not wired)">
                        <Filter className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={loadPointClouds}
                        disabled={loading}
                        title="Refresh"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Tabs row */}
            <Tabs
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val as StatusFilter)}
                className="w-full mb-2"
            >
                <TabsList className="h-8">
                    <TabsTrigger value="all" className="px-3">
                        All
                    </TabsTrigger>
                    <TabsTrigger value="uploaded" className="px-3">
                        Uploaded
                    </TabsTrigger>
                    <TabsTrigger value="converted" className="px-3">
                        Converted
                    </TabsTrigger>
                    <TabsTrigger value="not-converted" className="px-3">
                        Needs conversion
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Table card */}
            <div className="rounded-md border bg-background">
                <ScrollArea className="max-h-[520px]">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                            <TableRow>
                                <TableHead className="w-[40px] pl-4">
                                    <Checkbox aria-label="Select all" />
                                </TableHead>
                                <TableHead className="w-[48px]"></TableHead>
                                <TableHead className="min-w-[220px]">Name</TableHead>
                                <TableHead className="w-[200px]">Status</TableHead>
                                <TableHead className="w-[220px]">Created</TableHead>
                                <TableHead className="w-[160px]">Metadata</TableHead>
                                <TableHead className="w-[140px] text-right pr-4">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading && pointClouds.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        Loading point clouds…
                                    </TableCell>
                                </TableRow>
                            )}

                            {!loading && error && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <span className="text-sm text-destructive">
                                            {error}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            )}

                            {!loading && !error && filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <span className="text-sm text-muted-foreground">
                                            No point clouds found.
                                        </span>
                                    </TableCell>
                                </TableRow>
                            )}

                            {filtered.map((pc) => {
                                const isFavorite = favorites.has(pc.id);
                                return (
                                    <TableRow
                                        key={pc.id}
                                        className="hover:bg-muted/50 transition-colors"
                                    >
                                        <TableCell className="pl-4">
                                            <Checkbox aria-label={`Select ${pc.name}`} />
                                        </TableCell>

                                        {/* Favorite star */}
                                        <TableCell className="text-center">
                                            <button
                                                type="button"
                                                onClick={() => toggleFavorite(pc.id)}
                                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-yellow-500"
                                                aria-label={
                                                    isFavorite
                                                        ? `Remove ${pc.name} from favourites`
                                                        : `Add ${pc.name} to favourites`
                                                }
                                            >
                                                {isFavorite ? (
                                                    <Star className="h-4 w-4 fill-yellow-400" />
                                                ) : (
                                                    <StarOff className="h-4 w-4" />
                                                )}
                                            </button>
                                        </TableCell>

                                        {/* Name & ID */}
                                        <TableCell>
                                            <div className="font-medium">{pc.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {pc.id}
                                            </div>
                                        </TableCell>

                                        {/* Status badges */}
                                       <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                <Badge
                                                className={`text-xs border ${
                                                    pc.point_cloud_uploaded
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                                }`}
                                                >
                                                {pc.point_cloud_uploaded ? "Uploaded" : "Not uploaded"}
                                                </Badge>

                                                <Badge
                                                className={`text-xs border ${
                                                    pc.point_cloud_potree_converted
                                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                                }`}
                                                >
                                                {pc.point_cloud_potree_converted
                                                    ? "Ready to view"
                                                    : "Needs conversion"}
                                                </Badge>
                                            </div>
                                        </TableCell>

                                        {/* Created date */}
                                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                            {new Date(pc.createdAt).toLocaleString()}
                                        </TableCell>

                                        {/* Metadata link */}
                                        <TableCell>
                                            {pc.potree_metadata_presigned_url ? (
                                                <Button
                                                    asChild
                                                    variant="link"
                                                    size="sm"
                                                    className="px-0"
                                                >
                                                    <a
                                                        href={pc.potree_metadata_presigned_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        metadata.json
                                                    </a>
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="pr-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    disabled={!pc.potree_metadata_file_key}
                                                    onClick={() =>
                                                        openViewer(pc.id)
                                                    }
                                                    title="Open Potree viewer"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => setDeleteTarget(pc)}
                                                    title={t('deleteTitle')}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </ScrollArea>

                {/* Faux pagination / footer */}
                <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
                    <div>
                        Showing <span className="font-medium">{filtered.length}</span> of{" "}
                        <span className="font-medium">{pointClouds.length}</span> point
                        clouds
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" disabled>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

            </div>

            <Button
                onClick={() => {
                    if (onUploadButtonClick != undefined){
                        onUploadButtonClick()
                    }
                }}
                className="mt-1 flex gap-2"
            >
                Upload point cloud →
            </Button>

            <ConfirmDialog
                isOpen={deleteTarget != null}
                isDeleting={isDeleting}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null)
                }}
                handleConfirm={async (e) => {
                    e.preventDefault()
                    await handleDelete()
                }}
                itemName={deleteTarget?.name}
                dataType={t('pointCloudItem')}
            />
        </div>
    );
}
