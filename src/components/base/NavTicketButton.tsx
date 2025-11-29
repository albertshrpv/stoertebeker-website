import React from 'react';

interface NavTicketButtonProps {
    text: string;
    hrefLeft?: string;
    onClickLeft?: () => void;
    onClickRight?: () => void;
    textColor?: string;
    backgroundColor?: string;
    borderColor?: string;
    isMenuOpen?: boolean;
    className?: string;
    buttonId?: string;
}

const NavTicketButton: React.FC<NavTicketButtonProps> = ({
    text,
    hrefLeft,
    onClickLeft,
    onClickRight,
    textColor = 'black',
    backgroundColor = 'white',
    borderColor = 'white',
    isMenuOpen = false,
    className = '',
    buttonId,
}) => {
    // Configuration for the shape
    const radius = 6; // Radius of the concave corner
    const borderWidth = 2; // Width of the "border" (gap between base and top layer)

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

    const LeftComponent = hrefLeft ? 'a' : 'button';

    return (
        <div className={`relative ${className} h-[58px]`} style={{ isolation: 'isolate' }}>
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
                <LeftComponent
                    href={hrefLeft}
                    onClick={onClickLeft}
                    type={hrefLeft ? undefined : "button"}
                    className="flex-grow h-full flex items-center pl-6 pr-4 z-20 whitespace-nowrap"
                    style={{ color: textColor }}
                >
                    <span className="text-base font-medium font-jakarta">{text}</span>
                </LeftComponent>

                {/* Separator */}
                <div
                    className="h-3/5 w-px border-l border-dashed opacity-40"
                    style={{ borderColor: textColor }}
                ></div>

                {/* Right Part (Icon/Menu) */}
                <button
                    id={buttonId}
                    onClick={onClickRight}
                    className="w-[58px] h-full flex items-center justify-center flex-shrink-0 z-20"
                    aria-label="Toggle Menu"
                    style={{ color: textColor }}
                >
                    {/* Use the existing hamburger logic for the nav */}
                    <div className="flex flex-col gap-1.5 items-center justify-center w-6">
                        <span
                            className="w-full h-0.5 transition-all duration-300 origin-center"
                            style={{
                                backgroundColor: textColor,
                                transform: isMenuOpen ? "translateY(8px) rotate(45deg)" : "none"
                            }}
                        ></span>
                        <span
                            className="w-full h-0.5 transition-all duration-300 origin-center"
                            style={{
                                backgroundColor: textColor,
                                opacity: isMenuOpen ? 0 : 1
                            }}
                        ></span>
                        <span
                            className="w-full h-0.5 transition-all duration-300 origin-center"
                            style={{
                                backgroundColor: textColor,
                                transform: isMenuOpen ? "translateY(-8px) rotate(-45deg)" : "none"
                            }}
                        ></span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default NavTicketButton;
