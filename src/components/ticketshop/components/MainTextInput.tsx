import React from 'react';

interface MainTextInputProps {
    type?: 'text' | 'email' | 'password' | 'tel' | 'date';
    value: string;
    onChange: (value: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    maxLength?: number;
}

export function MainTextInput({
    type = 'text',
    value,
    onChange,
    onKeyDown,
    placeholder,
    label,
    error,
    disabled = false,
    required = false,
    className = '',
    maxLength
}: MainTextInputProps) {
    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                maxLength={maxLength}
                className={`h-14 text-sm w-full bg-white border-[1.5px] rounded-md px-6 py-3 text-black placeholder-gray-500 transition-colors ${
                    error 
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                        : 'border-black dark:border-gray-600 focus:ring-darkBlue focus:border-darkBlue'
                } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
            />
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}
