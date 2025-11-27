import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useBooking } from '../contexts/BookingContext';
import type { CompleteSeatGroup } from '../types/pricing';

export interface SeatInfo {
    id: string;
    type: "normal" | "wheelchair" | "wheelchair_side" | "wheelchair_accompaniment";
    seat_number: string;
    seat_row: string | number;
    seat_row_number: number;
    linked_seat_number?: string;
    cx: number; // Center X for positioning and hit detection
    cy: number; // Center Y for positioning and hit detection
    pathData: string; // SVG path data
    bounds: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    seatGroupId?: string; // Associated seat group ID
    color: string; // Color from seat group
    displayName: string; // Human-readable name (e.g., "Reihe 1, Platz 5")
}

export interface LegendInfo {
    id: string;
    elementType: "path" | "rect";
    pathData?: string; // For path elements
    rectData?: { x: number; y: number; width: number; height: number }; // For rect elements
    transform?: { type: 'rotate'; angle: number; cx: number; cy: number }; // Transform information
    bounds: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    fill?: string; // Fill color for legend paths
    strokeWidth?: number; // Stroke width for legend paths
}

export interface SeatPlanEditorProps {
    svgContent: string;
    seatGroups: CompleteSeatGroup[];
    selectedSeats: string[];
    blockedSeats?: string[];
    isWheelchairMode?: boolean;
    isVideoPlaying?: boolean;
    onSeatClick: (seatId: string, seatGroup: CompleteSeatGroup, seatInfo: SeatInfo) => void;
    onSeatDeselect: (seatId: string, seatInfo?: SeatInfo) => void;
    onSeatsLoaded?: (seats: SeatInfo[]) => void; // New callback for when seats are parsed
    onWheelchairModeToggle?: () => void;
    onVideoPlay?: () => void;
    className?: string;
}

