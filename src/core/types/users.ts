// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { IMedia } from './files'
import { Identified } from './global'

export type Visibility = 'private' | 'public' | 'group' | 'admin' | undefined

export interface Group extends Identified {}

export type Privacy = 'private' | 'public' | 'group' | 'admin' | undefined

export type UserRoles
  = | 'superAdmin'
    | 'admin'
    | 'commenter'
    | 'viewer'
    | 'guest'
    | undefined

export interface DTUser {
  _id: string
  password: string
  emailVerified: boolean
  groups: Group[]
  media: IMedia[]
  roles: UserRoles[]
}
