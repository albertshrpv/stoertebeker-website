import React from 'react';

interface Props {
    text: string;
    link: string;
    secondary?: boolean;
    external?: boolean;
}

const ActionButton: React.FC<Props> = ({ text, link, secondary, external }) => {

    if (secondary) {
        return (
            <a
                href={link}
                target={external ? "_blank" : "_self"}
                className="group flex items-center justify-center relative text-white border-white border rounded-md text-base md:text-lg pl-12 pr-16 py-2 hover:cursor-pointer overflow-hidden min-h-10"
            >
                <span className="text-white inline-block transform transition-transform duration-500 ease-in-out group-hover:translate-x-[16px]">
                    {text}
                </span>
                {/* Right arrow - initially visible, slides out to right on hover */}
                <svg
                    className="absolute right-8 opacity-100 transform transition-all duration-500 ease-in-out group-hover:opacity-0 group-hover:translate-x-[24px]"
                    width="8"
                    height="14"
                    viewBox="0 0 10 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M1 1L8.79782 8.5286C9.06739 8.78895 9.06739 9.21105 8.79782 9.4714L1 17" stroke="white" strokeLinecap="round"/>
                </svg>
                {/* Left arrow - initially hidden, slides in from left on hover */}
                <svg
                    className="absolute left-7 opacity-0 transform transition-all duration-500 ease-in-out translate-x-[-24px] group-hover:opacity-100 group-hover:translate-x-0"
                    width="8"
                    height="14"
                    viewBox="0 0 10 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M1 1L8.79782 8.5286C9.06739 8.78895 9.06739 9.21105 8.79782 9.4714L1 17" stroke="white" strokeLinecap="round"/>
                </svg>
            </a>
        );
    }

    return (
        <a
            href={link}
            target={external ? "_blank" : "_self"}
            className="group flex items-center justify-center relative text-neutral-900 border-neutral-900 border rounded-md text-base md:text-lg pl-12 pr-16 py-2 hover:cursor-pointer overflow-hidden min-h-10"
        >
            <span className="text-neutral-900 inline-block transform transition-transform duration-500 ease-in-out group-hover:translate-x-[16px]">
                {text}
            </span>
            {/* Right arrow - initially visible, slides out to right on hover */}
            <svg
                className="absolute right-8 opacity-100 transform transition-all duration-500 ease-in-out group-hover:opacity-0 group-hover:translate-x-[24px]"
                width="8"
                height="14"
                viewBox="0 0 10 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M1 1L8.79782 8.5286C9.06739 8.78895 9.06739 9.21105 8.79782 9.4714L1 17" stroke="currentColor" strokeLinecap="round"/>
            </svg>
            {/* Left arrow - initially hidden, slides in from left on hover */}
            <svg
                className="absolute left-7 opacity-0 transform transition-all duration-500 ease-in-out translate-x-[-24px] group-hover:opacity-100 group-hover:translate-x-0"
                width="8"
                height="14"
                viewBox="0 0 10 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M1 1L8.79782 8.5286C9.06739 8.78895 9.06739 9.21105 8.79782 9.4714L1 17" stroke="currentColor" strokeLinecap="round"/>
            </svg>
        </a>
    );
};

export default ActionButton;




