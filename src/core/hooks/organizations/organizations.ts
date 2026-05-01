"use client";

import { useCoreHooks } from "../provider";

export const useOrganization = (id: string | null) =>
  useCoreHooks().organization.useOrganization(id);

export const useOrganizationByName = (name: string | null) =>
  useCoreHooks().organization.useOrganizationByName(name);

export const useOrganizationRoles = (orgId: string | null) =>
  useCoreHooks().organization.useOrganizationRoles(orgId);