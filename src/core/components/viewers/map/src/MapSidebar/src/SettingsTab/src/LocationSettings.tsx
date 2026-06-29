'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { useTranslations } from 'next-intl'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../../../ui/Select'
import { MapContext } from '../../../../../../../../store';
import { Input, CollapsibleSection } from '../../../../../../../ui/';
import { useState } from 'react';

export function LocationSettings({ countryCode }: { countryCode?: string }) {
    // Municipality autocomplete state
    const [municipalityInput, setMunicipalityInput] = useState('');
    const [municipalitySuggestions, setMunicipalitySuggestions] = useState<Array<{ name: string, lat: number, lng: number }>>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
  // Translation
  const t = useTranslations('SettingsTab')
  const {dispatch: mapDispatch, state: mapState} = React.useContext(MapContext)
  const { currentLocation, map, countrySubdivisionsData } = mapState.map;
  const orgCountryCode = (countryCode || 'CA').toLowerCase()

  // Local input states for lat/lng/zoom
  const [currentLat, setCurrentLat] = React.useState<number>();
  const [currentLng, setCurrentLng] = React.useState<number>();
  const [currentZoom, setCurrentZoom] = React.useState<number>();
  const [countrySubdivision, setCountrySubdivision] = React.useState<string>('');
  const [municipality, setMunicipality] = React.useState<string>('');

  React.useEffect(() => {
    if (currentLocation) {
      setCurrentLat(currentLocation.lat);
      setCurrentLng(currentLocation.lng);
      setCurrentZoom(currentLocation.zoom);
      setCountrySubdivision(currentLocation.countrySubdivision || '');
      setMunicipality(currentLocation.municipality || '');
    }
  }, [currentLocation]);


  // Geocode helper
  const geocodeLocation = async (query: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=${orgCountryCode}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Country subdivision change handler with geocoding
  const onCountrySubdivisionChange = async (value: string) => {
    // Clear municipality input and state
    setMunicipalityInput('');
    setMunicipalitySuggestions([]);
    setShowSuggestions(false);
    mapDispatch({
      type: 'UPDATE_LOCATION',
      payload: {
        currentLocation: {
          ...currentLocation,
          countrySubdivision: value,
          municipality: ''
        }
      }
    });

    // Geocode and navigate to country subdivision
    const location = await geocodeLocation(value);
    if (location && map) {
      map.flyTo({
        center: [location.lng, location.lat],
        zoom: 6,
        essential: true
      });
    }
  };

  // Municipality change handler with geocoding
  const onMunicipalityChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMunicipalityInput(value);
    mapDispatch({
      type: 'UPDATE_LOCATION',
      payload: {
        currentLocation: {
          ...currentLocation,
          municipality: value
        }
      }
    });

    // Fetch municipality suggestions
    if (value.length > 2 && countrySubdivision) {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&q=${encodeURIComponent(value + ', ' + countrySubdivision)}&limit=5&countrycodes=${orgCountryCode}`
      );
      const data = await response.json();
      // Only show municipality results
      const filtered = data.filter((item: any) =>
        item.type === 'municipality' || item.class === 'boundary' && item.type === 'administrative'
      ).slice(0, 3);
      setMunicipalitySuggestions(filtered.map((item: any) => ({
        name: item.display_name.split(',')[0],
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      })));
      setShowSuggestions(true);
    } else {
      setMunicipalitySuggestions([]);
      setShowSuggestions(false);
    }
  };

  // When a suggestion is selected, update and fly
  const onMunicipalitySuggestionSelect = (suggestion: { name: string, lat: number, lng: number }) => {
    setMunicipalityInput(suggestion.name);
    mapDispatch({
      type: 'UPDATE_LOCATION',
      payload: {
        currentLocation: {
          ...currentLocation,
          municipality: suggestion.name,
          lat: suggestion.lat,
          lng: suggestion.lng
        }
      }
    });
    setShowSuggestions(false);
    if (map) {
      map.flyTo({
        center: [suggestion.lng, suggestion.lat],
        zoom: 12,
        essential: true
      });
    }
  };

  React.useEffect(() => {
    if (!map) return;
    const handleMoveEnd = () => {
      const newCenter = map.getCenter();
      setCurrentLat(newCenter.lat);
      setCurrentLng(newCenter.lng);
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);
    };
    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map]);

  // Early return if currentLocation is not yet initialized
  if (!currentLocation) {
    return null;
  }

  // Input change handlers (local state only)
  // If the input is changed by arrows (stepper), update instantly
  const onLatitudeInputChange = (e) => {
    setCurrentLat(e.target.value);
    if (e.nativeEvent.inputType === 'insertReplacementText' || e.nativeEvent.inputType === 'deleteContentBackward' || e.nativeEvent.inputType === 'insertText') {
      // Do not update instantly when typing
      return;
    }
    // If value is a valid number, update instantly (arrows/stepper)
    const newLat = Number(e.target.value);
    if (!isNaN(newLat)) {
      mapDispatch({ type: 'UPDATE_LOCATION', payload: { currentLocation: { ...currentLocation, lat: newLat } } });
      map?.setCenter([currentLng || 0, newLat]);
    }
  };
  const onLongitudeInputChange = (e) => {
    setCurrentLng(e.target.value);
    if (e.nativeEvent.inputType === 'insertReplacementText' || e.nativeEvent.inputType === 'deleteContentBackward' || e.nativeEvent.inputType === 'insertText') {
      return;
    }
    const newLng = Number(e.target.value);
    if (!isNaN(newLng)) {
      mapDispatch({ type: 'UPDATE_LOCATION', payload: { currentLocation: { ...currentLocation, lng: newLng } } });
      map?.setCenter([newLng, currentLat || 0]);
    }
  };
  const onZoomInputChange = (e) => {
    setCurrentZoom(e.target.value);
    if (e.nativeEvent.inputType === 'insertReplacementText' || e.nativeEvent.inputType === 'deleteContentBackward' || e.nativeEvent.inputType === 'insertText') {
      return;
    }
    const newZoom = Number(e.target.value);
    if (!isNaN(newZoom)) {
      mapDispatch({ type: 'UPDATE_LOCATION', payload: { currentLocation: { ...currentLocation, zoom: newZoom } } });
      map?.setZoom(newZoom);
    }
  };

  // Commit changes onBlur or Enter
  const commitLat = () => {
    const newLat = Number(currentLat);
    if (!isNaN(newLat)) {
      mapDispatch({ type: 'UPDATE_LOCATION', payload: { currentLocation: { ...currentLocation, lat: newLat } } });
      map?.setCenter([currentLng || 0, newLat]);
    }
  };
  const commitLng = () => {
    const newLng = Number(currentLng);
    if (!isNaN(newLng)) {
      mapDispatch({ type: 'UPDATE_LOCATION', payload: { currentLocation: { ...currentLocation, lng: newLng } } });
      map?.setCenter([newLng, currentLat || 0]);
    }
  };
  const commitZoom = () => {
    const newZoom = Number(currentZoom);
    if (!isNaN(newZoom)) {
      mapDispatch({ type: 'UPDATE_LOCATION', payload: { currentLocation: { ...currentLocation, zoom: newZoom } } });
      map?.setZoom(newZoom);
    }
  };

  // Handle Enter key for inputs
  const handleLatKeyDown = (e) => { if (e.key === 'Enter') commitLat(); };
  const handleLngKeyDown = (e) => { if (e.key === 'Enter') commitLng(); };
  const handleZoomKeyDown = (e) => { if (e.key === 'Enter') commitZoom(); };

  return (
    <CollapsibleSection
          title={t('location')}
          chevronPosition="right"
          defaultOpen={true}
        >

      {/* Latitude & Longitude Inputs in 2 columns */}
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">Latitude</label>
          <Input
            type="number"
            value={currentLat ?? ''}
            step={currentZoom ? currentZoom >= 10 ? 0.0001 : currentZoom >= 5 ? 0.001 : 0.01 : 0.0001}
            onChange={onLatitudeInputChange}
            onBlur={commitLat}
            onKeyDown={handleLatKeyDown}
            placeholder={t('enter') + ' latitude'}
          />
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">Longitude</label>
          <Input
            type="number"
            value={currentLng ?? ''}
            step={currentZoom ? currentZoom >= 10 ? 0.0001 : currentZoom >= 5 ? 0.001 : 0.01 : 0.0001}
            onChange={onLongitudeInputChange}
            onBlur={commitLng}
            onKeyDown={handleLngKeyDown}
            placeholder={t('enter') + ' longitude'}
          />
        </div>
      </div>

      {/* Zoom Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Zoom</label>
        <Input
          type="number"
          value={currentZoom ?? ''}
          step={0.1}
          onChange={onZoomInputChange}
          onBlur={commitZoom}
          onKeyDown={handleZoomKeyDown}
          placeholder={t('enter') + ' zoom'}
        />
      </div>

      {/* Country Subdivision Select */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('countrySubdivision')}</label>
        <Select
          value={countrySubdivision}
          onValueChange={onCountrySubdivisionChange}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('selectCountrySubdivision')} />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(countrySubdivisionsData ?? {}).map(([code, sub]) => (
              <SelectItem key={code} value={code}>
                {(sub as any)?.name ?? code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Municipality Input with suggestions */}
      <div className="space-y-2 relative">
        <label className="text-sm font-medium">{t('municipality')}</label>
        <Input
          type="text"
          value={municipalityInput}
          onChange={onMunicipalityChange}
          placeholder={t('enter') + ' ' + t('municipality')}
          autoComplete="off"
        />
        {showSuggestions && municipalitySuggestions.length > 0 && (
          <ul className="absolute z-10 bg-white border rounded shadow w-full mt-1 max-h-40 overflow-auto">
            {municipalitySuggestions.map((suggestion, idx) => (
              <li
                key={suggestion.name + idx}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                onClick={() => onMunicipalitySuggestionSelect(suggestion)}
              >
                {suggestion.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </CollapsibleSection>
  )
}