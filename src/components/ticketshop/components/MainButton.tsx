import React, { forwardRef } from 'react';

interface MainButtonProps {
    handleClick: () => void;
    label: string;
    disabled?: boolean;
    style?: 'primary' | 'secondary';
    className?: string;
    size?: 'small' | 'medium' | 'large';
    type?: 'button' | 'submit' | 'reset';
}

const MainButton = forwardRef<HTMLButtonElement, MainButtonProps>(
    ({ handleClick, label, disabled = false, style = 'primary', className = '', size = 'medium', type = 'button' }, ref) => {

        switch (style) {
            case 'secondary':
                return (
                    <button ref={ref} type={type} onClick={() => handleClick()} disabled={disabled} className={`cursor-pointer border-[1.5px] bg-white border-darkBlue text-darkBlue hover:bg-darkBlue hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 rounded-md px-10 flex items-center justify-center ${className} ${size === 'small' ? 'h-10 text-sm' : size === 'large' ? 'h-14 text-[17px]' : 'h-12 text-sm'}`}>
                        {label}
                    </button>
                );
            default:
                return (
                    <button ref={ref} type={type} onClick={() => handleClick()} disabled={disabled} className={`cursor-pointer bg-darkBlue text-white hover:bg-white border-[1.5px] border-darkBlue hover:text-darkBlue hover:border-darkBlue hover:border-[1.5px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 rounded-md px-10 flex items-center justify-center ${className} ${size === 'small' ? 'h-10 text-sm' : size === 'large' ? 'h-14 text-[17px]' : 'h-12 text-sm'}`}>
                        {label}
                    </button>
                );
        }
    }
);

export { MainButton };