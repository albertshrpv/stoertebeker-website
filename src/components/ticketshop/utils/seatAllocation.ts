import type { CompleteSeatGroup, CompleteSeat } from '../types/pricing';

export interface SeatAllocationResult {
    success: boolean;
    allocatedSeats: string[];
    message?: string;
}

export interface SeatWithPosition extends CompleteSeat {
    row?: number;
    position?: number;
}

// New interfaces for the optimized algorithm
interface RowConfig {
    rowNumber: number;
    totalSeats: number;
    leftSegmentEnd: number;    // Last seat in left segment (before aisle)
    rightSegmentStart: number; // First seat in right segment (after aisle)
}

interface SeatBlock {
    seats: number[];
    segment: 'left' | 'right' | 'spanning';
    row: number;
}

interface ParsedSeat {
    row: number;
    position: number;
    original: CompleteSeat;
}

// Row configurations based on the venue layout
const ROW_CONFIGURATIONS: RowConfig[] = [
    { rowNumber: 1, totalSeats: 86, leftSegmentEnd: 43, rightSegmentStart: 44 },
    { rowNumber: 2, totalSeats: 88, leftSegmentEnd: 44, rightSegmentStart: 45 },
    { rowNumber: 3, totalSeats: 90, leftSegmentEnd: 45, rightSegmentStart: 46 },
    { rowNumber: 4, totalSeats: 92, leftSegmentEnd: 46, rightSegmentStart: 47 },
    { rowNumber: 5, totalSeats: 94, leftSegmentEnd: 47, rightSegmentStart: 48 },
];

// Row 6+ configuration (all subsequent rows)
const DEFAULT_ROW_CONFIG: Omit<RowConfig, 'rowNumber'> = {
    totalSeats: 96,
    leftSegmentEnd: 48,
    rightSegmentStart: 49
};

/**
 * Get row configuration for a given row number
 */
function getRowConfig(rowNumber: number): RowConfig {
    const config = ROW_CONFIGURATIONS.find(config => config.rowNumber === rowNumber);
    if (config) {
        return config;
    }
    
    // Use default config for row 6+
    return {
        rowNumber,
        ...DEFAULT_ROW_CONFIG
    };
}

/**
 * Group seats by row using seat_row and seat_row_number from CompleteSeat
 */
function groupSeatsByRow(seats: CompleteSeat[]): Map<number, ParsedSeat[]> {
    const seatsByRow = new Map<number, ParsedSeat[]>();
    for (const seat of seats) {
        const row = Number(seat.seat_row);
        const position = Number(seat.seat_row_number);
        if (!Number.isFinite(row) || !Number.isFinite(position)) continue;
        const parsedSeat: ParsedSeat = { row, position, original: seat };
        if (!seatsByRow.has(row)) seatsByRow.set(row, []);
        seatsByRow.get(row)!.push(parsedSeat);
    }
    for (const [, rowSeats] of seatsByRow) {
        rowSeats.sort((a, b) => a.position - b.position);
    }
    return seatsByRow;
}

/**
 * Check if a consecutive block of seats is available
 */
function isConsecutiveBlockAvailable(
    startPosition: number, 
    endPosition: number, 
    availablePositions: Set<number>
): boolean {
    for (let pos = startPosition; pos <= endPosition; pos++) {
        if (!availablePositions.has(pos)) {
            return false;
        }
    }
    return true;
}

/**
 * Calculate center distance for a group of seats within a row
 */
function calculateCenterDistance(seatPositions: number[], rowConfig: RowConfig): number {
    // Calculate center of the entire row (including aisle)
    const rowCenter = (rowConfig.totalSeats + 1) / 2;
    
    // Calculate center of the selected seat group
    const groupCenter = (Math.min(...seatPositions) + Math.max(...seatPositions)) / 2;
    
    return Math.abs(groupCenter - rowCenter);
}

/**
 * Find continuous block in left segment (working from center outward)
 */
