import React from 'react';

interface CornerBorderedContainerProps {
    children: React.ReactNode;
    /**
     * Radius for the corner circles in rem units (e.g., 1.5 for 24px)
     * This determines both the size of the circles (radius * 2) and their positioning
     */
    radius?: number;
    /**
     * Padding classes (e.g., "p-12 lg:p-10 xl:p-16")
     */
    padding?: string;
    /**
     * Additional classes for the outer container wrapper
     */
    className?: string;
    /**
     * Additional classes for the inner bordered div (useful for flex layouts)
     */
    innerClassName?: string;
    /**
     * Border color class (default: "border-black")
     */
    borderColor?: string;
    /**
     * Background color for corner circles (default: "bg-white")
     */
    cornerBgColor?: string;
}

export default function CornerBorderedContainer({
    children,
    radius = 1.5, // 1.5rem = 24px (equivalent to Tailwind's -top-6)
    padding = "p-12 lg:p-10 xl:p-16",
    className = "",
    innerClassName = "",
    borderColor = "border-black",
    cornerBgColor = "bg-white"
}: CornerBorderedContainerProps) {
    // Calculate circle size from radius (radius * 2)
    const circleSizeRem = radius * 2;
    // Convert to pixels for inline styles (1rem = 16px)
    const circleSizePx = circleSizeRem * 16;
    const offsetPx = radius * 16;

    const cornerStyle: React.CSSProperties = {
        width: `${circleSizePx}px`,
        height: `${circleSizePx}px`,
    };

    return (
        <div className={`relative w-full overflow-clip ${className}`}>
            <div className={`relative w-full ${padding} border-[2px] ${borderColor} ${innerClassName}`}>
                {children}
                {/* Top-left corner */}
                <div 
                    className={`absolute rounded-full z-10 border-[2px] ${cornerBgColor} ${borderColor}`}
                    style={{
                        ...cornerStyle,
                        top: `-${offsetPx}px`,
                        left: `-${offsetPx}px`,
                    }}
                ></div>
                {/* Bottom-right corner */}
                <div 
                    className={`absolute rounded-full z-10 border-[2px] ${cornerBgColor} ${borderColor}`}
                    style={{
                        ...cornerStyle,
                        bottom: `-${offsetPx}px`,
                        right: `-${offsetPx}px`,
                    }}
                ></div>
                {/* Top-right corner */}
                <div 
                    className={`absolute rounded-full z-10 border-[2px] ${cornerBgColor} ${borderColor}`}
                    style={{
                        ...cornerStyle,
                        top: `-${offsetPx}px`,
                        right: `-${offsetPx}px`,
                    }}
                ></div>
                {/* Bottom-left corner */}
                <div 
                    className={`absolute rounded-full z-10 border-[2px] ${cornerBgColor} ${borderColor}`}
                    style={{
                        ...cornerStyle,
                        bottom: `-${offsetPx}px`,
                        left: `-${offsetPx}px`,
                    }}
                ></div>
            </div>
        </div>
    );
}

