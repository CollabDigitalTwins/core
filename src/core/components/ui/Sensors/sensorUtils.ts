// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { SensorTypes } from '../../../types/dbTypes';
import * as LR from 'lucide-react'

export const sensorTypeIcons: Record<SensorTypes, LR.LucideIcon> = {
  'Temperature': LR.Thermometer,
  'Light': LR.Sun,
  'Humidity': LR.Droplets,
  'Energy_Consumption': LR.Zap,
  'Movement': LR.Cctv,
  'Air_Quality': LR.Wind,
  'Atmospheric_Pressure': LR.Gauge,
  'Irradiance': LR.Radiation,
  'Flow': LR.Waves,
  'State': LR.ToggleLeft,
  'Noise_Level': LR.Volume2,
}

export function getSensorTypeIcon(sensorType: `${SensorTypes}`): LR.LucideIcon {
  return sensorTypeIcons[sensorType] || LR.Radio
}

// Define a type for your color palette
type ColorPalette = {
  max: string;   // Main icon color
  mid: string;   // Muted accent
  min: string;   // Very light max
};

// Muted, non-dramatic color map
export const sensorTypeColors: Record<SensorTypes, ColorPalette> = {
  'Temperature': { 
    max: '#EF4444',   // Bold Red (Hot)
    mid: '#F8FAFC',   // Slate-50 (Neutral/White)
    min: '#3B82F6'    // Bold Blue (Cold)
  },
  'Energy_Consumption': { 
    max: '#B91C1C',   // Deep Red (High Usage)
    mid: '#FACC15',   // Bright Yellow (Moderate)
    min: '#16A34A'    // Green (Efficient)
  },
  'Air_Quality': { 
    max: '#7F1D1D',   // Dark Maroon (Poor)
    mid: '#F97316',   // Orange (Moderate)
    min: '#10B981'    // Emerald (Clean)
  },
  'Humidity': { 
    max: '#1E3A8A',   // Navy (Saturated/Wet)
    mid: '#60A5FA',   // Sky Blue
    min: '#E0F2FE'    // Very Light Blue (Dry)
  },
  'Light': { 
    max: '#FDE047',   // Sun Yellow (Bright)
    mid: '#F59E0B',   // Amber
    min: '#451A03'    // Dark Brown (Dim/Dark)
  },
  // 'Battery': { // Bonus for consistency
  //   max: '#059669',   // Green (Full)
  //   mid: '#EAB308',   // Yellow (Medium)
  //   min: '#DC2626'    // Red (Critical)
  // },
  'Flow': { 
    max: '#0891B2',   // Dark Cyan (High Flow)
    mid: '#22D3EE',   // Cyan
    min: '#CFFAFE'    // Pale Cyan
  },
  'Movement': { 
    max: '#475569',   // Slate-600 (Active)
    mid: '#94A3B8',   // Slate-400
    min: '#F1F5F9'    // Slate-100 (Still)
  },
  'Atmospheric_Pressure': { 
    max: '#4338CA',   // Indigo-700
    mid: '#818CF8',   // Indigo-400
    min: '#E0E7FF'    // Indigo-100
  },
  'Irradiance': { 
    max: '#EA580C',   // Deep Orange
    mid: '#FB923C',   // Orange
    min: '#FFF7ED'    // Shell
  },
  'State': { 
    max: '#27272A',   // Zinc-800
    mid: '#71717A',   // Zinc-500
    min: '#F4F4F5'    // Zinc-100
  },
  'Noise_Level': {
    max: '#EC4899',   // Pink-500 (Loud/Peak)
    mid: '#8B5CF6',   // Violet-500 (Active)
    min: '#14B8A6'    // Teal-500 (Silent/Background)
  }
};

// Fallback palette (Neutral Grey)
export const defaultPalette: ColorPalette = {
    max: '#B91C1C',   // Deep Red (High Usage)
    mid: '#FACC15',   // Bright Yellow (Moderate)
    min: '#16A34A'    // Green (Efficient)
};

export function getSensorTypeColors(sensorType: `${SensorTypes}`): ColorPalette { 
  return sensorTypeColors[sensorType] || defaultPalette;
}