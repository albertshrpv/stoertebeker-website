import { useEffect, useRef, useCallback, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
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
    onSeatClick: (seatId: string, seatGroup: CompleteSeatGroup, seatInfo: SeatInfo) => void;
    onSeatDeselect: (seatId: string, seatInfo?: SeatInfo) => void;
    onSeatsLoaded?: (seats: SeatInfo[]) => void; // New callback for when seats are parsed
    className?: string;
}

export interface SeatPlanViewerMobileHandle {
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
}

const SeatPlanViewerMobile = forwardRef<SeatPlanViewerMobileHandle, SeatPlanEditorProps>(function SeatPlanViewerMobile({
    svgContent,
    seatGroups,
    selectedSeats,
    blockedSeats = [],
    isWheelchairMode = false,
    onSeatClick,
    onSeatDeselect,
    onSeatsLoaded,
    className = '',
}: SeatPlanEditorProps, ref) {
    // Available utility functions for external access (via ref or callback):
    // - getSeatByRowAndNumber(row: number, seatNumber: number): SeatInfo | null
    // - getSeatsByRow(row: number): SeatInfo[]
    // - getRowInfo(): Array<{rowNumber: number, seatCount: number, seats: SeatInfo[]}>

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const seatsRef = useRef<SeatInfo[]>([]);
    const seatsByIdRef = useRef<Map<string, SeatInfo>>(new Map());
    const legendsRef = useRef<LegendInfo[]>([]);
    const currentSvgContentRef = useRef<string>(svgContent); // Track current svgContent to prevent race conditions
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
    const [simBlocked, setSimBlocked] = useState<string[]>([]);
    const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isZooming, setIsZooming] = useState(false);
    const pathCacheRef = useRef<Map<string, Path2D>>(new Map());
    const DRAG_THRESHOLD = 5; // px
    const selectionColor = '#5c9b71'; // Green color for selections
    const selectionAccentColor = '#3e6f54'; // Darker green for strokes and checkmark
    // const blockedSeatColor = '#989898';
    const blockedSeatColor = '#D1D5DB';
    const wheelchairModeGrayColor = '#D1D5DB';
    const strokeColor = '#19263D';
    const hoverColor = '#19263D';
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
    const animationFrameRef = useRef<number | null>(null);
    const pendingRenderRef = useRef<boolean>(false);
    const isDraggingRef = useRef<boolean>(false);
    const isPinchingRefForRender = useRef<boolean>(false);
    const lastOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Offscreen-Layer-Setup (analog Desktop)
    const blockedSetRef = useRef<Set<string>>(new Set());
    const worldBoundsRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
    const baseLayerRef = useRef<OffscreenCanvas | HTMLCanvasElement | null>(null);
    const blockedLayerRef = useRef<OffscreenCanvas | HTMLCanvasElement | null>(null);
    const cachedMaxScaleRef = useRef<number>(3);
    const targetMaxScaleRef = useRef<number>(3);
    const actualLayerScaleRef = useRef<number>(1);
    const MAX_TEXTURE_SIZE = 4096;
    const dirtyFlagsRef = useRef<{ base: boolean; blocked: boolean; resolution: boolean }>({
        base: true,
        blocked: true,
        resolution: false
    });

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
        // Race condition prevention: Ignore seatGroups if they don't match current svgContent
        if (currentSvgContentRef.current !== svgContent) {
            return [...blockedSeats, ...simBlocked];
        }
        const reservedSeatIds = getReservedSeatIds(seatGroups);
        const baseBlockedSeats = [...blockedSeats, ...reservedSeatIds, ...simBlocked];
        const baseBlockedSet = new Set(baseBlockedSeats);
        const selectedSet = new Set(selectedSeats);
        const autoBlockedSeats = new Set<string>();

        // 1) Linked seat blocking using set lookups
        for (const seat of seatsRef.current) {
            const linked = seat.linked_seat_number;
            if (linked && baseBlockedSet.has(linked)) {
                autoBlockedSeats.add(seat.id);
            }
        }

        // 2) Adjacent wheelchair blocking with pre-indexed lookup by row and seat_row_number
        const wheelchairByRowAndNumber = new Map<number, Map<number, SeatInfo[]>>();
        const allWheelchairSeats: SeatInfo[] = [];
        for (const seat of seatsRef.current) {
            if (seat.type !== 'wheelchair') continue;
            const row = typeof seat.seat_row === 'number' ? seat.seat_row : 0;
            let inner = wheelchairByRowAndNumber.get(row);
            if (!inner) {
                inner = new Map<number, SeatInfo[]>();
                wheelchairByRowAndNumber.set(row, inner);
            }
            const arr = inner.get(seat.seat_row_number) || [];
            arr.push(seat);
            inner.set(seat.seat_row_number, arr);
            allWheelchairSeats.push(seat);
        }

        const actuallyReservedNormalWheelchairSeats: SeatInfo[] = [];
        const selectedNormalWheelchairSeats: SeatInfo[] = [];
        for (const seat of allWheelchairSeats) {
            if (baseBlockedSet.has(seat.id)) {
                actuallyReservedNormalWheelchairSeats.push(seat);
            } else if (selectedSet.has(seat.id)) {
                selectedNormalWheelchairSeats.push(seat);
            }
        }

        const toProcess = [...actuallyReservedNormalWheelchairSeats, ...selectedNormalWheelchairSeats];
        for (const wheelchairSeat of toProcess) {
            const targetRow = typeof wheelchairSeat.seat_row === 'number' ? wheelchairSeat.seat_row : 0;
            const targetSegment = getWheelchairSegment(targetRow);
            const adjacentRows = [targetRow - 2, targetRow - 1, targetRow + 1, targetRow + 2];

            for (const adjacentRow of adjacentRows) {
                const adjacentSegment = getWheelchairSegment(adjacentRow);
                if (adjacentSegment !== targetSegment || adjacentSegment <= 0) continue;

                const inner = wheelchairByRowAndNumber.get(adjacentRow);
                if (!inner) continue;
                const candidates = inner.get(wheelchairSeat.seat_row_number) || [];
                for (const adjacentSeat of candidates) {
                    if (!baseBlockedSet.has(adjacentSeat.id) && !selectedSet.has(adjacentSeat.id)) {
                        autoBlockedSeats.add(adjacentSeat.id);
                    }
                }
            }
        }

        // 3) Max wheelchair seat limitation (15)
        let reservedOrSelectedCount = 0;
        for (const seat of allWheelchairSeats) {
            if (baseBlockedSet.has(seat.id) || selectedSet.has(seat.id)) reservedOrSelectedCount++;
        }
        if (reservedOrSelectedCount >= 15) {
            for (const seat of allWheelchairSeats) {
                if (!baseBlockedSet.has(seat.id) && !selectedSet.has(seat.id)) {
                    autoBlockedSeats.add(seat.id);
                }
            }
        }

        return [...baseBlockedSeats, ...Array.from(autoBlockedSeats)];
    }, [blockedSeats, seatGroups, getReservedSeatIds, selectedSeats, getWheelchairSegment, simBlocked, svgContent]);

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

    // Offscreen Canvas erstellen
    const createOffscreenCanvas = useCallback((width: number, height: number): OffscreenCanvas | HTMLCanvasElement => {
        if (typeof OffscreenCanvas !== 'undefined') {
            return new OffscreenCanvas(width, height);
        } else {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            return canvas;
        }
    }, []);

    // World-Bounds berechnen
    const calculateWorldBounds = useCallback((seats: SeatInfo[], legends: LegendInfo[]): { minX: number; minY: number; maxX: number; maxY: number } | null => {
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
        if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
            return null;
        }
        return { minX, minY, maxX, maxY };
    }, []);

    // Base-Layer (nicht geblockte Sitze) rendern
    const renderBaseLayer = useCallback((
        layer: OffscreenCanvas | HTMLCanvasElement,
        resolutionScale: number,
        worldBounds: { minX: number; minY: number; maxX: number; maxY: number }
    ) => {
        const ctx = layer.getContext('2d');
        if (!ctx) return;
        const width = worldBounds.maxX - worldBounds.minX;
        const height = worldBounds.maxY - worldBounds.minY;
        const desiredWidth = Math.ceil(width * resolutionScale);
        const desiredHeight = Math.ceil(height * resolutionScale);
        let actualWidth = desiredWidth;
        let actualHeight = desiredHeight;
        let actualScale = resolutionScale;
        if (desiredWidth > MAX_TEXTURE_SIZE || desiredHeight > MAX_TEXTURE_SIZE) {
            const scaleX = MAX_TEXTURE_SIZE / desiredWidth;
            const scaleY = MAX_TEXTURE_SIZE / desiredHeight;
            const clampScale = Math.min(scaleX, scaleY);
            actualWidth = Math.ceil(desiredWidth * clampScale);
            actualHeight = Math.ceil(desiredHeight * clampScale);
            actualScale = resolutionScale * clampScale;
        }
        layer.width = actualWidth;
        layer.height = actualHeight;
        actualLayerScaleRef.current = actualScale;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, layer.width, layer.height);
        ctx.fillStyle = '#ECEAE6';
        ctx.fillRect(0, 0, layer.width, layer.height);
        ctx.save();
        ctx.translate(-worldBounds.minX * actualScale, -worldBounds.minY * actualScale);
        ctx.scale(actualScale, actualScale);
        const colorBuckets = new Map<string, SeatInfo[]>();
        for (const seat of seatsRef.current) {
            if (blockedSetRef.current.has(seat.id)) continue;
            if (!isWheelchairMode && (seat.type === 'wheelchair' || seat.type === 'wheelchair_side' || seat.type === 'wheelchair_accompaniment')) {
                continue;
            }
            const color = seat.color;
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
        ctx.restore();
    }, [isWheelchairMode, getCachedPath]);

    // Blocked-Layer rendern
    const renderBlockedLayer = useCallback((
        layer: OffscreenCanvas | HTMLCanvasElement,
        resolutionScale: number,
        worldBounds: { minX: number; minY: number; maxX: number; maxY: number }
    ) => {
        const ctx = layer.getContext('2d');
        if (!ctx) return;
        const width = worldBounds.maxX - worldBounds.minX;
        const height = worldBounds.maxY - worldBounds.minY;
        const desiredWidth = Math.ceil(width * resolutionScale);
        const desiredHeight = Math.ceil(height * resolutionScale);
        let actualWidth = desiredWidth;
        let actualHeight = desiredHeight;
        let actualScale = resolutionScale;
        if (desiredWidth > MAX_TEXTURE_SIZE || desiredHeight > MAX_TEXTURE_SIZE) {
            const scaleX = MAX_TEXTURE_SIZE / desiredWidth;
            const scaleY = MAX_TEXTURE_SIZE / desiredHeight;
            const clampScale = Math.min(scaleX, scaleY);
            actualWidth = Math.ceil(desiredWidth * clampScale);
            actualHeight = Math.ceil(desiredHeight * clampScale);
            actualScale = resolutionScale * clampScale;
        }
        layer.width = actualWidth;
        layer.height = actualHeight;
        actualLayerScaleRef.current = actualScale;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, layer.width, layer.height);
        ctx.save();
        ctx.translate(-worldBounds.minX * actualScale, -worldBounds.minY * actualScale);
        ctx.scale(actualScale, actualScale);
        
        // Draw blocked seats overlay with wheelchair mode logic
        // Optimiert: Iteriere über blockedSet statt über alle Sitze
        const blockedColorBuckets = new Map<string, SeatInfo[]>();
        for (const seatId of blockedSetRef.current) {
            const seat = seatsByIdRef.current.get(seatId);
            if (!seat) continue;
            // Skip wheelchair and wheelchair_accompaniment seats when not in wheelchair mode
            if (!isWheelchairMode && (seat.type === 'wheelchair' || seat.type === 'wheelchair_side' || seat.type === 'wheelchair_accompaniment')) {
                continue;
            }
            let color: string;
            if (isWheelchairMode) {
                color = wheelchairModeGrayColor;
            } else {
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
                // Expand edge slightly with same color to avoid fringe during downscale/blit
                const seatWidth = seat.bounds.maxX - seat.bounds.minX;
                const seatHeight = seat.bounds.maxY - seat.bounds.minY;
                const seatSize = Math.min(seatWidth, seatHeight);
                ctx.strokeStyle = color;
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;
                ctx.lineWidth = Math.max(0.4, seatSize * 0.05);
                ctx.stroke(path);
            }
        });
        ctx.restore();
    }, [isWheelchairMode, getCachedPath, blockedSeatColor, wheelchairModeGrayColor]);

    // Layers bei Bedarf neu aufbauen
    const rebuildLayersIfNeeded = useCallback(() => {
        const worldBounds = worldBoundsRef.current;
        if (!worldBounds) return;
        const dpi = window.devicePixelRatio;
        let resolutionScale = dpi * cachedMaxScaleRef.current;
        if (scale > cachedMaxScaleRef.current * 1.25) {
            const newTargetMaxScale = Math.ceil(scale * 1.5);
            targetMaxScaleRef.current = newTargetMaxScale;
            cachedMaxScaleRef.current = newTargetMaxScale;
            resolutionScale = dpi * newTargetMaxScale;
            dirtyFlagsRef.current.resolution = true;
        }
        if (dirtyFlagsRef.current.base || dirtyFlagsRef.current.resolution) {
            if (!baseLayerRef.current) {
                baseLayerRef.current = createOffscreenCanvas(1, 1);
            }
            renderBaseLayer(baseLayerRef.current, resolutionScale, worldBounds);
            dirtyFlagsRef.current.base = false;
        }
        if (dirtyFlagsRef.current.blocked || dirtyFlagsRef.current.resolution) {
            if (!blockedLayerRef.current) {
                blockedLayerRef.current = createOffscreenCanvas(1, 1);
            }
            renderBlockedLayer(blockedLayerRef.current, resolutionScale, worldBounds);
            dirtyFlagsRef.current.blocked = false;
        }
        dirtyFlagsRef.current.resolution = false;
    }, [renderBaseLayer, renderBlockedLayer, createOffscreenCanvas, scale]);
    
    // Draw all seats using blitting for base/blocked layers, vector for overlays
    // Interne Funktion mit expliziten scale/offset Parametern für optimiertes Rendering
    const drawSeatsWithValues = useCallback((
        ctx: CanvasRenderingContext2D, 
        canvas: HTMLCanvasElement, 
        renderScale: number, 
        renderOffset: { x: number; y: number }
    ) => {
        const worldBounds = worldBoundsRef.current;
        if (!worldBounds) {
            // Fallback: draw directly if world bounds not available
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ECEAE6';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }

        // Rebuild layers if needed (nur wenn nicht während Drag/Pinch)
        if (!isDraggingRef.current && !isPinchingRefForRender.current) {
            rebuildLayersIfNeeded();
        }

        // Clear canvas
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ECEAE6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Save context state
        ctx.save();

        // Apply transformations mit übergebenen Werten
        ctx.translate(renderOffset.x, renderOffset.y);
        ctx.scale(renderScale, renderScale);

        // Blit base layer (source is in world coordinates, already scaled by actualLayerScale)
        // Enable smoothing while drawing images to avoid jagged edges when downscaling
        const prevImageSmoothing = (ctx as any).imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        if (baseLayerRef.current) {
            const actualScale = actualLayerScaleRef.current;
            const sourceWidth = baseLayerRef.current.width / actualScale;
            const sourceHeight = baseLayerRef.current.height / actualScale;
            
            // Draw the entire offscreen canvas at world coordinates
            // The offscreen canvas covers worldBounds, so we draw it at worldBounds.minX/minY
            ctx.drawImage(
                baseLayerRef.current as CanvasImageSource,
                0, 0, baseLayerRef.current.width, baseLayerRef.current.height, // Source: entire offscreen canvas
                worldBounds.minX, worldBounds.minY, sourceWidth, sourceHeight // Destination: world coordinates
            );
        }

        // Blit blocked layer
        // Draw blocked layer without smoothing to prevent base colors bleeding through edges
        if (blockedLayerRef.current) {
            ctx.imageSmoothingEnabled = false;
            const actualScale = actualLayerScaleRef.current;
            const sourceWidth = blockedLayerRef.current.width / actualScale;
            const sourceHeight = blockedLayerRef.current.height / actualScale;
            
            // Draw the entire offscreen canvas at world coordinates
            ctx.drawImage(
                blockedLayerRef.current as CanvasImageSource,
                0, 0, blockedLayerRef.current.width, blockedLayerRef.current.height, // Source: entire offscreen canvas
                worldBounds.minX, worldBounds.minY, sourceWidth, sourceHeight // Destination: world coordinates
            );
        }
        // Restore previous smoothing preference for vector overlays
        ctx.imageSmoothingEnabled = prevImageSmoothing;

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
    }, [selectedSeats, hoveredSeat, selectionColor, selectionRect, isWheelchairMode, getCachedPath, rebuildLayersIfNeeded]);

    // Optimierte Render-Funktion mit requestAnimationFrame
    const scheduleRender = useCallback(() => {
        if (pendingRenderRef.current) return; // Bereits geplant
        pendingRenderRef.current = true;
        
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        
        animationFrameRef.current = requestAnimationFrame(() => {
            pendingRenderRef.current = false;
            animationFrameRef.current = null;
            
            const canvas = canvasRef.current;
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            // Verwende aktuelle Werte aus Refs während Drag/Pinch
            const currentScale = isDraggingRef.current || isPinchingRefForRender.current ? scaleRef.current : scale;
            const currentOffset = isDraggingRef.current || isPinchingRefForRender.current ? offsetRef.current : offset;
            
            drawSeatsWithValues(ctx, canvas, currentScale, currentOffset);
        });
    }, [drawSeatsWithValues, scale, offset]);

    // Wrapper-Funktion für Kompatibilität mit bestehendem Code
    const drawSeats = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        drawSeatsWithValues(ctx, canvas, scale, offset);
    }, [drawSeatsWithValues, scale, offset]);

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
            const currentOffsetX = startOffset.x + (targetOffset.x - startOffset.x) * easeOutQuart;
            const currentOffsetY = startOffset.y + (targetOffset.y - startOffset.y) * easeOutQuart;

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
        if (seatId && !blockedSetRef.current.has(seatId)) {
            const seat = seatsByIdRef.current.get(seatId);
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
    }, [isDragging, hasDragged, isSelecting, hasSelected, isZooming, getSeatAtPoint, selectedSeats, onSeatClick, onSeatDeselect, seatGroups, scale, offset, animateZoom, isWheelchairMode]);


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
                // Verwende immer offsetRef.current (aktueller Wert) für konsistente Drag-Berechnung
                // Dies verhindert Sprünge wenn State noch nicht aktualisiert wurde
                const currentOffset = offsetRef.current;
                lastOffsetRef.current = currentOffset;
                
                setIsDragging(true);
                isDraggingRef.current = true;
                setHasDragged(false);
                setDragStart({ x: event.clientX, y: event.clientY });
                setLastOffset(currentOffset); // Für Kompatibilität mit bestehendem Code
            }
        }
    }, [scale]);

    // Handle touch start for mobile panning
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
        
        // Start panning only if scale >= 2 (200% zoom or higher)
        if (scale >= 2) {
            // Verwende immer offsetRef.current (aktueller Wert) für konsistente Drag-Berechnung
            // Dies verhindert Sprünge wenn State noch nicht aktualisiert wurde
            const currentOffset = offsetRef.current;
            lastOffsetRef.current = currentOffset;
            setLastOffset(currentOffset); // Für Kompatibilität mit bestehendem Code
            
            setIsDragging(true);
            isDraggingRef.current = true;
            // Prevent default touch behavior when panning is enabled
            event.preventDefault();
            event.stopPropagation();
        }
    }, [scale]);

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
                // Verwende lastOffsetRef für konsistente Berechnung während Drag
                let newOffsetX = lastOffsetRef.current.x + deltaX;
                let newOffsetY = lastOffsetRef.current.y + deltaY;

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
                    const paddingX = 6;
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
                // Update Refs für optimiertes Rendering während Drag
                offsetRef.current = { x: newOffsetX, y: newOffsetY };
                scheduleRender(); // Render mit requestAnimationFrame
            } else {
                // Verwende lastOffsetRef für konsistente Berechnung
                offsetRef.current = { x: lastOffsetRef.current.x + deltaX, y: lastOffsetRef.current.y + deltaY };
                scheduleRender();
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
                    const seat = seatsByIdRef.current.get(seatId);
                    if (seat) {
                        const typeAllowed = isWheelchairMode || (seat.type !== 'wheelchair' && seat.type !== 'wheelchair_side' && seat.type !== 'wheelchair_accompaniment');
                        const notBlocked = !blockedSetRef.current.has(seatId);
                        shouldShowHover = typeAllowed && notBlocked;
                    }
                }

                setCursorStyle(shouldShowHover ? 'pointer' : 'default');
                setHoveredSeat(shouldShowHover ? seatId : null);

                // Set hovered seat info for tooltip
                if (seatId && !blockedSetRef.current.has(seatId) && shouldShowHover) {
                    const seatInfo = seatsByIdRef.current.get(seatId);
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
    }, [isDragging, isSelecting, selectionRect, dragStart, getSeatAtPoint, isWheelchairMode, scale, scheduleRender]);

    // Handle touch move for mobile panning
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
            // Verwende lastOffsetRef für konsistente Berechnung während Drag
            let newOffsetX = lastOffsetRef.current.x + deltaX;
            let newOffsetY = lastOffsetRef.current.y + deltaY;

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
                const paddingX = 6;
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
                // Update Refs für optimiertes Rendering während Drag
                offsetRef.current = { x: newOffsetX, y: newOffsetY };
                scheduleRender(); // Render mit requestAnimationFrame
        } else {
            // Verwende lastOffsetRef für konsistente Berechnung
            offsetRef.current = { x: lastOffsetRef.current.x + deltaX, y: lastOffsetRef.current.y + deltaY };
            scheduleRender();
        }

        // Prevent default touch behavior when actively panning
        event.preventDefault();
        event.stopPropagation();
    }, [isDragging, dragStart, scale, scheduleRender]);

    // Keep refs in sync for native touch handlers
    useEffect(() => { scaleRef.current = scale; }, [scale]);
    useEffect(() => { 
        offsetRef.current = offset;
        // Synchronisiere auch lastOffsetRef wenn nicht während Drag (während Drag wird es explizit gesetzt)
        if (!isDraggingRef.current) {
            lastOffsetRef.current = offset;
        }
    }, [offset]);

    // Native non-passive touch listeners for iOS to support pinch-zoom and prevent page zoom
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
                    const paddingX = 6;
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
                isPinchingRefForRender.current = true;
                setIsDragging(false);
                isDraggingRef.current = false;
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
                    x: mid.x - pinchStartWorldRef.current.x * targetScale,
                    y: mid.y - pinchStartWorldRef.current.y * targetScale,
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
                const rectBounds = canvas.getBoundingClientRect();
                if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
                    const paddingX = 6;
                    const paddingTop = 0;
                    const paddingBottom = 50;
                    const overscrollX = 100;
                    const overscrollY = 80;
                    const minOffsetX = (rectBounds.width - paddingX) - maxX * targetScale;
                    const maxOffsetXClamp = paddingX - minX * targetScale;
                    const minOffsetY = (rectBounds.height - paddingBottom) - maxY * targetScale;
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
                // Verwende scheduleRender statt direkter State-Updates während Pinch
                scheduleRender();
            }
        };

        const handleNativeTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2 && isPinching) {
                e.preventDefault();
                e.stopPropagation();
                // Finale State-Updates nach Pinch - synchronisiere alles sofort
                const finalScale = scaleRef.current;
                const finalOffset = offsetRef.current;
                setScale(finalScale);
                setOffset(finalOffset);
                // Refs explizit synchronisieren für sofortige Konsistenz
                scaleRef.current = finalScale;
                offsetRef.current = finalOffset;
                lastOffsetRef.current = finalOffset;
                pinchStartDistanceRef.current = null;
                pinchStartWorldRef.current = null;
                setIsPinching(false);
                isPinchingRef.current = false;
                isPinchingRefForRender.current = false;
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
    }, [isPinching, scheduleRender]);

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
                    !blockedSetRef.current.has(seat.id); // Exclude blocked seats
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

        // Finale State-Updates nach Drag - synchronisiere alles sofort
        if (isDraggingRef.current) {
            const finalOffset = offsetRef.current;
            // State aktualisieren (asynchron, aber Refs sind bereits korrekt)
            setOffset(finalOffset);
            // Refs explizit synchronisieren für sofortige Konsistenz
            offsetRef.current = finalOffset;
            lastOffsetRef.current = finalOffset;
            isDraggingRef.current = false;
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
    }, [isSelecting, selectionRect, selectedSeats, onSeatClick, seatGroups, scale, offset, isWheelchairMode]);

    // Handle touch end for mobile panning
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
                    const targetScale = 3.5;
                    // Calculate new offset so that the touched point stays under the touch
                    const scaleChange = targetScale / scale;
                    const newOffsetX = x - (x - offset.x) * scaleChange;
                    const newOffsetY = y - (y - offset.y) * scaleChange;

                    animateZoom(targetScale, { x: newOffsetX, y: newOffsetY });
                } else {
                    // Only allow seat selection at 200% zoom or higher
                    const seatId = getSeatAtPoint(x, y);
                    if (seatId && !blockedSetRef.current.has(seatId)) {
                        const seat = seatsByIdRef.current.get(seatId);
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

        // Finale State-Updates nach Drag - synchronisiere alles sofort
        if (isDraggingRef.current) {
            const finalOffset = offsetRef.current;
            // State aktualisieren (asynchron, aber Refs sind bereits korrekt)
            setOffset(finalOffset);
            // Refs explizit synchronisieren für sofortige Konsistenz
            offsetRef.current = finalOffset;
            lastOffsetRef.current = finalOffset;
            isDraggingRef.current = false;
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
    }, [isDragging, scale, hasDragged, isZooming, offset, animateZoom, getSeatAtPoint, isWheelchairMode, selectedSeats, seatGroups, onSeatClick, onSeatDeselect]);

    

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
        const paddingX = 6; // 0px padding on sides
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

    // Expose imperative zoom controls (after helpers are declared)
    useImperativeHandle(ref, () => ({
        zoomIn: () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const targetScale = scale < 2 ? 2 : Math.min(5, scale * 1.5);
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const scaleChange = targetScale / scale;
            const newOffsetX = centerX - (centerX - offset.x) * scaleChange;
            const newOffsetY = centerY - (centerY - offset.y) * scaleChange;
            animateZoom(targetScale, { x: newOffsetX, y: newOffsetY });
        },
        zoomOut: () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const targetScale = Math.max(1, scale / 1.5);
            if (targetScale < 2) {
                const { x, y, scale: initialScale } = calculateCenteredPosition(
                    seatsRef.current,
                    rect.width,
                    rect.height
                );
                animateZoom(initialScale, { x, y });
                return;
            }
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const scaleChange = targetScale / scale;
            const newOffsetX = centerX - (centerX - offset.x) * scaleChange;
            const newOffsetY = centerY - (centerY - offset.y) * scaleChange;
            animateZoom(targetScale, { x: newOffsetX, y: newOffsetY });
        },
        resetView: () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const { x, y, scale: initialScale } = calculateCenteredPosition(
                seatsRef.current,
                rect.width,
                rect.height
            );
            animateZoom(initialScale, { x, y });
        },
    }), [scale, offset, animateZoom, calculateCenteredPosition]);

    // Initialize canvas
    useEffect(() => {
        if (!canvasRef.current) return;

        // Update current svgContent ref to prevent race conditions
        currentSvgContentRef.current = svgContent;

        // Parse seats and legends
        const seats = parseSvgSeats(svgContent, seatGroups);
        const legends = parseSvgLegends(svgContent);
        seatsRef.current = seats;
        legendsRef.current = legends;
        seatsByIdRef.current = new Map(seats.map(seat => [seat.id, seat]));

        // Optional: große Reservierungssimulation über URL-Parameter (?sim=4000 oder ?simBlocked=4000)
        try {
            const params = new URLSearchParams(window.location.search);
            const simParam = params.get('sim') || params.get('simBlocked');
            const requested = simParam ? parseInt(simParam, 10) : 0;
            if (requested && requested > 0) {
                // Bevorzugt normale Plätze, um Zusatzlogik (Rollstuhl) gering zu halten
                const normalSeats = seats.filter(s => s.type === 'normal');
                const count = Math.min(requested, normalSeats.length);
                const picked = normalSeats.slice(0, count).map(s => s.id);
                setSimBlocked(picked);
            } else {
                setSimBlocked([]);
            }
        } catch {
            setSimBlocked([]);
        }

        // Calculate and store world bounds
        const worldBounds = calculateWorldBounds(seats, legends);
        worldBoundsRef.current = worldBounds;

        // Mark base layer as dirty when SVG content or seat groups change
        dirtyFlagsRef.current.base = true;
        dirtyFlagsRef.current.blocked = true;
        // Reset offscreen layers to avoid showing stale content from previous events
        baseLayerRef.current = null;
        blockedLayerRef.current = null;

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
        setOffset({ x, y });
        setScale(initialScale);

        // Initial draw will happen in the next useEffect due to state changes
    }, [svgContent, seatGroups, parseSvgSeats, parseSvgLegends, calculateCenteredPosition, calculateWorldBounds]);

    // Removed pre-render optimization per request

    // Redraw when selections or transformations change
    useEffect(() => {
        // Verwende scheduleRender für optimiertes Rendering mit requestAnimationFrame
        // Nur wenn nicht während Drag/Pinch (dann wird bereits durch scheduleRender gerendert)
        if (!isDraggingRef.current && !isPinchingRefForRender.current) {
            scheduleRender();
        }
    }, [selectedSeats, hoveredSeat, scale, offset, isWheelchairMode, seatGroups, scheduleRender]);

    // Recolor seats when seatGroups change (asynchrones Nachladen wie Desktop)
    useEffect(() => {
        // Race condition prevention: Ignore seatGroups if they don't match current svgContent
        if (currentSvgContentRef.current !== svgContent) return;
        if (!seatsRef.current.length) return;
        if (!seatGroups || seatGroups.length === 0) return;
        const seatGroupMap = new Map<string, CompleteSeatGroup>();
        seatGroups.forEach(group => {
            group.seats.forEach(seat => {
                seatGroupMap.set(seat.seat_number, group);
            });
        });
        let changed = false;
        for (const seat of seatsRef.current) {
            const group = seatGroupMap.get(seat.seat_number);
            const newColor = group?.color || '#f3f4f6';
            const newGroupId = group?.id;
            if (seat.color !== newColor || seat.seatGroupId !== newGroupId) {
                seat.color = newColor;
                seat.seatGroupId = newGroupId;
                changed = true;
            }
        }
        if (changed) {
            dirtyFlagsRef.current.base = true;
        }
    }, [seatGroups, svgContent]);

    // Update blockedSetRef when allBlockedSeats changes
    useEffect(() => {
        blockedSetRef.current = new Set(allBlockedSeats);
        dirtyFlagsRef.current.blocked = true;
    }, [allBlockedSeats]);

    // Sofortige Entkopplung alter Reservierungen bei Event/Plan-Wechsel
    useEffect(() => {
        // Leere Blocked-Set sofort, um alte Reservierungen nicht anzuzeigen,
        // bis die neuen Daten eingetroffen sind und allBlockedSeats neu berechnet wurde.
        blockedSetRef.current = new Set();
        dirtyFlagsRef.current.base = true;
        dirtyFlagsRef.current.blocked = true;
    }, [seatGroups, svgContent]);

    // Mark base layer as dirty when wheelchair mode changes
    useEffect(() => {
        dirtyFlagsRef.current.base = true;
        dirtyFlagsRef.current.blocked = true;
        // Trigger immediate redraw so the offscreen layers rebuild with the new mode
        scheduleRender();
    }, [isWheelchairMode, scheduleRender]);

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

            scheduleRender();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [scheduleRender]);

    return (
        <>
            <div className={`${className} overflow-x-hidden`}>
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
        </>
    );
});

export default SeatPlanViewerMobile;
