import React, { useState, useRef, useEffect } from 'react';

interface OTPInputProps {
    value: string;
    onChange: (value: string) => void;
    length?: number;
    disabled?: boolean;
    error?: string;
    className?: string;
    containerClassName?: string;
}

export function OTPInput({
    value,
    onChange,
    length = 6,
    disabled = false,
    error,
    className = '',
    containerClassName = ''
}: OTPInputProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Initialize refs array
    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, length);
    }, [length]);

    const handleInputChange = (index: number, inputValue: string) => {
        // Only allow single digit
        if (inputValue.length > 1) {
            inputValue = inputValue.slice(-1);
        }

        // Only allow numbers
        if (!/^\d*$/.test(inputValue)) {
            return;
        }

        const newValue = value.split('');
        newValue[index] = inputValue;
        const newOTP = newValue.join('').slice(0, length);
        
        onChange(newOTP);

        // Auto-focus next input
        if (inputValue && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        // Handle backspace
        if (e.key === 'Backspace') {
            if (!value[index] && index > 0) {
                // If current box is empty, focus previous box
                inputRefs.current[index - 1]?.focus();
            } else {
                // Clear current box
                const newValue = value.split('');
                newValue[index] = '';
                onChange(newValue.join(''));
            }
        }
        
        // Handle arrow keys
        if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowRight' && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        
        if (pastedData.length > 0) {
            onChange(pastedData);
            // Focus the next empty box or the last box
            const nextIndex = Math.min(pastedData.length, length - 1);
            inputRefs.current[nextIndex]?.focus();
        }
    };

    // Only apply default container classes if containerClassName is not provided
    const containerClasses = containerClassName || 'justify-between gap-2';
    // Only apply default width if className doesn't specify a width
    const widthClass = className.includes('w-') ? className : `w-full ${className}`;
    
    return (
        <div className={widthClass.trim()}>
            <div className={`flex ${containerClasses}`.trim()}>
                {Array.from({ length }, (_, index) => (
                    <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={value[index] || ''}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        onFocus={() => setActiveIndex(index)}
                        onBlur={() => setActiveIndex(null)}
                        disabled={disabled}
                        className={`
                            w-12 h-14 text-center text-lg font-semibold
                            border-[1.5px] border-darkBlue rounded-md
                            focus:outline-none focus:ring-2 focus:ring-offset-1
                            transition-all duration-200
                            ${error 
                                ? 'border-red-500 focus:ring-red-500' 
                                : activeIndex === index
                                    ? 'border-darkBlue focus:ring-darkBlue'
                                    : 'border-darkBlue focus:ring-darkBlue'
                            }
                            ${disabled 
                                ? 'bg-gray-100 cursor-not-allowed' 
                                : 'bg-white hover:border-gray-400'
                            }
                        `}
                    />
                ))}
            </div>
            {error && (
                <p className="mt-2 text-sm text-red-600 text-start">{error}</p>
            )}
        </div>
    );
}
