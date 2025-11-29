import React from 'react';

interface TicketActionButtonProps {
    text: string;
    href?: string;
    textColor?: string;
    backgroundColor?: string;
    borderColor?: string;
    className?: string;
}

const TicketActionButton: React.FC<TicketActionButtonProps> = ({
    text,
    href,
    textColor = 'black',
    backgroundColor = 'white',
    borderColor = 'white',
    className = '',
}) => {
    // Configuration for the shape
    const radius = 6; // Radius of the concave corner
    const borderWidth = 1.5; // Width of the "border" (gap between base and top layer)

    // Mask generator for the concave corners
    // We use radial-gradient to cut out the corners.
    // For an inset element, we need to adjust the mask so the curve stays parallel.
    // offset: shifts the center of the circle to account for the inset.
    // r: radius of the cutout circle.
    const getMaskStyle = (r: number, offset: number = 0) => {
        // The circle center is at (0,0) for top-left.
        // If we are inside an element that is inset by `offset`, its (0,0) is at (offset, offset) relative to parent.
        // To keep the circle center at the parent's (0,0), we need to move the gradient center to (-offset, -offset).
        const p = -offset; 
        const px = `${p}px`;
        
        return {
            maskImage: `
                radial-gradient(circle ${r}px at ${px} ${px}, transparent ${r}px, black ${r + 0.5}px),
                radial-gradient(circle ${r}px at calc(100% - ${px}) ${px}, transparent ${r}px, black ${r + 0.5}px),
                radial-gradient(circle ${r}px at ${px} calc(100% - ${px}), transparent ${r}px, black ${r + 0.5}px),
                radial-gradient(circle ${r}px at calc(100% - ${px}) calc(100% - ${px}), transparent ${r}px, black ${r + 0.5}px)
            `,
            WebkitMaskImage: `
                radial-gradient(circle ${r}px at ${px} ${px}, transparent ${r}px, black ${r + 0.5}px),
                radial-gradient(circle ${r}px at calc(100% - ${px}) ${px}, transparent ${r}px, black ${r + 0.5}px),
                radial-gradient(circle ${r}px at ${px} calc(100% - ${px}), transparent ${r}px, black ${r + 0.5}px),
                radial-gradient(circle ${r}px at calc(100% - ${px}) calc(100% - ${px}), transparent ${r}px, black ${r + 0.5}px)
            `,
            maskPosition: 'top left, top right, bottom left, bottom right',
            WebkitMaskPosition: 'top left, top right, bottom left, bottom right',
            maskSize: '51% 51%',
            WebkitMaskSize: '51% 51%',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
        };
    };

    const Component = href ? 'a' : 'button';

    return (
        <Component 
            href={href}
            type={href ? undefined : 'button'}
            className={`relative ${className} h-[58px] block group`} 
            style={{ isolation: 'isolate' }}
        >
            {/* Base Layer (The Border Color) */}
            <div 
                className="absolute inset-0 w-full h-full z-0"
                style={{
                    backgroundColor: borderColor,
                    ...getMaskStyle(radius)
                }}
            />

            {/* Top Layer (The Background Color) - Inset to create border effect */}
            <div 
                className="absolute z-10 flex items-center justify-between"
                style={{
                    backgroundColor: backgroundColor,
                    top: borderWidth,
                    bottom: borderWidth,
                    left: borderWidth,
                    right: borderWidth,
                    // The radius of the inner cutout must be larger to maintain constant width.
                    // Inner R = Outer R + Border Width
                    ...getMaskStyle(radius + borderWidth, borderWidth)
                }}
            >
                {/* Left Part (Text) */}
                <div 
                    className="flex-grow h-full flex items-center pl-6 pr-4 z-20 whitespace-nowrap"
                    style={{ color: textColor }}
                >
                    <span className="text-base font-medium font-jakarta">{text}</span>
                </div>

                {/* Separator */}
                <div 
                    className="h-3/5 w-px border-l border-dashed opacity-40" 
                    style={{ borderColor: textColor }}
                ></div>

                {/* Right Part (Icon) */}
                <div 
                    className="w-[58px] h-full flex items-center justify-center flex-shrink-0 z-20"
                    style={{ color: textColor }}
                >
                    <svg width="24" height="22" viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.9184 17.9144L22.3189 10.5721L14.7844 10.5915C17.5261 10.5843 18.9093 13.8942 16.9778 15.8399L14.9184 17.9144Z" fill={textColor}/>
                        <path d="M22.3189 10.5721L17.3853 5.67714L14.9184 3.22968L16.9739 5.28382C18.9305 7.23919 17.5506 10.5843 14.7844 10.5915L22.3189 10.5721Z" fill={textColor}/>
                        <path d="M0.78125 10.5721L14.7844 10.5915M22.3189 10.5721L17.3852 5.67714L14.9184 3.22968M22.3189 10.5721L14.9184 17.9144M22.3189 10.5721L14.7844 10.5915M12.4516 0.782227L14.9184 3.22968M12.4516 20.3619L14.9184 17.9144M14.9184 3.22968L16.9739 5.28382C18.9305 7.23919 17.5506 10.5843 14.7844 10.5915M14.9184 17.9144L16.9778 15.8399C18.9093 13.8942 17.5261 10.5843 14.7844 10.5915" stroke={textColor} strokeWidth="1.56423" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>
        </Component>
    );
};

export default TicketActionButton;
