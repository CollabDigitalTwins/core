'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useBuildings } from '../../../../../hooks/buildings/buildings'
import { Button } from '../../../../ui/Button'
import { Input } from '../../../../ui/Input'
import { Separator } from '../../../../ui/Separator'
import { searchBuildings } from '../lib/searchBuildings'
import { useOptionListKeys } from '../lib/useOptionListKeys'
import { useSelectBuilding } from '../lib/useSelectBuilding'

interface SearchToolProps {
  alwaysExpanded?: boolean;
}

const MIN_QUERY_LENGTH = 3

export default function BIMSearchTool(props: SearchToolProps) {
  const t = useTranslations('BIMSearchTool')
  const alwaysExpanded = props.alwaysExpanded ?? false;
  const { buildings } = useBuildings();
  const selectBuilding = useSelectBuilding();
  const [query, setQuery] = React.useState('');
  const [focused, setFocused] = React.useState(alwaysExpanded);
  const [isExpanded, setIsExpanded] = React.useState(alwaysExpanded);

  // Handle expand/collapse of menubar to display search input
  const handleExpand = () => {
    if (alwaysExpanded) return; // Don't allow toggling if always expanded
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      setFocused(false);
      setQuery(''); // clear input when collapsed
    } else {
      setFocused(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100); // Small delay to ensure the input is rendered
    }
  };

  const { inputRef, optionRef, onInputKeyDown, onOptionKeyDown } = useOptionListKeys(
    query.length >= MIN_QUERY_LENGTH ? searchBuildings(buildings, query).length : 0,
  );

  const results = React.useMemo(
    () => (query.length >= MIN_QUERY_LENGTH ? searchBuildings(buildings, query) : []),
    [buildings, query],
  );

  const handleSelect = (building: (typeof results)[number]) => {
    selectBuilding(building);
    setQuery('');
    setFocused(false);
    if (!alwaysExpanded) setIsExpanded(false);
  };

  return (
    // A plain container, not cmdk's Command: its root intercepts Enter and never forwards it.
    <div className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
      <div className="flex flex-row justify-start items-center w-full h-auto">
        {!alwaysExpanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExpand}
            className="opacity-70 w-6 justify-end hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
          >
            <Search />
          </Button>
        )}
        {alwaysExpanded && <Search className="h-4 w-4 opacity-50" />}
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onInputKeyDown}
          placeholder={alwaysExpanded ? t('placeholderExpanded') : t('placeholder')}
          className={`border-none focus-visible:ring-transparent text-sm transition-all ease-in-out duration-200 ${
            alwaysExpanded || isExpanded ? 'w-full' : 'w-0 p-0'
          }`}
        />
      </div>
      {focused && query.length >= MIN_QUERY_LENGTH && (
        <React.Fragment>
          <Separator />
          {results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">{t('noResults')}</div>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((building, index) => (
                <li key={building.id}>
                  <button
                    type="button"
                    ref={optionRef(index)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                    onMouseDown={event => event.preventDefault()}
                    onKeyDown={onOptionKeyDown(index)}
                    onClick={() => handleSelect(building)}
                  >
                    <span className="block truncate">{building.buildingName ?? t('unnamed')}</span>
                    {building.buildingAddress && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {building.buildingAddress}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </React.Fragment>
      )}
    </div>
  );
}
