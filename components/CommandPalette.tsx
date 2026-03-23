import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Page } from '../types';

import Icon from './Icon';

type CommandAction = { type: 'navigate', payload: Page };

interface SearchableItem {
  id: string;
  name: string;
  type: 'Page' | 'Product' | 'Customer' | 'Supplier' | 'Dish' | 'RawMaterial' | 'Expense';
  action: CommandAction;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: SearchableItem[];
  setCurrentPage: (page: Page) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = React.memo(({ isOpen, onClose, items, setCurrentPage }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Global listener for Escape key only
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const filteredItems = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();
    if (!searchTerm.trim()) return items;
    return items.filter(item => item && (item.name || '').toLowerCase().includes(lowerCaseSearch));
  }, [items, searchTerm]);

  // Reset active index when search term changes (handled in handleSearchChange)

  const handleSelect = useCallback((item: SearchableItem) => {
    if (item.action.type === 'navigate') {
      setCurrentPage(item.action.payload);
    }
    onClose();
  }, [onClose, setCurrentPage]);

  // Scroll the active item into view
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + (filteredItems.length || 1)) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedItem = filteredItems[activeIndex];
      if (selectedItem) {
        handleSelect(selectedItem);
      }
    }
  };

  if (!isOpen) return null;

  const getIcon = (type: SearchableItem['type']) => {
    switch (type) {
        case 'Page': return '📄';
        case 'Product': return '📦';
        case 'Customer': return '👤';
        case 'Supplier': return '🚚';
        case 'Dish': return '🍕';
        case 'RawMaterial': return '🍅';
        case 'Expense': return '🧾';
        default: return '❓';
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-[80] p-4 pt-[15vh]">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg flex flex-col modal-content">
        <div className="relative">
          <Icon name="search" className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search for pages, products, customers..."
            className="w-full py-4 pl-12 pr-4 bg-transparent text-slate-900 dark:text-white text-lg focus:outline-none"
          />
           <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-slate-400 border rounded px-1.5 py-0.5">
            Ctrl+P
          </div>
        </div>
        <ul className="border-t dark:border-slate-700 max-h-80 overflow-y-auto">
          {filteredItems.length > 0 ? filteredItems.map((item, index) => (
            <li
              key={item.id}
              ref={activeIndex === index ? activeItemRef : null}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`px-4 py-3 flex items-center gap-4 cursor-pointer ${activeIndex === index ? 'bg-primary-100 dark:bg-primary-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
                <span className="text-lg">{getIcon(item.type)}</span>
                <div className='flex-grow'>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                </div>
                <span className="text-xs text-slate-500">{item.type}</span>
            </li>
          )) : (
            <li key="no-results" className="px-4 py-8 text-center text-slate-500">No results found.</li>
          )}
        </ul>
      </div>
    </div>
  );
});

export default CommandPalette;