// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Dataset } from '../../../../../../../../types/datasetTypes'

export interface DatasetLayerProps {
  dataset: Dataset
  index: number
  onLayerReady: (datasetName: string, layerIds: string[]) => void
  onLayerRemoved: (datasetName: string) => void
}
