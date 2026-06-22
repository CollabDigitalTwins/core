// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Refer to article: https://medium.com/hackernoon/finally-the-typescript-redux-hooks-events-blog-you-were-looking-for-c4663d823b01

export type ActionMap<M extends { [index: string]: any }> = {
  [Key in keyof M]: M[Key] extends undefined
    ? {
        type: Key
      }
    : {
        type: Key
        payload?: M[Key]
      };
}
