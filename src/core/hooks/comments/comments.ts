"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useCoreHooks } from "../provider";

/**
 * Convenience wrapper so components can import hooks directly from src/core/hooks/comments
 * Instead of calling useCoreHooks().comments first from src/core/hooks/provider.tsx
 */

export const useComments = () =>
  useCoreHooks().comment.useComments();

export const useComment = (id: number | null) =>
  useCoreHooks().comment.useComment(id);

export const useCommentsByAuthor = (authorId: number | null) =>
  useCoreHooks().comment.useCommentsByAuthor(authorId);

export const useCommentsByBuilding = (buildingId: number | null) =>
  useCoreHooks().comment.useCommentsByBuilding(buildingId);

export const useCreateComment = () =>
  useCoreHooks().comment.useCreateComment();