function findContinuousInLeftSegment(
    rowConfig: RowConfig, 
    quantity: number, 
    availablePositions: Set<number>
): SeatBlock | null {
    // Start from best seat (rightmost in left segment) and work towards seat 1
    for (let endPosition = rowConfig.leftSegmentEnd; endPosition >= quantity; endPosition--) {
        const startPosition = endPosition - quantity + 1;
        
        if (startPosition >= 1 && isConsecutiveBlockAvailable(startPosition, endPosition, availablePositions)) {
            const seats = Array.from({length: quantity}, (_, i) => startPosition + i);
            return {
                seats,
                segment: 'left',
                row: rowConfig.rowNumber
            };
        }
    }
    
    return null;
}

/**
 * Find continuous block in right segment (working from center outward)
 */
function findContinuousInRightSegment(
    rowConfig: RowConfig, 
    quantity: number, 
    availablePositions: Set<number>
): SeatBlock | null {
    // Start from best seat (leftmost in right segment) and work towards last seat
    const maxEndPosition = rowConfig.totalSeats;
    
    for (let startPosition = rowConfig.rightSegmentStart; startPosition + quantity - 1 <= maxEndPosition; startPosition++) {
        const endPosition = startPosition + quantity - 1;
        
        if (isConsecutiveBlockAvailable(startPosition, endPosition, availablePositions)) {
            return {
                seats: Array.from({length: quantity}, (_, i) => startPosition + i),
                segment: 'right',
                row: rowConfig.rowNumber
            };
        }
    }
    
    return null;
}

/**
 * Find the best continuous block within a row (checks both segments)
 */
function findBestContinuousBlock(
    rowConfig: RowConfig, 
    quantity: number, 
    availablePositions: Set<number>
): SeatBlock | null {
    const leftBlock = findContinuousInLeftSegment(rowConfig, quantity, availablePositions);
    const rightBlock = findContinuousInRightSegment(rowConfig, quantity, availablePositions);
    
    // If both blocks available, choose the one closest to center
    if (leftBlock && rightBlock) {
        const leftDistance = calculateCenterDistance(leftBlock.seats, rowConfig);
        const rightDistance = calculateCenterDistance(rightBlock.seats, rowConfig);
        
        return leftDistance <= rightDistance ? leftBlock : rightBlock;
    }
    
    return leftBlock || rightBlock;
}

/**
 * Find spanning block that crosses the aisle gap
 */
function findCrossAisleBlock(
    rowConfig: RowConfig, 
    quantity: number, 
    availablePositions: Set<number>
): SeatBlock | null {
    // Only attempt spanning if quantity is larger than what either segment can hold
    const leftSegmentSize = rowConfig.leftSegmentEnd;
    const rightSegmentSize = rowConfig.totalSeats - rowConfig.rightSegmentStart + 1;
    
    if (quantity <= Math.max(leftSegmentSize, rightSegmentSize)) {
        return null; // Should be handled by segment search
    }
    
    // Try different combinations of left + right seats
    for (let leftCount = 1; leftCount < quantity; leftCount++) {
        const rightCount = quantity - leftCount;
        
        // Check if we can get leftCount seats from the end of left segment
        const leftStartPos = rowConfig.leftSegmentEnd - leftCount + 1;
        if (leftStartPos >= 1 && 
            isConsecutiveBlockAvailable(leftStartPos, rowConfig.leftSegmentEnd, availablePositions)) {
            
            // Check if we can get rightCount seats from the start of right segment
            const rightEndPos = rowConfig.rightSegmentStart + rightCount - 1;
            if (rightEndPos <= rowConfig.totalSeats && 
                isConsecutiveBlockAvailable(rowConfig.rightSegmentStart, rightEndPos, availablePositions)) {
                
                const leftSeats = Array.from({length: leftCount}, (_, i) => leftStartPos + i);
                const rightSeats = Array.from({length: rightCount}, (_, i) => rowConfig.rightSegmentStart + i);
                
                return {
                    seats: [...leftSeats, ...rightSeats],
                    segment: 'spanning',
                    row: rowConfig.rowNumber
                };
            }
        }
    }
    
    return null;
}

/**
 * Map positions back to original seat IDs
 */
function mapPositionsToSeatIds(rowSeats: ParsedSeat[], positions: number[]): string[] {
    const positionMap = new Map<number, string>();
    
    for (const seat of rowSeats) {
        positionMap.set(seat.position, seat.original.seat_number);
    }
    
    return positions
        .map(pos => positionMap.get(pos))
        .filter(id => id !== undefined) as string[];
}

/**
 * Main optimized seat allocation function
 */
