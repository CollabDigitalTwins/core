'use client'

// Dependencies

import * as React from 'react'
import { Command } from '../../../../ui/Command'
import { Button } from '../../../../ui/Button'
import { Input } from '../../../../ui/Input'
import { Separator } from '../../../../ui/Separator'
import { Search } from 'lucide-react'

interface SearchToolProps {
  alwaysExpanded?: boolean;
}

export default function PCSearchTool(props: SearchToolProps) {
  const alwaysExpanded = props.alwaysExpanded ?? false;
  const [query, setQuery] = React.useState('');
  const [focused, setFocused] = React.useState(alwaysExpanded);
  const [isExpanded, setIsExpanded] = React.useState(alwaysExpanded);
  const inputRef = React.useRef<HTMLInputElement>(null);

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

  return (
    <Command>
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
          placeholder={alwaysExpanded ? 'Search for address...' : 'Search...'}
          className={`border-none focus-visible:ring-transparent text-sm transition-all ease-in-out duration-200 ${
            alwaysExpanded || isExpanded ? 'w-full' : 'w-0 p-0'
          }`}
        />
      </div>
      {focused && query.length >= 3 && (
        <React.Fragment>
          <Separator />
          <div className="p-4 text-center text-muted-foreground text-sm">
            No search results (placeholder)
          </div>
        </React.Fragment>
      )}
    </Command>
  );
}
