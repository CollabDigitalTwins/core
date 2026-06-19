// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Type declarations for CSS imports
declare module '*.css' {
  const content: Record<string, string>
  export default content
}
