// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import useSWR from 'swr'

import type { UserUsageReport, VolumeReport } from '../../types/usage'
import type { ApiAdapter } from '../ports/apiAdapter'

export function createUsageHooks(adapter: ApiAdapter) {
  const useMyUsage = () => {
    const { data, error, isLoading } = useSWR<VolumeReport>(['usage', 'me'], () => adapter.getMyUsage())
    return { report: data ?? null, isLoading, isError: error as unknown }
  }

  const useOrganizationUsage = () => {
    const { data, error, isLoading } = useSWR<UserUsageReport>(['usage', 'organization'], () => adapter.getOrganizationUsage())
    return { report: data ?? null, isLoading, isError: error as unknown }
  }

  return { useMyUsage, useOrganizationUsage }
}
