"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useCoreHooks } from "../provider";

/**
 * Convenience wrapper so components can import hooks directly from src/core/hooks/users
 * Instead of calling useCoreHooks().user first from src/core/hooks/provider.tsx
 */

export const useUsers = () => useCoreHooks().user.useUsers();
export const useUser = (userId: string) => useCoreHooks().user.useUser(userId);
export const useCreateUser = () => useCoreHooks().user.useCreateUser();
export const useUserRole = (userId: string) => useCoreHooks().user.useUserRole(userId);
export const useVerifyPassword = (userId: string) => useCoreHooks().user.useVerifyPassword(userId);
export const useChangePassword = (userId: string) => useCoreHooks().user.useChangePassword(userId);
