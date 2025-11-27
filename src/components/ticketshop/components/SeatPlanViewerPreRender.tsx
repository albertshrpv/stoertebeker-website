import { useEffect, useRef, useCallback, useState } from 'react';
import type { CompleteSeatGroup } from '../types/pricing';

export interface SeatInfo {
    id: string;
    seat_number: string;
    seat_row: number;
    seat_row_number: number;
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
    color?: string; // Color from seat group
    displayName: string; // Human-readable name (e.g., "Reihe 1, Platz 5")
}

export interface SeatPlanEditorProps {
    svgContent: string;
    seatGroups: CompleteSeatGroup[];
    selectedSeats: string[];
    blockedSeats?: string[];
    onSeatClick: (seatId: string, seatGroup: CompleteSeatGroup, seatInfo: SeatInfo) => void;
    onSeatDeselect: (seatId: string, seatInfo?: SeatInfo) => void;
    onSeatsLoaded?: (seats: SeatInfo[]) => void; // New callback for when seats are parsed
    className?: string;
}

export default function SeatPlanViewer({
    svgContent,
    seatGroups,
    selectedSeats,
    blockedSeats = [],
    onSeatClick,
    onSeatDeselect,
    onSeatsLoaded,
    className = '',
}: SeatPlanEditorProps) {
    // Available utility functions for external access (via ref or callback):
    // - getSeatByRowAndNumber(row: number, seatNumber: number): SeatInfo | null
    // - getSeatsByRow(row: number): SeatInfo[]
    // - getRowInfo(): Array<{rowNumber: number, seatCount: number, seats: SeatInfo[]}>

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const seatsRef = useRef<SeatInfo[]>([]);
    const baseLayerCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const baseLayerBoundsRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
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
    const pathCacheRef = useRef<Map<string, Path2D>>(new Map());
    const DRAG_THRESHOLD = 5; // px
    const selectionColor = '#19263D'; // Blue color for selections
    const blockedSeatColor = '#989898';
    const strokeColor = '#19263D';
    const hoverColor = '#19263D';


    // Parse seats from SVG using pre-enriched attributes and map to seat groups
    const parseSvgSeats = useCallback((svgContent: string, seatGroups: CompleteSeatGroup[]): SeatInfo[] => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');
        const paths = doc.querySelectorAll('path[id]');

        // Create a map of seat number to seat group for faster lookup
        const seatGroupMap = new Map<string, CompleteSeatGroup>();
        seatGroups.forEach(group => {
            group.seats.forEach(seat => {
                seatGroupMap.set(seat.seat_number, group);
            });
        });

        // Convert to array and extract path information from attributes (no sorting/grouping here)
        const seats: SeatInfo[] = Array.from(paths).map(path => {
            const pathData = path.getAttribute('d') || '';
            const idAttr = path.getAttribute('id') || '';
            const seatNumberAttr = path.getAttribute('seat_number') || idAttr;
            const seatRowAttr = path.getAttribute('seat_row');
            const seatRowNumberAttr = path.getAttribute('seat_row_number');

            // Extract bounding box and center coordinates from path data
            const bounds = extractBoundsFromPath(pathData);

            const seatGroup = seatGroupMap.get(seatNumberAttr);

            const seat_row = seatRowAttr ? parseInt(seatRowAttr, 10) : 0;
            const seat_row_number = seatRowNumberAttr ? parseInt(seatRowNumberAttr, 10) : 0;

            return {
                id: seatNumberAttr,
                seat_number: seatNumberAttr,
                seat_row,
                seat_row_number,
                cx: (bounds.minX + bounds.maxX) / 2,
                cy: (bounds.minY + bounds.maxY) / 2,
                pathData,
                bounds,
                seatGroupId: seatGroup?.id,
                color: seatGroup?.color || '#f3f4f6',
                displayName: `Reihe ${seat_row}, Platz ${seat_row_number}`
            };
        });

        return seats;
    }, []);

    // Utility function to get seat by row and seat number
    const getSeatByRowAndNumber = useCallback((row: number, seatNumber: number): SeatInfo | null => {
        return seatsRef.current.find(seat => seat.seat_row === row && seat.seat_row_number === seatNumber) || null;
    }, []);

    // Utility function to get all seats in a specific row
    const getSeatsByRow = useCallback((row: number): SeatInfo[] => {
        return seatsRef.current.filter(seat => seat.seat_row === row);
    }, []);

    // Utility function to get row information
    const getRowInfo = useCallback(() => {
        const rows = new Map<number, { count: number; seats: SeatInfo[] }>();

        seatsRef.current.forEach(seat => {
            if (!rows.has(seat.seat_row)) {
                rows.set(seat.seat_row, { count: 0, seats: [] });
            }
            const rowData = rows.get(seat.seat_row)!;
            rowData.count++;
            rowData.seats.push(seat);
        });

        return Array.from(rows.entries()).map(([rowNumber, data]) => ({
            rowNumber,
            seatCount: data.count,
            seats: data.seats.sort((a, b) => a.seat_row_number - b.seat_row_number)
        }));
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

    // Draw all seats using pre-rendered base layer and lightweight overlays (selected/hovered)
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

        // Draw pre-rendered base layer (all seats colored + blocked overlay) when zoomed in; otherwise draw vectors directly for best clarity
        if (scale > 1.05 && baseLayerCanvasRef.current && baseLayerBoundsRef.current) {
            const { minX, minY, maxX, maxY } = baseLayerBoundsRef.current;
            const width = maxX - minX;
            const height = maxY - minY;
            // Ensure crisp rendering when scaling
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
                baseLayerCanvasRef.current,
                0,
                0,
                baseLayerCanvasRef.current.width,
                baseLayerCanvasRef.current.height,
                minX,
                minY,
                width,
                height
            );
        } else {
            // Fallback: simple per-seat draw (should be rare if base built correctly)
            // Draw non-blocked seats in their colors
            for (const seat of seatsRef.current) {
                if (blockedSeats.includes(seat.id)) continue;
                ctx.fillStyle = seat.color || '#f3f4f6';
                const path = getCachedPath(seat.pathData);
                ctx.fill(path);
            }
            // Draw blocked seats overlay
            ctx.fillStyle = blockedSeatColor;
            for (const seat of seatsRef.current) {
                if (!blockedSeats.includes(seat.id)) continue;
                const path = getCachedPath(seat.pathData);
                ctx.fill(path);
            }
        }

        // Draw selected seats (blue)
        if (selectedSeats.length > 0) {
            ctx.fillStyle = selectionColor;
            for (const seatId of selectedSeats) {
                const seat = seatsRef.current.find(s => s.id === seatId);
                if (!seat) continue;
                const path = getCachedPath(seat.pathData);
                ctx.fill(path);
            }
        }

        // Draw hovered seat (blue with opacity)
        if (hoveredSeat) {
            const seat = seatsRef.current.find(s => s.id === hoveredSeat);
            if (seat) {
                ctx.fillStyle = `${hoverColor}40`;
                const path = getCachedPath(seat.pathData);
                ctx.fill(path);
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

        // Restore context state
        ctx.restore();

        // const endTime = performance.now();
        // const totalSeats = seatsRef.current.length;
        // console.log(`Draw time: ${endTime - startTime}ms, Total seats: ${totalSeats}, Cache size: ${pathCacheRef.current.size}`);
    }, [selectedSeats, blockedSeats, hoveredSeat, selectionColor, scale, offset, selectionRect, getCachedPath]);

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
        if (seatId && !blockedSeats.includes(seatId)) {
            const seat = seatsRef.current.find(s => s.id === seatId);
            if (seat) {
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
    }, [isDragging, hasDragged, isSelecting, hasSelected, isZooming, getSeatAtPoint, selectedSeats, onSeatClick, onSeatDeselect, seatGroups, scale, offset, blockedSeats, animateZoom]);

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
            setIsSelecting(true);
            setSelectionRect({ x1: x, y1: y, x2: x, y2: y });
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

            setOffset({
                x: lastOffset.x + deltaX,
                y: lastOffset.y + deltaY
            });
        } else {
            // Track mouse position for tooltip
            setMousePosition({ x: event.clientX, y: event.clientY });

            // Check if mouse is over a seat for cursor update and hover (only at 200%+ zoom)
            if (scale >= 2) {
                const seatId = getSeatAtPoint(x, y);
                setCursorStyle(seatId ? 'pointer' : 'default');
                setHoveredSeat(seatId);

                // Set hovered seat info for tooltip
                if (seatId && !blockedSeats.includes(seatId)) {
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
    }, [isDragging, isSelecting, selectionRect, dragStart, lastOffset, getSeatAtPoint]);

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
                return seat.cx >= Math.min(canvasX1, canvasX2) &&
                    seat.cx <= Math.max(canvasX1, canvasX2) &&
                    seat.cy >= Math.min(canvasY1, canvasY2) &&
                    seat.cy <= Math.max(canvasY1, canvasY2) &&
                    !blockedSeats.includes(seat.id); // Exclude blocked seats
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
    }, [isSelecting, selectionRect, selectedSeats, onSeatClick, seatGroups, scale, offset, blockedSeats]);

    // Calculate centered position for seats
    const calculateCenteredPosition = useCallback((seats: SeatInfo[], canvasWidth: number, canvasHeight: number) => {
        if (seats.length === 0) return { x: 0, y: 0, scale: 0.8 };

        // Calculate bounding box of all seats
        const minX = Math.min(...seats.map(seat => seat.bounds.minX));
        const maxX = Math.max(...seats.map(seat => seat.bounds.maxX));
        const minY = Math.min(...seats.map(seat => seat.bounds.minY));
        const maxY = Math.max(...seats.map(seat => seat.bounds.maxY));

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const contentCenterX = minX + contentWidth / 2;
        const contentCenterY = minY + contentHeight / 2;

        // Calculate scale to fit with padding
        const padding = 40; // 40px padding on all sides
        const availableWidth = canvasWidth - (padding * 2);
        const availableHeight = canvasHeight - (padding * 2);

        const scaleX = availableWidth / contentWidth;
        const scaleY = availableHeight / contentHeight;
        const fitScale = Math.min(scaleX, scaleY, 0.8); // Don't scale up beyond original size

        // Calculate offset to center the content
        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = canvasHeight / 2;

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

        // Parse seats
        const seats = parseSvgSeats(svgContent, seatGroups);
        seatsRef.current = seats;

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
    }, [svgContent, seatGroups, parseSvgSeats, calculateCenteredPosition]);

    // Build pre-rendered base layer canvas (all seats colored + blocked overlay) at current DPI and zoom for crispness
    useEffect(() => {
        if (seatsRef.current.length === 0) return;
        // Avoid rebuilding continuously during zoom animation; rebuild when animation ends
        if (isZooming) return;

        const dpi = window.devicePixelRatio || 1;

        // Compute global bounds in seat coordinate space
        const minX = Math.min(...seatsRef.current.map(seat => seat.bounds.minX));
        const maxX = Math.max(...seatsRef.current.map(seat => seat.bounds.maxX));
        const minY = Math.min(...seatsRef.current.map(seat => seat.bounds.minY));
        const maxY = Math.max(...seatsRef.current.map(seat => seat.bounds.maxY));
        const contentWidth = Math.max(1, Math.ceil(maxX - minX));
        const contentHeight = Math.max(1, Math.ceil(maxY - minY));

        // Render at exact zoom factor for 1:1 pixel mapping to avoid resampling blur
        const scaleFactor = dpi * Math.max(0.01, scale);
        const offWidth = Math.max(1, Math.round(contentWidth * scaleFactor));
        const offHeight = Math.max(1, Math.round(contentHeight * scaleFactor));

        const offscreen = document.createElement('canvas');
        offscreen.width = offWidth;
        offscreen.height = offHeight;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) return;

        offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
        offCtx.save();
        // Align seat coordinate space to offscreen pixels
        offCtx.scale(scaleFactor, scaleFactor);
        offCtx.translate(-minX, -minY);
        offCtx.imageSmoothingEnabled = false;

        // Draw all seats with their colors
        for (const seat of seatsRef.current) {
            offCtx.fillStyle = seat.color || '#f3f4f6';
            const p = getCachedPath(seat.pathData);
            offCtx.fill(p);
        }

        // Draw blocked seats overlay (gray)
        offCtx.fillStyle = '#989898';
        for (const seat of seatsRef.current) {
            if (!blockedSeats.includes(seat.id)) continue;
            const p = getCachedPath(seat.pathData);
            offCtx.fill(p);
        }
        offCtx.restore();

        baseLayerCanvasRef.current = offscreen;
        baseLayerBoundsRef.current = { minX, minY, maxX, maxY };
    }, [svgContent, blockedSeats, getCachedPath, scale, isZooming]);

    // Redraw when selections or transformations change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        drawSeats(ctx, canvas);
    }, [selectedSeats, blockedSeats, hoveredSeat, scale, offset, drawSeats]);

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
                            cursor: isDragging ? 'grabbing' : isSelecting ? 'crosshair' : cursorStyle
                        }}
                        onClick={handleCanvasClick}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => {
                            handleMouseUp();
                            setHoveredSeatInfo(null);
                        }}
                    />

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
                            title="Zoom In"
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
                                animateZoom(initialScale, { x, y });
                            }}
                            className="w-full h-full flex items-center justify-center hover:bg-gray-100 rounded text-black"
                            title="Reset View"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 10H6V15M15 6H10V1" stroke="black" strokeWidth="1.11" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button
                            onClick={() => {
                                const newScale = Math.max(0.8, scale / 1.5);
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
                            title="Zoom Out"
                        >
                            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14.6938 7.34674L1.47583 7.34674" stroke="black" strokeWidth="1.10906" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Legend - bottom left */}
                    {/* <div className="flex flex-col gap-2 absolute bottom-4 left-4 text-xs text-gray-600">
                        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-sm">
                            <div>Sitzplatz anklicken, um diesen auszuwählen</div>
                        </div>
                    </div> */}

                    {/* Seat Group Legend - bottom center */}
                    {/* <div className="absolute bottom-8 left-8 right-8 w-[calc(100%-64px)] p-4 bg-white rounded-xl">
                        <div className="flex flex-wrap gap-4 justify-evenly">
                            {seatGroups.map(group => (
                                <div key={group.id} className="flex items-center gap-3">
                                    <div
                                        className="w-6 h-6 rounded-full border border-black/40"
                                        style={{ backgroundColor: group.color }}
                                    />
                                    <div>
                                        <div className="font-medium text-black">{group.name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div> */}

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
                            <div className="text-xs text-gray-300">ID: {hoveredSeatInfo.id}</div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
} 