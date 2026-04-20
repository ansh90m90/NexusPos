
import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { fuzzySearch } from '../lib/searchUtils';

interface ComboBoxProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onSelect?: (value: string) => void;
    options: string[];
    placeholder?: string;
    required?: boolean;
    error?: string;
    helperText?: string;
    allowCustom?: boolean;
}

const ComboBox: React.FC<ComboBoxProps> = ({ 
    label, 
    value, 
    onChange, 
    onSelect,
    options, 
    placeholder, 
    required,
    error,
    helperText,
    allowCustom
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value || '');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSearchTerm(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = (options || []).filter(option => 
        fuzzySearch(searchTerm || '', option || '')
    );

    const isNewValue = (searchTerm || '').trim() !== '' && !(options || []).some(opt => opt && opt.toLowerCase() === (searchTerm || '').toLowerCase());

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchTerm(newValue);
        onChange(newValue);
        setIsOpen(true);
    };

    const handleOptionSelect = (option: string) => {
        setSearchTerm(option);
        onChange(option);
        if (onSelect) {
            onSelect(option);
        }
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmed = searchTerm.trim();
            if (trimmed !== '') {
                // If it's a known option, select it correctly (case-insensitive find)
                const exactMatch = options.find(opt => opt && opt.toLowerCase() === trimmed.toLowerCase());
                const finalValue = exactMatch || (allowCustom ? trimmed : '');
                if (finalValue) {
                    handleOptionSelect(finalValue);
                }
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div className="space-y-1 relative" ref={containerRef}>
            <label className="text-xs font-bold text-theme-muted uppercase tracking-wider">{label} {required && '*'}</label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className={`w-full p-3 rounded-xl bg-theme-main text-theme-main border transition-all focus:ring-2 focus:ring-primary-500 focus:outline-none ${
                        isNewValue 
                            ? 'border-amber-500 ring-1 ring-amber-500/20' 
                            : error 
                                ? 'border-red-500' 
                                : 'border-theme-main'
                    }`}
                    required={required}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                    {isNewValue && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase">New</span>
                    )}
                    <Icon name="chevron-down" className={`w-4 h-4 text-theme-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (filteredOptions.length > 0 || isNewValue) && (
                <div className="absolute z-50 w-full mt-1 bg-theme-surface border border-theme-main rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {filteredOptions.map((option, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleOptionSelect(option)}
                            className="w-full text-left px-4 py-2.5 hover:bg-theme-main text-theme-main transition-colors text-sm first:rounded-t-xl last:rounded-b-xl flex items-center justify-between"
                        >
                            <span>{option}</span>
                            {option === value && <Icon name="check" className="w-4 h-4 text-primary-500" />}
                        </button>
                    ))}
                    {isNewValue && filteredOptions.length === 0 && (
                        <div className="px-4 py-3 text-sm text-theme-muted italic">
                            No matches found. Press enter or click away to use "{searchTerm}" as a new entry.
                        </div>
                    )}
                </div>
            )}
            
            {error ? (
                <p className="text-[10px] text-red-500 mt-1 font-medium">{error}</p>
            ) : isNewValue ? (
                <p className="text-[10px] text-amber-600 mt-1 font-medium italic">This is a new {(label || 'entry').toLowerCase()} and will be created.</p>
            ) : helperText ? (
                <p className="text-[10px] text-theme-muted mt-1">{helperText}</p>
            ) : null}
        </div>
    );
};

export default ComboBox;
