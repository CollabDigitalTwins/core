'use client'

import * as React from "react";
import { LocationSettings } from './src/LocationSettings';
import { MapCustomization } from './src/MapCustomization';

export function SettingsTab() {
  return (
    <div className="w-full h-full flex flex-col gap-6 p-4 overflow-y-auto point">
      <MapCustomization />
      <LocationSettings />
    </div>
  )
}