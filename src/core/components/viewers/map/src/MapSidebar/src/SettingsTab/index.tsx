'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { LocationSettings } from './src/LocationSettings';
import { MapCustomization } from './src/MapCustomization';

export function SettingsTab({ countryCode }: { countryCode?: string }) {
  return (
    <div className="w-full h-full flex flex-col gap-6 p-4 overflow-y-auto point">
      <MapCustomization />
      <LocationSettings countryCode={countryCode} />
    </div>
  )
}