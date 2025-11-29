import React from 'react';

interface TicketButtonProps {
    text: string;
    href: string;
    style?: "primary" | "secondary";
    textClassName?: string;
    leftWidth?: number;
    rightWidth?: number;
    className?: string;
}

const TicketButton: React.FC<TicketButtonProps> = ({
    text,
    href,
    style = "primary",
    textClassName = '',
    rightWidth = 58,
    className = '',
}) => {
    const height = 58;
    const r = 4.63; // Radius for corners
    const k = r * 0.55228; // Bezier handle offset

    const leftWidth = Math.max(128, text.length * 9 + 50);
    const totalWidth = leftWidth + rightWidth;

    const textColor = style === "primary" ? "#19263D" : "white";
    const borderColor = "white";
    const fillColor = style === "primary" ? "white" : "#19263D";


    // Helper to format numbers to avoid long decimals
    const f = (n: number) => n.toFixed(3).replace(/\.?0+$/, '');

    // Generate the path command
    // Start Bottom-Right of the whole shape
    // Move to (W, H-r)
    let d = `M${f(totalWidth)} ${f(height - r)}`;

    // Line up right edge
    d += `V${f(r)}`;

    // Top-Right Corner (Concave) -> Curves IN towards (W-r, 0)
    // C cp1x cp1y cp2x cp2y x y
    // Start (W, r). End (W-r, 0).
    // CP1 (W-k, r). CP2 (W-r, k) ?? No, this is convex.
    // Concave corner:
    // Start (W, r). Target (W-r, 0).
    // It goes "in". 
    // The original path: M186 53.37 V4.63 C183.483 4.63 181.421 2.54 181.421 0
    // Start (186, 4.63). End (181.42, 0).
    // CP1 (186 - (186-183.48), 4.63) = (186 - 2.52, 4.63). 2.52 is roughly r*0.55.
    // So CP1 is (W - k, r).
    // CP2 is (W - r, k).
    // Wait, 181.421 is W-r. 2.54 is roughly k.
    // So: C (W-k) r (W-r) k (W-r) 0.
    d += `C${f(totalWidth - k)} ${f(r)} ${f(totalWidth - r)} ${f(k)} ${f(totalWidth - r)} 0`;

    // Top edge: Line to notch start
    // Notch is at `leftWidth`. Spans `leftWidth - r` to `leftWidth + r`.
    // Line to `leftWidth + r`
    d += `H${f(leftWidth + r)}`;

    // Notch (Top): Down and Up.
    // It's two concave corners meeting at (leftWidth, r).
    // First part: From (leftWidth + r, 0) to (leftWidth, r).
    // CP1 (leftWidth + r, k). CP2 (leftWidth + k, r).
    d += `C${f(leftWidth + r)} ${f(k)} ${f(leftWidth + k)} ${f(r)} ${f(leftWidth)} ${f(r)}`;

    // Second part: From (leftWidth, r) to (leftWidth - r, 0).
    // CP1 (leftWidth - k, r). CP2 (leftWidth - r, k).
    d += `C${f(leftWidth - k)} ${f(r)} ${f(leftWidth - r)} ${f(k)} ${f(leftWidth - r)} 0`;

    // Line to Top-Left corner start (r, 0)
    d += `H${f(r)}`;

    // Top-Left Corner (Concave)
    // From (r, 0) to (0, r)
    // CP1 (r, k). CP2 (k, r).
    d += `C${f(r)} ${f(k)} ${f(k)} ${f(r)} 0 ${f(r)}`;

    // Left Edge
    d += `V${f(height - r)}`;

    // Bottom-Left Corner (Concave)
    // From (0, H-r) to (r, H)
    // CP1 (k, H-r). CP2 (r, H-k).
    d += `C${f(k)} ${f(height - r)} ${f(r)} ${f(height - k)} ${f(r)} ${f(height)}`;

    // Bottom Edge to Notch
    d += `H${f(leftWidth - r)}`;

    // Notch (Bottom): Up and Down.
    // From (leftWidth - r, H) to (leftWidth, H-r).
    // CP1 (leftWidth - r, H-k). CP2 (leftWidth - k, H-r).
    d += `C${f(leftWidth - r)} ${f(height - k)} ${f(leftWidth - k)} ${f(height - r)} ${f(leftWidth)} ${f(height - r)}`;

    // From (leftWidth, H-r) to (leftWidth + r, H).
    // CP1 (leftWidth + k, H-r). CP2 (leftWidth + r, H-k).
    d += `C${f(leftWidth + k)} ${f(height - r)} ${f(leftWidth + r)} ${f(height - k)} ${f(leftWidth + r)} ${f(height)}`;

    // Line to Bottom-Right corner start
    d += `H${f(totalWidth - r)}`;

    // Bottom-Right Corner
    // From (totalWidth - r, H) to (totalWidth, H-r)
    // CP1 (totalWidth - r, H-k). CP2 (totalWidth - k, H-r).
    d += `C${f(totalWidth - r)} ${f(height - k)} ${f(totalWidth - k)} ${f(height - r)} ${f(totalWidth)} ${f(height - r)}`;

    d += 'Z';

    return (
        <a
            className={`relative flex justify-between items-center font-workSans ${className} group`}
            style={{ width: totalWidth, height }}
            href={href}
        >
            {/* Border SVG (Background) */}
            {borderColor && (
                <svg
                    className={`ticket-border-svg absolute left-0 top-0 overflow-visible transition-opacity duration-300`}
                    width={totalWidth}
                    height={height}
                    viewBox={`0 0 ${totalWidth} ${height}`}
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d={d} stroke={borderColor} strokeWidth="3" className="tickets-border-path" />
                </svg>
            )}

            {/* Main SVG (Foreground) */}
            <svg
                className="absolute left-0 top-0 tickets-svg"
                width={totalWidth}
                height={height}
                viewBox={`0 0 ${totalWidth} ${height}`}
                fill={fillColor}
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d={d} className="transition-colors duration-300" fill={fillColor} />
            </svg>

            {/* Left Content (Link) */}
            <div
                className={`flex justify-center items-center z-10 text-base px-2 h-[48px] absolute top-[5px] left-[4px] ${textClassName}`}
                style={{
                    color: textColor,
                    width: leftWidth
                }}
            >
                {text}
            </div>


            {/* Right Content (SVG Icon) */}
            <div
                className="flex justify-center items-center z-10 px-2 h-[48px] absolute top-[5px] border-l border-dashed "
                style={{
                    color: textColor,
                    width: rightWidth,
                    left: leftWidth,
                    borderColor: textColor
                }}
            >
                <svg className="group-hover:-rotate-45 transition-all duration-200" width="24" height="22" viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.9184 17.9144L22.3189 10.5721L14.7844 10.5915C17.5261 10.5843 18.9093 13.8942 16.9778 15.8399L14.9184 17.9144Z" fill={textColor} />
                    <path d="M22.3189 10.5721L17.3853 5.67714L14.9184 3.22968L16.9739 5.28382C18.9305 7.23919 17.5506 10.5843 14.7844 10.5915L22.3189 10.5721Z" fill={textColor} />
                    <path d="M0.78125 10.5721L14.7844 10.5915M22.3189 10.5721L17.3852 5.67714L14.9184 3.22968M22.3189 10.5721L14.9184 17.9144M22.3189 10.5721L14.7844 10.5915M12.4516 0.782227L14.9184 3.22968M12.4516 20.3619L14.9184 17.9144M14.9184 3.22968L16.9739 5.28382C18.9305 7.23919 17.5506 10.5843 14.7844 10.5915M14.9184 17.9144L16.9778 15.8399C18.9093 13.8942 17.5261 10.5843 14.7844 10.5915" stroke={textColor} strokeWidth="1.56423" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </a>
    );
};

export default TicketButton;

