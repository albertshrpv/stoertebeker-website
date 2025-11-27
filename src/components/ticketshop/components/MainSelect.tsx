import { useState, useRef, useEffect, useMemo } from 'react';

interface SelectOption {
    value: string;
    label: string;
}

interface MainSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    style?: 'primary' | 'secondary' | 'gray';
    error?: string;
}

export function MainSelect({
    value,
    onChange,
    options,
    placeholder = "Select an option",
    disabled = false,
    className = "",
    style = 'primary',
    error
}: MainSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = useMemo(() => (
        options.find(option => option.value === value) || null
    ), [options, value]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // selected option is derived from props via useMemo; no effect needed

    const handleSelect = (option: SelectOption) => {
        onChange(option.value);
        setIsOpen(false);
    };

    const toggleDropdown = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    switch (style) {
        case 'secondary':
            return (
                <div className={`relative ${className}`} ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={toggleDropdown}
                        disabled={disabled}
                        className={`
                            h-10 text-sm w-full bg-white dark:bg-darkBlue main-shadow rounded-lg px-4 py-2 !font-normal
                            text-left text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 
                            focus:ring-2 focus:ring-darkBlue/20 dark:focus:ring-white/20 focus:border-darkBlue dark:focus:border-white
                            transition-all duration-200 ease-in-out flex items-center justify-between
                            ${error ? 'border-red-500 focus:ring-red-500' : ''}
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}
                        `}
                    >
                        <span className={selectedOption ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                        <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg" className={`stroke-black dark:stroke-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                            <path d="M10.9502 1L7.03789 4.58701C6.74938 4.85145 6.35814 5 5.9502 5C5.54225 5 5.15101 4.85145 4.8625 4.58701L0.950195 1" />
                        </svg>
                    </button>

                    {isOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-darkBlue rounded-lg main-shadow max-h-60 overflow-auto border-0">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    className={`
                                        w-full text-left text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 !font-normal
                                        transition-colors duration-150 ease-in-out first:rounded-t-lg last:rounded-b-lg px-3 py-2
                                        ${option.value === value ? 'bg-darkBlue/10 dark:bg-white/10 text-darkBlue dark:text-white' : ''}
                                    `}
                                >
                                    {option.label}
                                </button>
                            ))}
                            {options.length === 0 && (
                                <div className="text-gray-500 dark:text-gray-400 text-center px-3 py-2">
                                    No options available
                                </div>
                            )}
                        </div>
                    )}
                    {error && (
                        <p className="mt-1 text-sm text-red-600">{error}</p>
                    )}
                </div>
            );
        case 'gray':
            return (
                <div className={`relative ${className}`} ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={toggleDropdown}
                        disabled={disabled}
                        className={`
                            h-12 text-sm w-full bg-baseGray dark:bg-darkBlue rounded-lg px-6 py-3 !font-normal
                            text-left text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 
                            focus:ring-0 focus:border-0
                            transition-all duration-200 ease-in-out flex items-center justify-between
                            ${error ? 'border-red-500' : ''}
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-darkBlue/60 dark:hover:border-white/60'}
                        `}
                    >
                        <span className={selectedOption ? 'text-black dark:text-white text-base' : 'text-gray-500 dark:text-gray-400'}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                        <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg" className={`stroke-black dark:stroke-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                            <path d="M10.9502 1L7.03789 4.58701C6.74938 4.85145 6.35814 5 5.9502 5C5.54225 5 5.15101 4.85145 4.8625 4.58701L0.950195 1" />
                        </svg>
                    </button>

                    {isOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-darkBlue rounded-lg main-shadow max-h-60 overflow-auto border border-gray-200 dark:border-gray-600">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    className={`
                                        w-full text-left text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 !font-normal
                                        transition-colors duration-150 ease-in-out first:rounded-t-lg last:rounded-b-lg px-4 py-3
                                        ${option.value === value ? 'bg-darkBlue/10 dark:bg-white/10 text-darkBlue dark:text-white' : ''}
                                    `}
                                >
                                    {option.label}
                                </button>
                            ))}
                            {options.length === 0 && (
                                <div className="text-gray-500 dark:text-gray-400 text-center px-4 py-3">
                                    No options available
                                </div>
                            )}
                        </div>
                    )}
                    {error && (
                        <p className="mt-1 text-sm text-red-600">{error}</p>
                    )}
                </div>
            );
        default:
            return (
                <div className={`relative ${className}`} ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={toggleDropdown}
                        disabled={disabled}
                        className={`
                            min-h-12 text-sm lg:text-base xl:text-base w-full gap-6 bg-white dark:bg-darkBlue border-[1.5px] rounded-md px-6 py-1 !font-normal
                            text-left text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 
                            focus:ring-2 focus:ring-darkBlue/20 dark:focus:ring-white/20 focus:border-darkBlue dark:focus:border-white
                            transition-all duration-200 ease-in-out flex items-center justify-between
                            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-black dark:border-gray-600'}
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-darkBlue/60 dark:hover:border-white/60'}
                        `}
                    >
                        <span className={selectedOption ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                        <svg width="17" height="9" viewBox="0 0 17 9" fill="none" xmlns="http://www.w3.org/2000/svg" className={`stroke-black dark:stroke-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                            <path d="M16 1L8.5 8L1 1" stroke="black" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>

                    </button>

                    {isOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-darkBlue rounded-lg main-shadow max-h-60 overflow-auto border-[1.5px] border-gray-200 dark:border-gray-600">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    className={`
                                        w-full text-left text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 !font-normal
                                        transition-colors duration-150 ease-in-out first:rounded-t-lg last:rounded-b-lg px-4 py-3
                                        ${option.value === value ? 'bg-darkBlue/10 dark:bg-white/10 text-darkBlue dark:text-white' : ''}
                                    `}
                                >
                                    {option.label}
                                </button>
                            ))}
                            {options.length === 0 && (
                                <div className="text-gray-500 dark:text-gray-400 text-center px-4 py-3">
                                    No options available
                                </div>
                            )}
                        </div>
                    )}
                    {error && (
                        <p className="mt-1 text-sm text-red-600">{error}</p>
                    )}
                </div>
            );
    }
}