export default function SeatPlanViewer({
    svgContent,
    seatGroups,
    selectedSeats,
    blockedSeats = [],
    isWheelchairMode = false,
    isVideoPlaying = false,
    onSeatClick,
    onSeatDeselect,
    onSeatsLoaded,
    onWheelchairModeToggle,
    onVideoPlay,
    className = '',
}: SeatPlanEditorProps) {
    // Available utility functions for external access (via ref or callback):
    // - getSeatByRowAndNumber(row: number, seatNumber: number): SeatInfo | null
    // - getSeatsByRow(row: number): SeatInfo[]
    // - getRowInfo(): Array<{rowNumber: number, seatCount: number, seats: SeatInfo[]}>

    const { state, dispatch } = useBooking();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const seatsRef = useRef<SeatInfo[]>([]);
    const legendsRef = useRef<LegendInfo[]>([]);
    const [scale, setScale] = useState(0.8);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [lastOffset, setLastOffset] = useState({ x: 0, y: 0 });
    const [hasDragged, setHasDragged] = useState(false);
    const [cursorStyle, setCursorStyle] = useState<'default' | 'pointer'>('default');
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionRect, setSelectionRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
    const [hasSelected, setHasSelected] = useState(false);
    const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
    const [hoveredSeatInfo, setHoveredSeatInfo] = useState<SeatInfo | null>(null);
    const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isZooming, setIsZooming] = useState(false);
    const [showZoomPrompt, setShowZoomPrompt] = useState(!state.hasSeatPlanInteracted);
    const [infoBoxMovedDown, setInfoBoxMovedDown] = useState(false);
    const pathCacheRef = useRef<Map<string, Path2D>>(new Map());
    const DRAG_THRESHOLD = 5; // px
    const selectionColor = '#5c9b71'; // Green color for selections
    const selectionAccentColor = '#3e6f54'; // Darker green for strokes and checkmark
    const blockedSeatColor = '#D1D5DB';
    const wheelchairModeGrayColor = '#D1D5DB'; // Light gray for non-wheelchair seats in wheelchair mode
    const strokeColor = '#19263D';
    const hoverColor = '#19263D';
    
    // Touch + pinch refs/state (to support tablets with touch input)
    const [isPinching, setIsPinching] = useState(false);
    const scaleRef = useRef(scale);
    const offsetRef = useRef(offset);
    const pinchStartDistanceRef = useRef<number | null>(null);
    const pinchStartScaleRef = useRef<number>(1);
    const pinchStartWorldRef = useRef<{ x: number; y: number } | null>(null);
    const pinchMinScaleRef = useRef<number>(0.8);
    const touchStartTimeRef = useRef<number>(0);
    const isPinchingRef = useRef<boolean>(false);
    const pinchEndedAtRef = useRef<number>(0);
    const initialFitScaleRef = useRef<number>(0.8); // Store the initial fit scale for minimum zoom limit

    // Get all seat IDs from reserved seat groups to treat them as blocked
    const getReservedSeatIds = useCallback((seatGroups: CompleteSeatGroup[]): string[] => {
        const reservedSeatIds: string[] = [];
        seatGroups.forEach(group => {
            if (group.reservation_active && group.reserved_seats.length > 0) {
                group.reserved_seats.forEach(seatNumber => {
                    reservedSeatIds.push(seatNumber);
                });
            }
        });
        
        return reservedSeatIds;
    }, []);

    // Define wheelchair row segments for adjacent seat blocking
    const getWheelchairSegment = useCallback((rowNumber: number): number => {
        if (rowNumber >= 1 && rowNumber <= 10) return 1;
        if (rowNumber >= 11 && rowNumber <= 25) return 2;
        if (rowNumber >= 26 && rowNumber <= 40) return 3;
        if (rowNumber >= 41 && rowNumber <= 55) return 4;
        if (rowNumber >= 56 && rowNumber <= 68) return 5;
        if (rowNumber >= 69 && rowNumber <= 83) return 6;
        return 0; // Unknown segment
    }, []);

    // Combine original blocked seats with auto-blocked seats based on linking and adjacency rules
    const allBlockedSeats = useMemo(() => {
        const reservedSeatIds = getReservedSeatIds(seatGroups);
        const baseBlockedSeats = [...blockedSeats, ...reservedSeatIds];
        const autoBlockedSeats = new Set<string>();

        // 1. GENERALIZED LINKED SEAT BLOCKING
        // Auto-block seats whose linked seat is blocked
        seatsRef.current.forEach(seat => {
            if (seat.linked_seat_number && baseBlockedSeats.includes(seat.linked_seat_number)) {
                autoBlockedSeats.add(seat.id);
            }
        });

        // 2. ADJACENT WHEELCHAIR SEAT BLOCKING (only for normal wheelchair seats)
        // Must maintain 2-row spacing between wheelchair seats, so block ±1 and ±2 rows
        // Only process wheelchair seats that are actually reserved/booked (baseBlockedSeats) or selected by users
        // Do NOT include wheelchair seats that are auto-blocked due to linked seat unavailability
        const actuallyReservedNormalWheelchairSeats = seatsRef.current.filter(seat =>
            seat.type === 'wheelchair' && baseBlockedSeats.includes(seat.id)
        );
        
        const selectedNormalWheelchairSeats = seatsRef.current.filter(seat =>
            seat.type === 'wheelchair' && selectedSeats.includes(seat.id)
        );

        const allNormalWheelchairSeatsToProcess = [...actuallyReservedNormalWheelchairSeats, ...selectedNormalWheelchairSeats];

        // Block adjacent normal wheelchair seats (±1 and ±2 rows before and after)
        allNormalWheelchairSeatsToProcess.forEach(wheelchairSeat => {
            const targetRow = typeof wheelchairSeat.seat_row === 'number' ? wheelchairSeat.seat_row : 0;
            const targetSegment = getWheelchairSegment(targetRow);

            // Find adjacent rows (±1 and ±2)
            const adjacentRows = [targetRow - 2, targetRow - 1, targetRow + 1, targetRow + 2];
            
            adjacentRows.forEach(adjacentRow => {
                const adjacentSegment = getWheelchairSegment(adjacentRow);
                
                // Only block if in the same segment
                if (adjacentSegment === targetSegment && adjacentSegment > 0) {
                    // Find normal wheelchair seats in this adjacent row with same seat_row_number
                    const adjacentWheelchairSeats = seatsRef.current.filter(seat =>
                        seat.type === 'wheelchair' &&
                        seat.seat_row === adjacentRow &&
                        seat.seat_row_number === wheelchairSeat.seat_row_number &&
                        !baseBlockedSeats.includes(seat.id) &&
                        !selectedSeats.includes(seat.id)
                    );

                    adjacentWheelchairSeats.forEach(adjacentSeat => {
                        autoBlockedSeats.add(adjacentSeat.id);
                    });
                }
            });
        });

        // 3. MAXIMUM WHEELCHAIR SEAT LIMITATION (15 max)
        // Only count actually reserved/booked seats and user-selected seats, NOT adjacency-blocked seats
        const totalNormalWheelchairSeats = seatsRef.current.filter(seat => seat.type === 'wheelchair');
        const actuallyReservedOrSelectedWheelchairCount = totalNormalWheelchairSeats.filter(seat =>
            baseBlockedSeats.includes(seat.id) || selectedSeats.includes(seat.id)
        ).length;

        // If we have 15 or more actually reserved/selected wheelchair seats, block all remaining normal wheelchair seats
        if (actuallyReservedOrSelectedWheelchairCount >= 15) {
            totalNormalWheelchairSeats.forEach(seat => {
                if (!baseBlockedSeats.includes(seat.id) && !selectedSeats.includes(seat.id)) {
                    autoBlockedSeats.add(seat.id);
                }
            });
        }

        return [...baseBlockedSeats, ...Array.from(autoBlockedSeats)];
    }, [blockedSeats, seatGroups, getReservedSeatIds, selectedSeats, getWheelchairSegment]);

    // Parse seats from SVG using pre-enriched attributes and map to seat groups
    const parseSvgSeats = useCallback((svgContent: string, seatGroups: CompleteSeatGroup[]): SeatInfo[] => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');
        // Select both path and rect elements, but exclude legend elements
        const seatElements = doc.querySelectorAll('path[id]:not([type="legend"]), rect[id]:not([type="legend"])');

        // Create a map of seat number to seat group for faster lookup
        const seatGroupMap = new Map<string, CompleteSeatGroup>();
        seatGroups.forEach(group => {
            group.seats.forEach(seat => {
                seatGroupMap.set(seat.seat_number, group);
            });
        });

        // Convert to array and extract information from attributes
        const seats: SeatInfo[] = Array.from(seatElements).map(element => {
            const pathData = element.getAttribute('d') || '';
            const idAttr = element.getAttribute('id') || '';
            const seatNumberAttr = element.getAttribute('seat_number') || idAttr;
            const seatRowAttr = element.getAttribute('seat_row');
            const seatRowNumberAttr = element.getAttribute('seat_row_number');
            const typeAttr = element.getAttribute('type') || 'normal';
            const linkedSeatIdAttr = element.getAttribute('linked_seat_number');
            

            // Extract bounding box and center coordinates
            let bounds;
            if (element.tagName.toLowerCase() === 'path') {
                bounds = extractBoundsFromPath(pathData);
            } else if (element.tagName.toLowerCase() === 'rect') {
                const x = parseFloat(element.getAttribute('x') || '0');
                const y = parseFloat(element.getAttribute('y') || '0');
                const width = parseFloat(element.getAttribute('width') || '10');
                const height = parseFloat(element.getAttribute('height') || '10');
                bounds = { minX: x, minY: y, maxX: x + width, maxY: y + height };
            } else {
                bounds = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
            }

            const seatGroup = seatGroupMap.get(seatNumberAttr);
            let seat_row: string | number = 0;
            const seat_row_number = seatRowNumberAttr ? parseInt(seatRowNumberAttr, 10) : 0;
            let displayName = "";
            let type: "normal" | "wheelchair" | "wheelchair_side" | "wheelchair_accompaniment" = "normal";

            // Determine seat type and display name based on type attribute and seat_row
            switch (typeAttr) {
                case 'wheelchair':
                    type = "wheelchair";
                    if (seatRowAttr) {
                        // For wheelchair seats positioned by rows
                        seat_row = parseInt(seatRowAttr, 10) || 0;
                        displayName = `Rollstuhlplatz Reihe ${seat_row}, Platz ${seat_row_number}`;
                    } else {
                        seat_row = seatRowAttr || 'wheelchair';
                        displayName = `Rollstuhlplatz ${seat_row_number}`;
                    }
                    break;
                case 'wheelchair_side':
                    type = "wheelchair_side";
                    seat_row = seatRowAttr || 'wheelchair_side';
                    displayName = `Rollstuhlplatz ${seat_row_number}`;
                    break;
                case 'wheelchair_accompaniment':
                    type = "wheelchair_accompaniment";
                    seat_row = seatRowAttr || 'wheelchair_accompaniment';
                    displayName = `Rollstuhlbegleitung ${seat_row_number}`;
                    break;
                default:
                    type = "normal";
                    seat_row = seatRowAttr ? parseInt(seatRowAttr, 10) : 0;
                    displayName = `Reihe ${seat_row}, Platz ${seat_row_number}`;
                    break;
            }



            let linked_seat_number: string | undefined = undefined;
            if (linkedSeatIdAttr) {
                linked_seat_number = linkedSeatIdAttr;
            }

            return {
                id: seatNumberAttr,
                seat_number: seatNumberAttr,
                seat_row,
                seat_row_number,
                linked_seat_number,
                cx: (bounds.minX + bounds.maxX) / 2,
                cy: (bounds.minY + bounds.maxY) / 2,
                pathData,
                bounds,
                seatGroupId: seatGroup?.id,
                color: seatGroup?.color || '#f3f4f6',
                displayName: displayName,
                type: type
            };
        });

        return seats;
    }, []);

    // Parse legend elements from SVG
    const parseSvgLegends = useCallback((svgContent: string): LegendInfo[] => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');
        // Select only legend elements (both path and rect)
        const legendElements = doc.querySelectorAll('path[type="legend"], rect[type="legend"]');

        const legends: LegendInfo[] = Array.from(legendElements).map(element => {
            const idAttr = element.getAttribute('id') || '';
            const elementType = element.tagName.toLowerCase() as "path" | "rect";
            
            let bounds;
            let pathData: string | undefined;
            let rectData: { x: number; y: number; width: number; height: number } | undefined;
            
            if (elementType === 'path') {
                pathData = element.getAttribute('d') || '';
                bounds = extractBoundsFromPath(pathData);
            } else if (elementType === 'rect') {
                const x = parseFloat(element.getAttribute('x') || '0');
                const y = parseFloat(element.getAttribute('y') || '0');
                const width = parseFloat(element.getAttribute('width') || '10');
                const height = parseFloat(element.getAttribute('height') || '10');
                rectData = { x, y, width, height };
                bounds = { minX: x, minY: y, maxX: x + width, maxY: y + height };
            } else {
                bounds = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
            }

            // Get fill color for legend paths (should be "black" after processing)
            const fill = element.getAttribute('fill') || undefined;
            const strokeWidth = elementType === 'path' ? parseFloat(element.getAttribute('stroke-width') || '0.17') : 0.8;

            // Parse transform attribute (looking for rotate transforms)
            let transform: { type: 'rotate'; angle: number; cx: number; cy: number } | undefined;
            const transformAttr = element.getAttribute('transform');
            if (transformAttr) {
                const rotateMatch = transformAttr.match(/rotate\(([^)]+)\)/);
                if (rotateMatch) {
                    const params = rotateMatch[1].split(/\s+/).map(parseFloat);
                    if (params.length >= 3) {
                        transform = {
                            type: 'rotate',
                            angle: params[0],
                            cx: params[1],
                            cy: params[2]
                        };
                    }
                }
            }

            return {
                id: idAttr,
                elementType,
                pathData,
                rectData,
                transform,
                bounds,
                fill,
                strokeWidth
            };
        });

        return legends;
    }, []);

    // Helper function to extract bounding box from path data
    const extractBoundsFromPath = (pathData: string): { minX: number, minY: number, maxX: number, maxY: number } => {
        // Parse the path data to find the bounding box
        const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/g) || [];

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let currentX = 0, currentY = 0;

        commands.forEach(command => {
            const type = command[0];
            const coords = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

            switch (type) {
                case 'M': // Move to (absolute)
                    if (coords.length >= 2) {
                        currentX = coords[0];
                        currentY = coords[1];
                        minX = Math.min(minX, currentX);
                        minY = Math.min(minY, currentY);
                        maxX = Math.max(maxX, currentX);
                        maxY = Math.max(maxY, currentY);
                    }
                    break;
                case 'L': // Line to (absolute)
                    if (coords.length >= 2) {
                        currentX = coords[0];
                        currentY = coords[1];
                        minX = Math.min(minX, currentX);
                        minY = Math.min(minY, currentY);
                        maxX = Math.max(maxX, currentX);
                        maxY = Math.max(maxY, currentY);
                    }
                    break;
                case 'H': // Horizontal line (absolute)
                    if (coords.length >= 1) {
                        currentX = coords[0];
                        minX = Math.min(minX, currentX);
                        maxX = Math.max(maxX, currentX);
                    }
                    break;
                case 'V': // Vertical line (absolute)
                    if (coords.length >= 1) {
                        currentY = coords[0];
                        minY = Math.min(minY, currentY);
                        maxY = Math.max(maxY, currentY);
                    }
                    break;
                case 'C': // Cubic Bezier curve (absolute)
                    if (coords.length >= 6) {
                        // Add control points and end point to bounds
                        for (let i = 0; i < coords.length; i += 2) {
                            if (i + 1 < coords.length) {
                                minX = Math.min(minX, coords[i]);
                                maxX = Math.max(maxX, coords[i]);
                                minY = Math.min(minY, coords[i + 1]);
                                maxY = Math.max(maxY, coords[i + 1]);
                            }
                        }
                        currentX = coords[coords.length - 2];
                        currentY = coords[coords.length - 1];
                    }
                    break;
                case 'Z': // Close path
                    // No coordinates to update
                    break;
                default:
                    // For other commands, try to extract coordinates
                    for (let i = 0; i < coords.length; i += 2) {
                        if (i + 1 < coords.length) {
                            minX = Math.min(minX, coords[i]);
                            maxX = Math.max(maxX, coords[i]);
                            minY = Math.min(minY, coords[i + 1]);
                            maxY = Math.max(maxY, coords[i + 1]);
                        }
                    }
                    if (coords.length >= 2) {
                        currentX = coords[coords.length - 2];
                        currentY = coords[coords.length - 1];
                    }
                    break;
            }
        });

        // Ensure valid bounds
        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
            return { minX: 0, minY: 0, maxX: 10, maxY: 10 };
        }

        return { minX, minY, maxX, maxY };
    };

    // Get cached path or create new one
    const getCachedPath = useCallback((pathData: string): Path2D => {
        if (!pathCacheRef.current.has(pathData)) {
            pathCacheRef.current.set(pathData, new Path2D(pathData));
        }
        return pathCacheRef.current.get(pathData)!;
    }, []);

    // Draw all seats directly (no pre-render), batching by color
    const drawSeats = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        const startTime = performance.now();

        // Clear canvas
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ECEAE6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Save context state
        ctx.save();

        // Apply transformations
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);

        // Draw non-blocked seats by color with wheelchair mode logic
        const colorBuckets = new Map<string, SeatInfo[]>();
        for (const seat of seatsRef.current) {
            if (allBlockedSeats.includes(seat.id)) continue;
            
            // Skip wheelchair and wheelchair_accompaniment seats when not in wheelchair mode
            if (!isWheelchairMode && (seat.type === 'wheelchair' || seat.type === 'wheelchair_side' || seat.type === 'wheelchair_accompaniment')) {
                continue;
            }
            
            let color: string;
            if (isWheelchairMode) {
                // In wheelchair mode: wheelchair seats get their group color or default type color, normal seats keep their group color
                if (seat.type === 'wheelchair' || seat.type === 'wheelchair_side' || seat.type === 'wheelchair_accompaniment') {
                    color = seat.color;
                } else {
                    color = seat.color;
                }
            } else {
                // Normal mode: seats get their group color or default type color
                color = seat.color;
            }
            
            if (!colorBuckets.has(color)) colorBuckets.set(color, []);
            colorBuckets.get(color)!.push(seat);
        }
        colorBuckets.forEach((seats, color) => {
            ctx.fillStyle = color;
            for (const seat of seats) {
                const path = getCachedPath(seat.pathData);
                ctx.fill(path);
            }
        });

        // Draw blocked seats overlay with wheelchair mode logic
        const blockedColorBuckets = new Map<string, SeatInfo[]>();
        for (const seat of seatsRef.current) {
            if (!allBlockedSeats.includes(seat.id)) continue;
            
            // Skip wheelchair and wheelchair_accompaniment seats when not in wheelchair mode
            if (!isWheelchairMode && (seat.type === 'wheelchair' || seat.type === 'wheelchair_side' || seat.type === 'wheelchair_accompaniment')) {
                continue;
            }
            
            let color: string;
            if (isWheelchairMode) {
                // In wheelchair mode: all blocked seats (including wheelchair seats) get light gray since they're not selectable
                color = wheelchairModeGrayColor;
            } else {
                // Normal mode: blocked normal seats get the standard blocked color (wheelchair seats are skipped above)
                color = blockedSeatColor;
            }
            
            if (!blockedColorBuckets.has(color)) blockedColorBuckets.set(color, []);
            blockedColorBuckets.get(color)!.push(seat);
        }
        blockedColorBuckets.forEach((seats, color) => {
            ctx.fillStyle = color;
            for (const seat of seats) {
                const path = getCachedPath(seat.pathData);
                ctx.fill(path);
            }
        });

        // Draw selected seats with stroke and checkmark
        if (selectedSeats.length > 0) {
            for (const seatId of selectedSeats) {
                const seat = seatsRef.current.find(s => s.id === seatId);
                if (!seat) continue;
                
                // Skip wheelchair and wheelchair_accompaniment seats when not in wheelchair mode
                if (!isWheelchairMode && (seat.type === 'wheelchair' || seat.type === 'wheelchair_side' || seat.type === 'wheelchair_accompaniment')) {
                    continue;
                }
                
                const path = getCachedPath(seat.pathData);

                // Fill
                ctx.fillStyle = selectionColor;
                ctx.fill(path);

                // Stroke (darker green)
                ctx.strokeStyle = selectionAccentColor;
                const seatWidth = seat.bounds.maxX - seat.bounds.minX;
                const seatHeight = seat.bounds.maxY - seat.bounds.minY;
                const seatSize = Math.min(seatWidth, seatHeight);
                ctx.lineWidth = Math.max(0.5, seatSize * 0.06);
                ctx.stroke(path);

                // Checkmark (smaller, thinner, centered)
                const cx = (seat.bounds.minX + seat.bounds.maxX) / 2;
                const cy = (seat.bounds.minY + seat.bounds.maxY) / 2;
                const w = seatSize * 0.55; // overall width of the check
                const h = seatSize * 0.45; // overall height of the check
                const startX = cx - w * 0.45;
                const startY = cy + h * 0.05;
                const midX = cx - w * 0.10;
                const midY = cy + h * 0.35;
                const endX = cx + w * 0.50;
                const endY = cy - h * 0.40;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(midX, midY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = selectionAccentColor;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.lineWidth = Math.max(0.5, seatSize * 0.07);
                ctx.stroke();
            }
        }

        // Draw hovered seat (blue with opacity)
        if (hoveredSeat) {
            const seat = seatsRef.current.find(s => s.id === hoveredSeat);
            if (seat) {
                // Skip wheelchair and wheelchair_accompaniment seats when not in wheelchair mode
                if (!isWheelchairMode && (seat.type === 'wheelchair' || seat.type === 'wheelchair_side' || seat.type === 'wheelchair_accompaniment')) {
                    // Don't render hovered wheelchair seats when not in wheelchair mode
                } else {
                    ctx.fillStyle = `${hoverColor}40`;
                    const path = getCachedPath(seat.pathData);
                    ctx.fill(path);
                }
            }
        }

        // Draw selection rectangle if active
        if (selectionRect) {
            ctx.restore(); // Restore to screen coordinates for rectangle
            ctx.save();

            const x1 = Math.min(selectionRect.x1, selectionRect.x2);
            const y1 = Math.min(selectionRect.y1, selectionRect.y2);
            const x2 = Math.max(selectionRect.x1, selectionRect.x2);
            const y2 = Math.max(selectionRect.y1, selectionRect.y2);

            ctx.strokeStyle = selectionColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            ctx.setLineDash([]);
        }

        // Draw legend elements (always visible, not affected by wheelchair mode)
        for (const legend of legendsRef.current) {
            if (legend.elementType === 'path' && legend.pathData) {
                // Legend paths: use black fill or stroke
                ctx.fillStyle = legend.fill || 'black';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = legend.strokeWidth || 0.17; // Match original stroke width
                const path = getCachedPath(legend.pathData);
                if (legend.fill) {
                    ctx.fill(path);
                }
                ctx.stroke(path);
            } else if (legend.elementType === 'rect' && legend.rectData) {
                // Legend rects: handle transforms if present
                ctx.save();
                
                // Apply transform if present
                if (legend.transform && legend.transform.type === 'rotate') {
                    // Translate to rotation center, rotate, then translate back
                    ctx.translate(legend.transform.cx, legend.transform.cy);
                    ctx.rotate((legend.transform.angle * Math.PI) / 180); // Convert degrees to radians
                    ctx.translate(-legend.transform.cx, -legend.transform.cy);
                }
                
                // Legend rects: stroke only, no fill
                ctx.strokeStyle = 'black';
                ctx.lineWidth = legend.strokeWidth || 0.17; // Match original stroke width
                ctx.strokeRect(
                    legend.rectData.x,
                    legend.rectData.y,
                    legend.rectData.width,
                    legend.rectData.height
                );
                
                ctx.restore();
            }
        }

        // Restore context state
        ctx.restore();

        // const endTime = performance.now();
        // const totalSeats = seatsRef.current.length;
        // console.log(`Draw time: ${endTime - startTime}ms, Total seats: ${totalSeats}, Cache size: ${pathCacheRef.current.size}`);
    }, [selectedSeats, allBlockedSeats, hoveredSeat, selectionColor, scale, offset, selectionRect, isWheelchairMode, getCachedPath]);

    // Get seat at point (with zoom/pan compensation)
    const getSeatAtPoint = useCallback((x: number, y: number): string | null => {
        // Convert screen coordinates to canvas coordinates
        const canvasX = (x - offset.x) / scale;
        const canvasY = (y - offset.y) / scale;

        // Find seat under cursor using bounding box detection
        for (const seat of seatsRef.current) {
            // Check if point is within the seat's bounding box
            if (canvasX >= seat.bounds.minX &&
                canvasX <= seat.bounds.maxX &&
                canvasY >= seat.bounds.minY &&
                canvasY <= seat.bounds.maxY) {
                return seat.id;
            }
        }
        return null;
    }, [scale, offset]);

    // Smooth zoom animation
    const animateZoom = useCallback((targetScale: number, targetOffset: { x: number; y: number }, duration: number = 300) => {
        if (isZooming) return; // Prevent multiple animations

        setIsZooming(true);
        const startScale = scale;
        const startOffset = offset;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);

            const currentScale = startScale + (targetScale - startScale) * easeOutQuart;
            let currentOffsetX = startOffset.x + (targetOffset.x - startOffset.x) * easeOutQuart;
            let currentOffsetY = startOffset.y + (targetOffset.y - startOffset.y) * easeOutQuart;

            // Clamp during animation to avoid panning outside content
            const animCanvas = canvasRef.current;
            if (animCanvas) {
                const rect = animCanvas.getBoundingClientRect();
                // Compute content bounds (world coords)
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                if (seatsRef.current.length > 0) {
                    minX = Math.min(minX, ...seatsRef.current.map(seat => seat.bounds.minX));
                    maxX = Math.max(maxX, ...seatsRef.current.map(seat => seat.bounds.maxX));
                    minY = Math.min(minY, ...seatsRef.current.map(seat => seat.bounds.minY));
                    maxY = Math.max(maxY, ...seatsRef.current.map(seat => seat.bounds.maxY));
                }
                if (legendsRef.current.length > 0) {
                    minX = Math.min(minX, ...legendsRef.current.map(legend => legend.bounds.minX));
                    maxX = Math.max(maxX, ...legendsRef.current.map(legend => legend.bounds.maxX));
                    minY = Math.min(minY, ...legendsRef.current.map(legend => legend.bounds.minY));
                    maxY = Math.max(maxY, ...legendsRef.current.map(legend => legend.bounds.maxY));
                }
                if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
                    const paddingX = 0;
                    const paddingTop = 0;
                    const paddingBottom = 50;
                    const overscrollX = 100; // allow a bit of extra panning horizontally
                    const overscrollY = 80;  // and vertically
                    const minOffsetX = (rect.width - paddingX) - maxX * currentScale;
                    const maxOffsetXClamp = paddingX - minX * currentScale;
                    const minOffsetY = (rect.height - paddingBottom) - maxY * currentScale;
                    const maxOffsetYClamp = paddingTop - minY * currentScale;
                    const allowedMinOffsetX = minOffsetX - overscrollX;
                    const allowedMaxOffsetX = maxOffsetXClamp + overscrollX;
                    const allowedMinOffsetY = minOffsetY - overscrollY;
                    const allowedMaxOffsetY = maxOffsetYClamp + overscrollY;
                    currentOffsetX = Math.min(Math.max(currentOffsetX, allowedMinOffsetX), allowedMaxOffsetX);
                    currentOffsetY = Math.min(Math.max(currentOffsetY, allowedMinOffsetY), allowedMaxOffsetY);
                }
            }

            setScale(currentScale);
            setOffset({ x: currentOffsetX, y: currentOffsetY });

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsZooming(false);
            }
        };

        requestAnimationFrame(animate);
    }, [scale, offset, isZooming]);

    // Handle canvas click
    const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (isDragging || hasDragged || isSelecting || hasSelected || isZooming) return; // Don't handle clicks during drag, after drag, during selection, after selection, or during zoom
        // Suppress clicks immediately following a pinch gesture
        if (isPinchingRef.current || (performance.now() - pinchEndedAtRef.current) < 300) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Enhancement: If zoom is less than 200%, smoothly zoom in to 300% centered on click
        if (scale < 2) {
            setShowZoomPrompt(false); // Hide overlay when user clicks to zoom
            dispatch({ type: 'SET_SEAT_PLAN_INTERACTED', payload: true }); // Mark that user has interacted
            const targetScale = 3.5;
            // Calculate new offset so that the clicked point stays under the cursor
            const scaleChange = targetScale / scale;
            const newOffsetX = x - (x - offset.x) * scaleChange;
            const newOffsetY = y - (y - offset.y) * scaleChange;

            animateZoom(targetScale, { x: newOffsetX, y: newOffsetY });
            return;
        }

        // Only allow seat selection at 200% zoom or higher
        const seatId = getSeatAtPoint(x, y);
        if (seatId && !allBlockedSeats.includes(seatId)) {
            const seat = seatsRef.current.find(s => s.id === seatId);
            if (seat) {
                // Skip wheelchair and wheelchair_accompaniment seats when not in wheelchair mode
                if (!isWheelchairMode && (seat.type === 'wheelchair' || seat.type === 'wheelchair_side' || seat.type === 'wheelchair_accompaniment')) {
                    return;
                }
                
                const seatGroup = seatGroups.find(group => group.id === seat.seatGroupId);
                if (seatGroup) {
                    if (selectedSeats.includes(seatId)) {
                        onSeatDeselect(seatId, seat);
                    } else {
                        onSeatClick(seatId, seatGroup, seat);
                    }
                }
            }
        }
    }, [isDragging, hasDragged, isSelecting, hasSelected, isZooming, getSeatAtPoint, selectedSeats, onSeatClick, onSeatDeselect, seatGroups, scale, offset, allBlockedSeats, animateZoom, isWheelchairMode, dispatch]);

    // Handle mouse wheel for zoom (disabled)
    const handleWheel = useCallback((event: WheelEvent) => {
        // Allow normal page scrolling - no zoom functionality
        // No preventDefault() - let the page scroll normally
    }, []);

    // Handle mouse down for panning
    const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (event.ctrlKey) {
            // Start selection rectangle
        } else {
            // Start panning only if scale >= 2 (200% zoom or higher)
            if (scale >= 2) {
                setIsDragging(true);
                setHasDragged(false);
                setDragStart({ x: event.clientX, y: event.clientY });
                setLastOffset(offset);
            }
        }
    }, [offset, scale]);

    // Handle touch start for panning on touch devices
    const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
        // Only handle single touch for panning or tap detection
        if (event.touches.length !== 1) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const touch = event.touches[0];
        touchStartTimeRef.current = performance.now();
        setHasDragged(false);
        // Always record start position to detect swipe vs tap at low zoom
        setDragStart({ x: touch.clientX, y: touch.clientY });
        setLastOffset(offset);

        // Start panning only if scale >= 2 (200% zoom or higher)
        if (scale >= 2) {
            setIsDragging(true);
            // Prevent default touch behavior when panning is enabled
            event.preventDefault();
            event.stopPropagation();
        }
    }, [offset, scale]);

    // Handle mouse move for panning and cursor updates
    const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (isSelecting && selectionRect) {
            // Update selection rectangle
            setSelectionRect({ ...selectionRect, x2: x, y2: y });
        } else if (isDragging && scale >= 2) {
            const deltaX = event.clientX - dragStart.x;
            const deltaY = event.clientY - dragStart.y;

            // Check if we've moved enough to consider this a drag
            if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) > DRAG_THRESHOLD) {
                setHasDragged(true);
            }

            // Clamp pan to content bounds
            const panCanvas = canvasRef.current;
            if (panCanvas) {
                const rect = panCanvas.getBoundingClientRect();
                let newOffsetX = lastOffset.x + deltaX;
                let newOffsetY = lastOffset.y + deltaY;

                // Compute content bounds (world coords)
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                if (seatsRef.current.length > 0) {
                    minX = Math.min(minX, ...seatsRef.current.map(seat => seat.bounds.minX));
                    maxX = Math.max(maxX, ...seatsRef.current.map(seat => seat.bounds.maxX));
                    minY = Math.min(minY, ...seatsRef.current.map(seat => seat.bounds.minY));
                    maxY = Math.max(maxY, ...seatsRef.current.map(seat => seat.bounds.maxY));
                }
                if (legendsRef.current.length > 0) {
                    minX = Math.min(minX, ...legendsRef.current.map(legend => legend.bounds.minX));
                    maxX = Math.max(maxX, ...legendsRef.current.map(legend => legend.bounds.maxX));
                    minY = Math.min(minY, ...legendsRef.current.map(legend => legend.bounds.minY));
                    maxY = Math.max(maxY, ...legendsRef.current.map(legend => legend.bounds.maxY));
                }
                if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
                    const paddingX = 0;
                    const paddingTop = 0;
                    const paddingBottom = 50;
                    const overscrollX = 100;
                    const overscrollY = 80;
                    const minOffsetX = (rect.width - paddingX) - maxX * scale;
                    const maxOffsetXClamp = paddingX - minX * scale;
                    const minOffsetY = (rect.height - paddingBottom) - maxY * scale;
                    const maxOffsetYClamp = paddingTop - minY * scale;
                    const allowedMinOffsetX = minOffsetX - overscrollX;
                    const allowedMaxOffsetX = maxOffsetXClamp + overscrollX;
                    const allowedMinOffsetY = minOffsetY - overscrollY;
                    const allowedMaxOffsetY = maxOffsetYClamp + overscrollY;
                    newOffsetX = Math.min(Math.max(newOffsetX, allowedMinOffsetX), allowedMaxOffsetX);
                    newOffsetY = Math.min(Math.max(newOffsetY, allowedMinOffsetY), allowedMaxOffsetY);
                }
                setOffset({ x: newOffsetX, y: newOffsetY });
            } else {
                setOffset({ x: lastOffset.x + deltaX, y: lastOffset.y + deltaY });
            }
        } else {
            // Track mouse position for tooltip
            setMousePosition({ x: event.clientX, y: event.clientY });

            // Check if mouse is over a seat for cursor update and hover (only at 200%+ zoom)
            if (scale >= 2) {
                const seatId = getSeatAtPoint(x, y);
                
                // Check if this is a wheelchair seat when not in wheelchair mode
                let shouldShowHover = false;
                if (seatId) {
                    const seat = seatsRef.current.find(s => s.id === seatId);
                    if (seat) {
                        // Only show hover for wheelchair seats when in wheelchair mode
                        if (isWheelchairMode || (seat.type !== 'wheelchair' && seat.type !== 'wheelchair_side' && seat.type !== 'wheelchair_accompaniment')) {
                            shouldShowHover = true;
                        }
                    }
                }
                
                setCursorStyle(shouldShowHover ? 'pointer' : 'default');
                setHoveredSeat(shouldShowHover ? seatId : null);

                // Set hovered seat info for tooltip
                if (seatId && !allBlockedSeats.includes(seatId) && shouldShowHover) {
                    const seatInfo = seatsRef.current.find(seat => seat.id === seatId);
                    setHoveredSeatInfo(seatInfo || null);
                } else {
                    setHoveredSeatInfo(null);
                }
            } else {
                setCursorStyle('default');
                setHoveredSeat(null);
                setHoveredSeatInfo(null);
            }
        }
    }, [isDragging, isSelecting, selectionRect, dragStart, lastOffset, getSeatAtPoint, isWheelchairMode, allBlockedSeats, scale]);

    // Handle touch move for panning on touch devices
    const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
        // Only handle single touch for panning or swipe detection
        if (event.touches.length !== 1) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const touch = event.touches[0];
        const deltaX = touch.clientX - dragStart.x;
        const deltaY = touch.clientY - dragStart.y;
        const moved = Math.sqrt(deltaX * deltaX + deltaY * deltaY) > DRAG_THRESHOLD;

        // At low zoom, do not pan or prevent default, but detect swipe to avoid auto-zoom on touchend
        if (scale < 2) {
            if (moved) setHasDragged(true);
            return;
        }

        if (!isDragging) return;

        if (moved) {
            setHasDragged(true);
        }

        // Clamp pan to content bounds
        const touchCanvas = canvasRef.current;
        if (touchCanvas) {
            const rect = touchCanvas.getBoundingClientRect();
            let newOffsetX = lastOffset.x + deltaX;
            let newOffsetY = lastOffset.y + deltaY;

            // Compute content bounds (world coords)
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            if (seatsRef.current.length > 0) {
                minX = Math.min(minX, ...seatsRef.current.map(seat => seat.bounds.minX));
                maxX = Math.max(maxX, ...seatsRef.current.map(seat => seat.bounds.maxX));
                minY = Math.min(minY, ...seatsRef.current.map(seat => seat.bounds.minY));
                maxY = Math.max(maxY, ...seatsRef.current.map(seat => seat.bounds.maxY));
            }
            if (legendsRef.current.length > 0) {
                minX = Math.min(minX, ...legendsRef.current.map(legend => legend.bounds.minX));
                maxX = Math.max(maxX, ...legendsRef.current.map(legend => legend.bounds.maxX));
                minY = Math.min(minY, ...legendsRef.current.map(legend => legend.bounds.minY));
                maxY = Math.max(maxY, ...legendsRef.current.map(legend => legend.bounds.maxY));
            }
            if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
                const paddingX = 0;
                const paddingTop = 0;
                const paddingBottom = 50;
                const overscrollX = 100;
                const overscrollY = 80;
                const minOffsetX = (rect.width - paddingX) - maxX * scale;
                const maxOffsetXClamp = paddingX - minX * scale;
                const minOffsetY = (rect.height - paddingBottom) - maxY * scale;
                const maxOffsetYClamp = paddingTop - minY * scale;
                const allowedMinOffsetX = minOffsetX - overscrollX;
                const allowedMaxOffsetX = maxOffsetXClamp + overscrollX;
                const allowedMinOffsetY = minOffsetY - overscrollY;
                const allowedMaxOffsetY = maxOffsetYClamp + overscrollY;
                newOffsetX = Math.min(Math.max(newOffsetX, allowedMinOffsetX), allowedMaxOffsetX);
                newOffsetY = Math.min(Math.max(newOffsetY, allowedMinOffsetY), allowedMaxOffsetY);
            }
            setOffset({ x: newOffsetX, y: newOffsetY });
        } else {
            setOffset({ x: lastOffset.x + deltaX, y: lastOffset.y + deltaY });
        }

        // Prevent default touch behavior when actively panning
        event.preventDefault();
        event.stopPropagation();
    }, [isDragging, dragStart, lastOffset, scale]);

    // Handle mouse up
    const handleMouseUp = useCallback(() => {
        if (isSelecting && selectionRect) {
            // Select all seats within the rectangle
            const canvas = canvasRef.current;
            if (!canvas) return;

            const x1 = Math.min(selectionRect.x1, selectionRect.x2);
            const y1 = Math.min(selectionRect.y1, selectionRect.y2);
            const x2 = Math.max(selectionRect.x1, selectionRect.x2);
            const y2 = Math.max(selectionRect.y1, selectionRect.y2);

            // Convert screen coordinates to canvas coordinates
            const canvasX1 = (x1 - offset.x) / scale;
            const canvasY1 = (y1 - offset.y) / scale;
            const canvasX2 = (x2 - offset.x) / scale;
            const canvasY2 = (y2 - offset.y) / scale;

            // Find seats within the rectangle
            const seatsInRect = seatsRef.current.filter(seat => {
                // Skip wheelchair and wheelchair_accompaniment seats when not in wheelchair mode
                if (!isWheelchairMode && (seat.type === 'wheelchair' || seat.type === 'wheelchair_side' || seat.type === 'wheelchair_accompaniment')) {
                    return false;
                }
                
                return seat.cx >= Math.min(canvasX1, canvasX2) &&
                    seat.cx <= Math.max(canvasX1, canvasX2) &&
                    seat.cy >= Math.min(canvasY1, canvasY2) &&
                    seat.cy <= Math.max(canvasY1, canvasY2) &&
                    !allBlockedSeats.includes(seat.id); // Exclude blocked seats
            });

            // Add selected seats to current selection
            seatsInRect.forEach(seat => {
                if (!selectedSeats.includes(seat.id)) {
                    const seatGroup = seatGroups.find(group => group.id === seat.seatGroupId);
                    if (seatGroup) {
                        onSeatClick(seat.id, seatGroup, seat);
                    }
                }
            });
            setHasSelected(true);
        }

        setIsDragging(false);
        setIsSelecting(false);
        setSelectionRect(null);
        // Clear tooltip when mouse interaction ends
        setHoveredSeatInfo(null);
        // Reset hasDragged and hasSelected after a short delay to allow click handler to check it
        setTimeout(() => {
            setHasDragged(false);
            setHasSelected(false);
        }, 10);
    }, [isSelecting, selectionRect, selectedSeats, onSeatClick, seatGroups, scale, offset, allBlockedSeats, isWheelchairMode]);

    // Keep refs in sync for native touch handlers
    useEffect(() => { scaleRef.current = scale; }, [scale]);
    useEffect(() => { offsetRef.current = offset; }, [offset]);

    // Native non-passive touch listeners to support pinch-zoom on touch devices (e.g., tablets)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const getMidpoint = (t1: Touch, t2: Touch, rect: DOMRect) => ({
            x: ((t1.clientX - rect.left) + (t2.clientX - rect.left)) / 2,
            y: ((t1.clientY - rect.top) + (t2.clientY - rect.top)) / 2,
        });

        const distance = (t1: Touch, t2: Touch) => {
            const dx = t2.clientX - t1.clientX;
            const dy = t2.clientY - t1.clientY;
            return Math.hypot(dx, dy);
        };

        const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

        const handleNativeTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                e.stopPropagation();
                isPinchingRef.current = true;
                setHasDragged(true); // ensure we don't treat this gesture as a tap
                const rect = canvas.getBoundingClientRect();
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const mid = getMidpoint(t1, t2, rect);
                const dist = distance(t1, t2);

                // Compute world coords at midpoint using current scale/offset
                const startScale = scaleRef.current;
                const startOffset = offsetRef.current;
                const worldAtMid = {
                    x: (mid.x - startOffset.x) / startScale,
                    y: (mid.y - startOffset.y) / startScale,
                };

                // Determine minimum (base) scale (centered fit) without relying on external callbacks
                const seats = seatsRef.current;
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                if (seats.length > 0) {
                    minX = Math.min(minX, ...seats.map(seat => seat.bounds.minX));
                    maxX = Math.max(maxX, ...seats.map(seat => seat.bounds.maxX));
                    minY = Math.min(minY, ...seats.map(seat => seat.bounds.minY));
                    maxY = Math.max(maxY, ...seats.map(seat => seat.bounds.maxY));
                }
                if (legendsRef.current.length > 0) {
                    minX = Math.min(minX, ...legendsRef.current.map(legend => legend.bounds.minX));
                    maxX = Math.max(maxX, ...legendsRef.current.map(legend => legend.bounds.maxX));
                    minY = Math.min(minY, ...legendsRef.current.map(legend => legend.bounds.minY));
                    maxY = Math.max(maxY, ...legendsRef.current.map(legend => legend.bounds.maxY));
                }
                let baseScale = 0.8;
                if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
                    const contentWidth = maxX - minX;
                    const contentHeight = maxY - minY;
                    const paddingX = 0;
                    const paddingTop = 0;
                    const paddingBottom = 50;
                    const availableWidth = rect.width - (paddingX * 2);
                    const availableHeight = rect.height - paddingTop - paddingBottom;
                    const scaleX = availableWidth / contentWidth;
                    const scaleY = availableHeight / contentHeight;
                    baseScale = Math.min(scaleX, scaleY, 1);
                }
                pinchMinScaleRef.current = baseScale;

                pinchStartDistanceRef.current = dist;
                pinchStartScaleRef.current = startScale;
                pinchStartWorldRef.current = worldAtMid;
                setIsPinching(true);
                setIsDragging(false);
            }
        };

        const handleNativeTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && pinchStartDistanceRef.current && pinchStartWorldRef.current) {
                e.preventDefault();
                e.stopPropagation();
                const rect = canvas.getBoundingClientRect();
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const mid = getMidpoint(t1, t2, rect);
                const dist = distance(t1, t2);

                const scaleFactor = dist / pinchStartDistanceRef.current;
                const targetScale = clamp(pinchStartScaleRef.current * scaleFactor, pinchMinScaleRef.current, 5);

                let newOffset = {
                    x: mid.x - (pinchStartWorldRef.current.x) * targetScale,
                    y: mid.y - (pinchStartWorldRef.current.y) * targetScale,
                };

                // Clamp pinch offset to content bounds
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                if (seatsRef.current.length > 0) {
                    minX = Math.min(minX, ...seatsRef.current.map(seat => seat.bounds.minX));
                    maxX = Math.max(maxX, ...seatsRef.current.map(seat => seat.bounds.maxX));
                    minY = Math.min(minY, ...seatsRef.current.map(seat => seat.bounds.minY));
                    maxY = Math.max(maxY, ...seatsRef.current.map(seat => seat.bounds.maxY));
                }
                if (legendsRef.current.length > 0) {
                    minX = Math.min(minX, ...legendsRef.current.map(legend => legend.bounds.minX));
                    maxX = Math.max(maxX, ...legendsRef.current.map(legend => legend.bounds.maxX));
                    minY = Math.min(minY, ...legendsRef.current.map(legend => legend.bounds.minY));
                    maxY = Math.max(maxY, ...legendsRef.current.map(legend => legend.bounds.maxY));
                }
                if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
                    const paddingX = 0;
                    const paddingTop = 0;
                    const paddingBottom = 50;
                    const overscrollX = 100;
                    const overscrollY = 80;
                    const minOffsetX = (rect.width - paddingX) - maxX * targetScale;
                    const maxOffsetXClamp = paddingX - minX * targetScale;
                    const minOffsetY = (rect.height - paddingBottom) - maxY * targetScale;
                    const maxOffsetYClamp = paddingTop - minY * targetScale;
                    const allowedMinOffsetX = minOffsetX - overscrollX;
                    const allowedMaxOffsetX = maxOffsetXClamp + overscrollX;
                    const allowedMinOffsetY = minOffsetY - overscrollY;
                    const allowedMaxOffsetY = maxOffsetYClamp + overscrollY;
                    newOffset = {
                        x: Math.min(Math.max(newOffset.x, allowedMinOffsetX), allowedMaxOffsetX),
                        y: Math.min(Math.max(newOffset.y, allowedMinOffsetY), allowedMaxOffsetY)
                    };
                }

                scaleRef.current = targetScale;
                offsetRef.current = newOffset;
                setScale(targetScale);
                setOffset(newOffset);
            }
        };

        const handleNativeTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2 && isPinching) {
                e.preventDefault();
                e.stopPropagation();
                pinchStartDistanceRef.current = null;
                pinchStartWorldRef.current = null;
                setIsPinching(false);
                isPinchingRef.current = false;
                pinchEndedAtRef.current = performance.now();
                // Clear the cooldown shortly after to re-enable taps
                setTimeout(() => { pinchEndedAtRef.current = 0; }, 300);
            }
        };

        canvas.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleNativeTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', handleNativeTouchEnd, { passive: false });
        return () => {
            canvas.removeEventListener('touchstart', handleNativeTouchStart as EventListener);
            canvas.removeEventListener('touchmove', handleNativeTouchMove as EventListener);
            canvas.removeEventListener('touchend', handleNativeTouchEnd as EventListener);
            canvas.removeEventListener('touchcancel', handleNativeTouchEnd as EventListener);
        };
    }, [isPinching]);

    // Handle touch end for tap selection and cleanup
    const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
        // If we were dragging at scale >= 2, prevent default behavior
        if (isDragging && scale >= 2) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Suppress touch-end actions if we're in or just finished a pinch gesture
        if (isPinchingRef.current || (performance.now() - pinchEndedAtRef.current) < 300) {
            setIsDragging(false);
            setIsSelecting(false);
            setSelectionRect(null);
            setHoveredSeatInfo(null);
            setTimeout(() => {
                setHasDragged(false);
                setHasSelected(false);
            }, 10);
            return;
        }

        // Handle seat selection on touch end (similar to tap) if we didn't drag
        if (!hasDragged && !isZooming && event.changedTouches.length === 1) {
            const canvas = canvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const touch = event.changedTouches[0];
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;

                // Enhancement: If zoom is less than 200%, smoothly zoom in to 300% centered on touch
                const elapsed = performance.now() - touchStartTimeRef.current;
                if (scale < 2 && elapsed < 250) {
                    setShowZoomPrompt(false); // Hide overlay when user touches to zoom
                    dispatch({ type: 'SET_SEAT_PLAN_INTERACTED', payload: true }); // Mark that user has interacted
                    const targetScale = 3.5;
                    // Calculate new offset so that the touched point stays under the touch
                    const scaleChange = targetScale / scale;
                    const newOffsetX = x - (x - offset.x) * scaleChange;
                    const newOffsetY = y - (y - offset.y) * scaleChange;

                    animateZoom(targetScale, { x: newOffsetX, y: newOffsetY });
                } else {
                    // Only allow seat selection at 200% zoom or higher
                    const seatId = getSeatAtPoint(x, y);
                    if (seatId && !allBlockedSeats.includes(seatId)) {
                        const seat = seatsRef.current.find(s => s.id === seatId);
                        if (seat) {
                            // Skip wheelchair and wheelchair_accompaniment seats when not in wheelchair mode
                            if (!isWheelchairMode && (seat.type === 'wheelchair' || seat.type === 'wheelchair_side' || seat.type === 'wheelchair_accompaniment')) {
                                // Don't handle
                            } else {
                                const seatGroup = seatGroups.find(group => group.id === seat.seatGroupId);
                                if (seatGroup) {
                                    if (selectedSeats.includes(seatId)) {
                                        onSeatDeselect(seatId, seat);
                                    } else {
                                        onSeatClick(seatId, seatGroup, seat);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        setIsDragging(false);
        setIsSelecting(false);
        setSelectionRect(null);
        // Clear tooltip when touch interaction ends
        setHoveredSeatInfo(null);
        // Reset hasDragged and hasSelected after a short delay to allow click handler to check it
        setTimeout(() => {
            setHasDragged(false);
            setHasSelected(false);
        }, 10);
    }, [isDragging, scale, hasDragged, isZooming, offset, animateZoom, getSeatAtPoint, allBlockedSeats, isWheelchairMode, selectedSeats, seatGroups, onSeatClick, onSeatDeselect, dispatch]);

    // Calculate centered position for seats and legends
    const calculateCenteredPosition = useCallback((seats: SeatInfo[], canvasWidth: number, canvasHeight: number) => {
        if (seats.length === 0 && legendsRef.current.length === 0) return { x: 0, y: 0, scale: 0.8 };

        // Calculate bounding box of all seats
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        // Include seats in bounding box
        if (seats.length > 0) {
            minX = Math.min(minX, ...seats.map(seat => seat.bounds.minX));
            maxX = Math.max(maxX, ...seats.map(seat => seat.bounds.maxX));
            minY = Math.min(minY, ...seats.map(seat => seat.bounds.minY));
            maxY = Math.max(maxY, ...seats.map(seat => seat.bounds.maxY));
        }

        // Include legends in bounding box
        if (legendsRef.current.length > 0) {
            minX = Math.min(minX, ...legendsRef.current.map(legend => legend.bounds.minX));
            maxX = Math.max(maxX, ...legendsRef.current.map(legend => legend.bounds.maxX));
            minY = Math.min(minY, ...legendsRef.current.map(legend => legend.bounds.minY));
            maxY = Math.max(maxY, ...legendsRef.current.map(legend => legend.bounds.maxY));
        }

        // Fallback if no valid bounds found
        if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
            return { x: 0, y: 0, scale: 0.8 };
        }

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const contentCenterX = minX + contentWidth / 2;
        const contentCenterY = minY + contentHeight / 2;

        // Calculate scale to fit with padding
        const paddingX = 0; // 0px padding on sides
        const paddingTop = 0; // 0px padding on top
        const paddingBottom = 50; // 50px padding on bottom
        const availableWidth = canvasWidth - (paddingX * 2);
        const availableHeight = canvasHeight - paddingTop - paddingBottom;

        const scaleX = availableWidth / contentWidth;
        const scaleY = availableHeight / contentHeight;
        const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size

        // Calculate offset to center the content (accounting for asymmetric padding)
        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = (canvasHeight - paddingBottom + paddingTop) / 2;

        const offsetX = canvasCenterX - (contentCenterX * fitScale);
        const offsetY = canvasCenterY - (contentCenterY * fitScale);

        return {
            x: offsetX,
            y: offsetY,
            scale: fitScale
        };
    }, []);

    // Initialize canvas
    useEffect(() => {
        if (!canvasRef.current) return;

        // Parse seats and legends
        const seats = parseSvgSeats(svgContent, seatGroups);
        const legends = parseSvgLegends(svgContent);
        seatsRef.current = seats;
        legendsRef.current = legends;

        // Notify parent component about loaded seats
        if (onSeatsLoaded && seats.length > 0) {
            onSeatsLoaded(seats);
        }

        // Clear path cache when seats change
        pathCacheRef.current.clear();

        // Get canvas context
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Disable anti-aliasing
        ctx.imageSmoothingEnabled = false;

        // Set canvas size with DPI scaling for crisp rendering
        const rect = canvas.getBoundingClientRect();
        const dpi = window.devicePixelRatio;
        canvas.width = rect.width * dpi;
        canvas.height = rect.height * dpi;

        // Scale the context to account for the DPI scaling
        ctx.scale(dpi, dpi);

        // Calculate centered position and scale (use client dimensions, not scaled canvas dimensions)
        const { x, y, scale: initialScale } = calculateCenteredPosition(seats, rect.width, rect.height);
        initialFitScaleRef.current = initialScale; // Store the initial fit scale
        setOffset({ x, y });
        setScale(initialScale);

        // Initial draw will happen in the next useEffect due to state changes
    }, [svgContent, seatGroups, parseSvgSeats, parseSvgLegends, calculateCenteredPosition]);

    // Removed pre-render optimization per request

    // Show/hide zoom prompt based on zoom level and user interaction
    useEffect(() => {
        if (state.hasSeatPlanInteracted || scale >= 2) {
            setShowZoomPrompt(false);
        } else {
            // Only show prompt if user hasn't interacted yet and scale < 2
            setShowZoomPrompt(true);
        }
    }, [scale, state.hasSeatPlanInteracted]);

    // Redraw when selections or transformations change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        drawSeats(ctx, canvas);
    }, [selectedSeats, allBlockedSeats, hoveredSeat, scale, offset, isWheelchairMode, drawSeats]);

    // Handle wheel events manually with passive: false
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const dpi = window.devicePixelRatio;
            canvas.width = rect.width * dpi;
            canvas.height = rect.height * dpi;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Disable anti-aliasing on resize
            ctx.imageSmoothingEnabled = false;

            // Scale the context to account for the DPI scaling
            ctx.scale(dpi, dpi);

            drawSeats(ctx, canvas);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [drawSeats]);

    return (
        <div className={className}>
            <div className="space-y-4 h-full">
                {/* <div className="border border-gray-200 rounded-lg overflow-hidden h-[1000px]"> */}
                <div className=" rounded-lg overflow-hidden h-full relative">
                    <canvas
                        ref={canvasRef}
                        style={{
                            display: 'block',
                            width: '100%',
                            height: '100%',
                            cursor: isDragging ? 'grabbing' : isSelecting ? 'crosshair' : cursorStyle,
                            touchAction: isPinching || scale >= 2 ? 'none' : 'auto'
                        }}
                        onClick={handleCanvasClick}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => {
                            handleMouseUp();
                            setHoveredSeatInfo(null);
                        }}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    />

                    {/* Zoom Prompt Overlay */}
                    {showZoomPrompt && scale < 2 && (
                        <div
                            className="absolute inset-0 bg-white/30 backdrop-blur-[1px] flex items-center justify-center z-40 cursor-pointer transition-opacity duration-500"
                            onClick={(e) => {
                                // Trigger zoom on click
                                const canvas = canvasRef.current;
                                if (!canvas || isZooming) return;
                                
                                const rect = canvas.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const y = e.clientY - rect.top;
                                
                                setShowZoomPrompt(false);
                                dispatch({ type: 'SET_SEAT_PLAN_INTERACTED', payload: true }); // Mark that user has interacted
                                const targetScale = 3.5;
                                const scaleChange = targetScale / scale;
                                const newOffsetX = x - (x - offset.x) * scaleChange;
                                const newOffsetY = y - (y - offset.y) * scaleChange;
                                
                                animateZoom(targetScale, { x: newOffsetX, y: newOffsetY });
                            }}
                        >
                            <div 
                                className={`bg-white rounded-2xl shadow-2xl px-6 py-8 max-w-md mx-4 border-2 border-gray-200 transform transition-transform duration-500 ease-in-out ${
                                    infoBoxMovedDown ? 'translate-y-[300px] mb-8' : ''
                                }`}
                                style={infoBoxMovedDown ? { marginBottom: '32px' } : {}}
                                onMouseEnter={() => {
                                    if (!infoBoxMovedDown) {
                                        setInfoBoxMovedDown(true);
                                    }
                                }}
                            >
                                <div className="text-center space-y-4">
                                    <h3 className="text-xl font-semibold flex items-center justify-center gap-3">
                                        <svg 
                                            className="w-6 h-6 text-darkBlue animate-bounce" 
                                            fill="none" 
                                            viewBox="0 0 24 24" 
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                        </svg>
                                        Klicken Sie zum Zoomen
                                    </h3>
                                    <p className="text-gray-600 text-base">
                                        Klicken Sie auf die Sitzplan-Ansicht, um hineinzuzoomen und Plätze auszuwählen
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Zoom controls - top left */}
                    <div
                        className="absolute top-8 left-8 flex flex-col justify-evenly items-center"
                        style={{
                            backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg width='36' height='120' viewBox='0 0 30 103' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M26.5791 0C27.9553 0 29.0713 1.116 29.0713 2.49219V29.9014C27.6951 29.9014 26.5791 31.0174 26.5791 32.3936C26.5792 33.6837 27.5599 34.7445 28.8164 34.8721L29.0713 34.8848V67.2783C27.6951 67.2783 26.5791 68.3943 26.5791 69.7705C26.5791 71.0607 27.5599 72.1215 28.8164 72.249L29.0713 72.2627V99.6719C29.0713 101.048 27.9553 102.164 26.5791 102.164H2.49219C1.116 102.164 0 101.048 0 99.6719V72.2627C1.37618 72.2627 2.49218 71.1467 2.49219 69.7705C2.49219 68.3943 1.37618 67.2783 0 67.2783V34.8848C1.37615 34.8848 2.49213 33.7697 2.49219 32.3936C2.49219 31.0174 1.37618 29.9014 0 29.9014V2.49219C0 1.116 1.116 0 2.49219 0H26.5791Z' fill='white'/%3E%3C/svg%3E")`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            width: '36px',
                            height: '120px'
                        }}
                    >
                        <button
                            onClick={() => {
                                if(scale < 2) {
                                    setShowZoomPrompt(false);
                                    dispatch({ type: 'SET_SEAT_PLAN_INTERACTED', payload: true });
                                    animateZoom(2, { x: offset.x, y: offset.y });
                                    return;
                                }
                                const newScale = Math.min(5, scale * 1.5);
                                // Center zoom on canvas center
                                const canvas = canvasRef.current;
                                if (!canvas) return;
                                const rect = canvas.getBoundingClientRect();
                                const centerX = rect.width / 2;
                                const centerY = rect.height / 2;
                                const scaleChange = newScale / scale;
                                const newOffsetX = centerX - (centerX - offset.x) * scaleChange;
                                const newOffsetY = centerY - (centerY - offset.y) * scaleChange;
                                animateZoom(newScale, { x: newOffsetX, y: newOffsetY });
                            }}
                            className="w-full h-full flex items-center justify-center hover:bg-gray-100 rounded text-black"
                            title="Hineinzoomen"
                        >
                            <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.8159 7.74561L0.597903 7.7456" stroke="black" strokeWidth="1.10906" strokeLinecap="round" />
                                <path d="M7.20752 14.5999V1.3819" stroke="black" strokeWidth="1.10906" strokeLinecap="round" />
                            </svg>

                        </button>
                        <button
                            onClick={() => {
                                const canvas = canvasRef.current;
                                if (!canvas) return;
                                const rect = canvas.getBoundingClientRect();
                                const { x, y, scale: initialScale } = calculateCenteredPosition(
                                    seatsRef.current,
                                    rect.width,
                                    rect.height
                                );
                                initialFitScaleRef.current = initialScale; // Update stored fit scale
                                animateZoom(initialScale, { x, y });
                            }}
                            className="w-full h-full flex items-center justify-center hover:bg-gray-100 rounded text-black"
                            title="Ansicht zurücksetzen"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 10H6V15M15 6H10V1" stroke="black" strokeWidth="1.11" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button
                            onClick={() => {
                                // Use the stored initial fit scale as the minimum zoom level
                                const minScale = initialFitScaleRef.current;
                                const newScale = Math.max(minScale, scale / 1.5);
                                
                                // Don't zoom out if we're already at the minimum
                                if (newScale <= minScale && scale <= minScale) {
                                    return;
                                }
                                
                                // Center zoom on canvas center
                                const canvas = canvasRef.current;
                                if (!canvas) return;
                                const rect = canvas.getBoundingClientRect();
                                const centerX = rect.width / 2;
                                const centerY = rect.height / 2;
                                const scaleChange = newScale / scale;
                                const newOffsetX = centerX - (centerX - offset.x) * scaleChange;
                                const newOffsetY = centerY - (centerY - offset.y) * scaleChange;
                                animateZoom(newScale, { x: newOffsetX, y: newOffsetY });
                            }}
                            className="w-full h-full flex items-center justify-center hover:bg-gray-100 rounded text-black"
                            title="Herauszoomen"
                        >
                            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14.6938 7.34674L1.47583 7.34674" stroke="black" strokeWidth="1.10906" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                    <button 
                        onClick={onWheelchairModeToggle}
                        className={`group absolute top-40 left-8 h-9 w-9 hover:w-[164px] rounded-md overflow-hidden flex items-center transition-all duration-300 ease-in-out ${
                            isWheelchairMode ? 'bg-darkBlue hover:bg-darkBlue/80' : 'bg-white hover:bg-gray-100'
                        }`} 
                        aria-label="Rollstuhlplätze"
                        title={isWheelchairMode ? 'Normale Ansicht' : 'Rollstuhlplätze anzeigen'}
                    >
                        <div className="flex-shrink-0 w-9 h-9 grid place-items-center">
                            <svg width="10" height="14" viewBox="0 0 10 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path className={isWheelchairMode ? "fill-white transition-all duration-300 ease-in-out" : "fill-black transition-all duration-300 ease-in-out"} fill-rule="evenodd" clip-rule="evenodd" d="M5.76616 1.55555C5.76616 2.41466 5.07773 3.11111 4.22851 3.11111C3.3793 3.11111 2.69087 2.41466 2.69087 1.55555C2.69087 0.696445 3.3793 0 4.22851 0C5.07773 0 5.76616 0.696445 5.76616 1.55555ZM3.74746 8.42237L3.00058 3.88888H6.09703L6.80178 8.16663H8.13399C8.9337 8.16663 9.59991 8.78677 9.66632 9.59301L10 13.2222H8.45703L8.13399 9.72219H5.26418C4.51252 9.72219 3.87104 9.17243 3.74746 8.42237ZM3.8441 12.4444C4.84836 12.4444 5.70271 11.7951 6.01933 10.8889H7.61132C7.25515 12.664 5.70386 14 3.8441 14C1.72106 14 0 12.2589 0 10.1111C0 8.57857 0.876289 7.25308 2.14963 6.61946L2.43628 8.26273C1.88971 8.68941 1.53764 9.35867 1.53764 10.1111C1.53764 11.3998 2.57028 12.4444 3.8441 12.4444Z" />
                            </svg>
                        </div>
                        <span 
                            className={`${isWheelchairMode ? 'text-white' : 'text-black'} opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap pr-3 text-sm font-medium transition-all duration-300`}
                        >
                            Rollstuhlplätze
                        </span>
                    </button>

                    {/* Video Play Button */}
                    <button 
                        onClick={onVideoPlay}
                        className="group absolute top-[204px] left-8 h-9 w-9 hover:w-[164px] rounded-md overflow-hidden flex items-center transition-all duration-300 ease-in-out bg-white hover:bg-gray-100" 
                        aria-label="Drohnenvideo"
                        title="Drohnenvideo"
                    >
                        <div className="flex-shrink-0 w-9 h-9 grid place-items-center">
                            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path className="stroke-black" d="M0.600098 10.9659V2.23468C0.600098 1.51471 0.600098 1.15432 0.733501 0.9413C0.849934 0.755378 1.0294 0.633308 1.22864 0.604124C1.45683 0.570697 1.73671 0.740223 2.29567 1.07879L9.50309 5.44442L9.5057 5.44574C10.1234 5.8199 10.4324 6.00707 10.5338 6.25653C10.6222 6.47415 10.6222 6.72536 10.5338 6.94298C10.4323 7.19279 10.1225 7.38072 9.50309 7.75594L2.29567 12.1216C1.73631 12.4604 1.45691 12.6293 1.22864 12.5958C1.0294 12.5666 0.849934 12.4446 0.733501 12.2587C0.600098 12.0456 0.600098 11.6859 0.600098 10.9659Z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span 
                            className="text-black opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap pr-3 text-sm font-medium transition-all duration-300"
                        >
                            Drohnenvideo
                        </span>
                    </button>

                    {/* Seat Information Tooltip */}
                    {hoveredSeatInfo && (
                        <div
                            className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg pointer-events-none"
                            style={{
                                left: mousePosition.x + 15,
                                top: mousePosition.y - 35,
                            }}
                        >
                            <div className="font-medium">{hoveredSeatInfo.displayName}</div>
                            {/* <div className="text-xs text-gray-300">ID: {hoveredSeatInfo.id}</div> */}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
} 
