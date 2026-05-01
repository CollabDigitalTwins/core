"use client";

import { useCoreHooks } from "../provider";

export const useInfrastructures = () => useCoreHooks().infrastructure.useInfrastructures();
export const useInfrastructure = (infrastructureId: number) => useCoreHooks().infrastructure.useInfrastructure(infrastructureId);
export const useCreateInfrastructure = () => useCoreHooks().infrastructure.useCreateInfrastructure();
export const useDeleteInfrastructure = (infrastructureId?: number) => useCoreHooks().infrastructure.useDeleteInfrastructure(infrastructureId);
