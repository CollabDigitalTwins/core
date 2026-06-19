"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useCoreHooks } from "../provider";

export const useOrganization = (id: string | null) =>
  useCoreHooks().organization.useOrganization(id);

export const useOrganizationByName = (name: string | null) =>
  useCoreHooks().organization.useOrganizationByName(name);

export const useOrganizationRoles = (orgId: string | null) =>
  useCoreHooks().organization.useOrganizationRoles(orgId);