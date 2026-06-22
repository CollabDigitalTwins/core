"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useCoreHooks } from "../provider";

export const useSites = () => useCoreHooks().site.useSites();
export const useSite = (siteId: string) => useCoreHooks().site.useSite(siteId);
export const useCreateSite = () => useCoreHooks().site.useCreateSite();
export const useDeleteSite = (siteId?: number | string) => useCoreHooks().site.useDeleteSite(siteId);
