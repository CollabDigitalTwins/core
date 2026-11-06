"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useCoreHooks } from "../provider";

export const useMyUsage = () => useCoreHooks().usage.useMyUsage();
export const useOrganizationUsage = () => useCoreHooks().usage.useOrganizationUsage();
