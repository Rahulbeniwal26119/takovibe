import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string | number;
    label: string;
}

interface SelectProps {
    label?: string;
    value: string | number;
    options: Option[];
    onChange: (value: any) => void; // Using any to accommodate generic value types easily
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
    label,
    value,
    options,
    onChange,
    placeholder = "Select an option",
    className = "",
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string | number) => {
        if (!disabled) {
            onChange(optionValue);
            setIsOpen(false);
        }
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    {label}
                </label>
            )}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-neutral-900/70 border border-gray-200 dark:border-neutral-800 rounded-lg transition-all duration-200 
                    ${isOpen ? 'ring-2 ring-orange-500/20 border-orange-500' : 'hover:border-gray-300 dark:hover:border-neutral-700'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                disabled={disabled}
            >
                <span className={`block truncate font-medium ${selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-neutral-950 border border-gray-100 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1 space-y-0.5">
                        {options.map((option) => {
                            const isSelected = option.value === value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-md transition-colors
                                        ${isSelected
                                            ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 font-medium'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-900'
                                        }
                                    `}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {isSelected && <Check className="w-4 h-4 ml-2 flex-shrink-0" />}
                                </button>
                            );
                        })}
                        {options.length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-400 text-center">
                                No options available
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