function allocateOptimalSeats(
    quantity: number,
    availableSeats: CompleteSeat[],
    blockedSeats: string[]
): SeatAllocationResult {
    // console.log(`🎯 Allocating ${quantity} seats using seat_row data`);
    
    if (quantity <= 0) {
        return {
            success: false,
            allocatedSeats: [],
            message: 'Invalid quantity'
        };
    }

    // Group seats by row using seat.seat_row and seat.seat_row_number
    const seatsByRow = groupSeatsByRow(availableSeats);
    const blockedSet = new Set(blockedSeats);

    if (seatsByRow.size === 0) {
        // console.log('❌ No row information available on seats');
        return {
            success: false,
            allocatedSeats: [],
            message: 'No row information available for seats'
        };
    }

    // Strategy 1: Find continuous blocks within segments (prioritize by row)
    const maxRow = Math.max(...seatsByRow.keys());
    
    for (let rowNum = 1; rowNum <= maxRow; rowNum++) {
        const rowSeats = seatsByRow.get(rowNum);
        if (!rowSeats || rowSeats.length === 0) continue;

        const rowConfig = getRowConfig(rowNum);
        
        // Get available positions in this row
        const availablePositions = new Set<number>();
        for (const seat of rowSeats) {
            if (!blockedSet.has(seat.original.seat_number)) {
                availablePositions.add(seat.position);
            }
        }

        // Try to find continuous block
        const block = findBestContinuousBlock(rowConfig, quantity, availablePositions);
        if (block) {
            const allocatedSeats = mapPositionsToSeatIds(rowSeats, block.seats);
            // console.log(`✅ Found continuous block in row ${rowNum} (${block.segment}):`, allocatedSeats);
            return {
                success: true,
                allocatedSeats,
                message: `${quantity} continuous seats found in row ${rowNum} (${block.segment} segment)`
            };
        }
    }

    // Strategy 2: Allow cross-aisle spanning within rows
    for (let rowNum = 1; rowNum <= maxRow; rowNum++) {
        const rowSeats = seatsByRow.get(rowNum);
        if (!rowSeats || rowSeats.length === 0) continue;

        const rowConfig = getRowConfig(rowNum);
        
        // Get available positions in this row
        const availablePositions = new Set<number>();
        for (const seat of rowSeats) {
            if (!blockedSet.has(seat.original.seat_number)) {
                availablePositions.add(seat.position);
            }
        }

        const spanningBlock = findCrossAisleBlock(rowConfig, quantity, availablePositions);
        if (spanningBlock) {
            const allocatedSeats = mapPositionsToSeatIds(rowSeats, spanningBlock.seats);
            // console.log(`✅ Found spanning block in row ${rowNum}:`, allocatedSeats);
            return {
                success: true,
                allocatedSeats,
                message: `${quantity} seats found in row ${rowNum} spanning across aisle`
            };
        }
    }

    // console.log('⚠️ Falling back to minimal gap allocation');
    // Strategy 3: Minimal gaps fallback (use legacy implementation for now)
    return findMinimalGapAllocation(quantity, availableSeats, blockedSeats);
}

/**
 * Fallback allocation with minimal gaps (simplified legacy approach)
 */
function findMinimalGapAllocation(
    quantity: number,
    availableSeats: CompleteSeat[],
    blockedSeats: string[]
): SeatAllocationResult {
    const filteredSeats = availableSeats.filter(seat => !blockedSeats.includes(seat.seat_number));
    
    if (filteredSeats.length < quantity) {
        return {
            success: false,
            allocatedSeats: [],
            message: `Only ${filteredSeats.length} seats available, but ${quantity} requested`
        };
    }

    // Simple fallback: take first available seats
    const selectedSeats = filteredSeats.slice(0, quantity);
    return {
        success: true,
        allocatedSeats: selectedSeats.map(seat => seat.seat_number),
        message: `${quantity} seats allocated with potential gaps`
    };
}

/**
 * Main function to allocate best seats for a given seat group and quantity
 * Uses the new optimized algorithm with row-specific configurations if row info is provided
 */
