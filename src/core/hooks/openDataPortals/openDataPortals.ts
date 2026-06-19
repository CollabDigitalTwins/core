"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useCoreHooks } from "../provider";

export const useOpenDataPortals = () => useCoreHooks().openData.useOpenDataPortals();

export const useOpenDataPortalById = (id: number | null) => useCoreHooks().openData.useOpenDataPortalById(id);

export const useCreateOpenDataPortal = () => useCoreHooks().openData.useCreateOpenDataPortal();

export const useOpenDataPortalsByMunicipality = (municipality: string | null) =>
  useCoreHooks().openData.useOpenDataPortalsByMunicipality(municipality);

export const useOpenDataPortalsByMunicipalityAndCountrySubdivision = (
  municipality: string | null,
  countrySubdivisions: any
) => useCoreHooks().openData.useOpenDataPortalsByMunicipalityAndCountrySubdivision(municipality, countrySubdivisions);

export const useOpenDataPortalsByCountrySubdivision = (countrySubdivision: string) =>
  useCoreHooks().openData.useOpenDataPortalsByCountrySubdivision(countrySubdivision);

export const useOpenDataPortalsByGroup = (group: any) =>
  useCoreHooks().openData.useOpenDataPortalsByGroup(group);

export const useOpenDataPortalsByName = (name: string | null) =>
  useCoreHooks().openData.useOpenDataPortalsByName(name);
