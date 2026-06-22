"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useCoreHooks } from "../provider";

export const useInfrastructures = () => useCoreHooks().infrastructure.useInfrastructures();
export const useInfrastructure = (infrastructureId: number) => useCoreHooks().infrastructure.useInfrastructure(infrastructureId);
export const useCreateInfrastructure = () => useCoreHooks().infrastructure.useCreateInfrastructure();
export const useDeleteInfrastructure = (infrastructureId?: number) => useCoreHooks().infrastructure.useDeleteInfrastructure(infrastructureId);