export function allocateBestSeats(
    seatGroup: CompleteSeatGroup,
    quantity: number,
    blockedSeats: string[]
): SeatAllocationResult {
    if (quantity <= 0) {
        return {
            success: false,
            allocatedSeats: [],
            message: 'Invalid quantity'
        };
    }
    
    const availableSeats = seatGroup.seats.filter(seat => 
        !blockedSeats.includes(seat.seat_number)
    );
    
    if (availableSeats.length < quantity) {
        return {
            success: false,
            allocatedSeats: [],
            message: `Nur ${availableSeats.length} Plätze verfügbar, aber ${quantity} angefragt`
        };
    }
    
    // Always use optimized allocation based on seat_row/seat_row_number
    return allocateOptimalSeats(quantity, availableSeats, blockedSeats);
}

/**
 * Optimized allocation function that requires row/position information
 */
// Removed allocateBestSeatsWithRowInfo – allocation uses seat data directly

/**
 * Allocate seats for multiple seat groups and price categories
 */
export function allocateSeatsForTickets(
    tickets: Array<{
        seatGroup: CompleteSeatGroup;
        quantity: number;
        // Note: price category intentionally ignored for allocation grouping
    }>,
    blockedSeats: string[]
): Map<string, SeatAllocationResult> {
    const results = new Map<string, SeatAllocationResult>();
    const currentlyBlocked = [...blockedSeats];
    
    // Process each ticket type
    for (const ticket of tickets) {
        const key = `${ticket.seatGroup.id}`;
        const result = allocateBestSeats(ticket.seatGroup, ticket.quantity, currentlyBlocked);
        
        if (result.success) {
            // Add allocated seats to blocked list for next iteration
            currentlyBlocked.push(...result.allocatedSeats);
        }
        
        results.set(key, result);
    }
    
    return results;
}

/**
 * Extremely simple allocator for free seat selection shows.
 * - For wheelchair group (name contains 'rollstuhl'): capacity is capped at 25 total (including blocked/reserved)
 * - Picks the next available seat in order of seat.seat_number for each needed seat
 */
export function allocateSeatsFreeMode(
    seatGroup: CompleteSeatGroup,
    quantity: number,
    blockedSeats: string[]
): SeatAllocationResult {
    if (quantity <= 0) {
        return { success: false, allocatedSeats: [], message: 'Invalid quantity' };
    }

    const isWheelchairGroup = seatGroup.name.toLocaleLowerCase().includes('rollstuhl');
    const blocked = new Set(blockedSeats);
    const groupReserved = (seatGroup.reservation_active && Array.isArray(seatGroup.reserved_seats)) ? new Set(seatGroup.reserved_seats) : new Set<string>();

    // Determine allowed seat types
    const allowedTypes = isWheelchairGroup
        ? new Set(["wheelchair", "wheelchair_side", "wheelchair_accompaniment"]) 
        : new Set(["normal"]);

    // Cap wheelchair capacity at 25 total (including blocked/reserved)
    let capacityCap = Infinity;
    if (isWheelchairGroup) {
        const totalAvailableOfType = seatGroup.seats.filter(s => allowedTypes.has(s.type)).length;
        // Seats already unavailable among those types (blocked or reserved)
        const alreadyUnavailable = seatGroup.seats.filter(s => allowedTypes.has(s.type)).filter(s => blocked.has(s.seat_number) || groupReserved.has(s.seat_number)).length;
        const theoreticalCapRemaining = Math.max(0, 25 - alreadyUnavailable);
        capacityCap = Math.min(totalAvailableOfType - alreadyUnavailable, theoreticalCapRemaining);
    }

    const availableSeats = seatGroup.seats
        .filter(s => allowedTypes.has(s.type))
        .filter(s => !blocked.has(s.seat_number) && !groupReserved.has(s.seat_number))
        .sort((a, b) => a.seat_number.localeCompare(b.seat_number));

    const effectiveQuantity = isWheelchairGroup ? Math.min(quantity, capacityCap) : quantity;

    if (availableSeats.length < effectiveQuantity) {
        return {
            success: false,
            allocatedSeats: [],
            message: `Nur ${availableSeats.length} Plätze verfügbar, aber ${effectiveQuantity} angefragt`
        };
    }

    const allocated = availableSeats.slice(0, effectiveQuantity).map(s => s.seat_number);
    return { success: true, allocatedSeats: allocated, message: `${effectiveQuantity} Plätze zugeteilt` };
}