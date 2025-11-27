import type { CompleteSeat } from "../types/pricing";
import type { SeatInfo } from "../components/SeatPlanViewer";

// Row configurations for deriving row information from seat IDs
const ROW_CONFIGURATIONS = [
    { rowNumber: 1, totalSeats: 88, leftSegmentEnd: 44, rightSegmentStart: 45 },
    { rowNumber: 2, totalSeats: 90, leftSegmentEnd: 45, rightSegmentStart: 46 },
    { rowNumber: 3, totalSeats: 92, leftSegmentEnd: 46, rightSegmentStart: 47 },
    { rowNumber: 4, totalSeats: 94, leftSegmentEnd: 47, rightSegmentStart: 48 },
    { rowNumber: 5, totalSeats: 96, leftSegmentEnd: 48, rightSegmentStart: 49 },
];

const DEFAULT_ROW_CONFIG = {
    totalSeats: 98,
    leftSegmentEnd: 49,
    rightSegmentStart: 50
};

export function getSeatDisplayName(seat: CompleteSeat, language: 'de' | 'en'): string {
    let displayName = '';
    let displayNameEn = '';


    switch (seat.type) {
        case "bestplatz":
            displayName = 'Bestplatz';
            displayNameEn = 'Best Seat';
            break;
        case "wheelchair":
            displayName = `Rollstuhlplatz Reihe ${seat.seat_row} / Platz ${seat.seat_row_number}`;
            displayNameEn = `Wheelchair Seat Row ${seat.seat_row} / Seat ${seat.seat_row_number}`;
            break;
        case "wheelchair_side":
            displayName = `Rollstuhlplatz ${seat.seat_row_number}`;
            displayNameEn = `Wheelchair Seat ${seat.seat_row_number}`;
            break;
        case "wheelchair_accompaniment":
            displayName = `Rollstuhlbegleitung Platz ${seat.seat_row_number}`;
            displayNameEn = 'Wheelchair Accompaniment Seat ' + seat.seat_row_number;
            break;
        default:
            displayName = `Reihe ${seat.seat_row} / Platz ${seat.seat_row_number}`;
            displayNameEn = `Row ${seat.seat_row} / Seat ${seat.seat_row_number}`;
    }

    return language === 'de' ? displayName : displayNameEn;
}

export function getSeatDisplayNameWithSeatGroupName(seat: CompleteSeat, seatGroupName: string, language: 'de' | 'en'): string {
    let displayName = '';
    let displayNameEn = '';


    switch (seat.type) {
        case "bestplatz":
            displayName = 'Bestplatz';
            displayNameEn = 'Best Seat';
            break;
        case "wheelchair":
            displayName = `Rollstuhlplatz Reihe ${seat.seat_row} / Platz ${seat.seat_row_number}`;
            displayNameEn = `Wheelchair Seat Row ${seat.seat_row} / Seat ${seat.seat_row_number}`;
            break;
        case "wheelchair_side":
            displayName = `Rollstuhlplatz ${seat.seat_row_number}`;
            displayNameEn = `Wheelchair Seat ${seat.seat_row_number}`;
            break;
        case "wheelchair_accompaniment":
            displayName = `Rollstuhlbegleitung Platz ${seat.seat_row_number}`;
            displayNameEn = 'Wheelchair Accompaniment Seat ' + seat.seat_row_number;
            break;
        default:
            displayName = `${seatGroupName} / Reihe ${seat.seat_row} / Platz ${seat.seat_row_number}`;
            displayNameEn = `${seatGroupName} / Row ${seat.seat_row} / Seat ${seat.seat_row_number}`;
    }

    return language === 'de' ? displayName : displayNameEn;
}

export function getTicketRowAndSeat(ticketSeat: CompleteSeat): [string, string] {
    let row = '';
    let seat = '';

    switch (ticketSeat.type) {
        case "wheelchair":
            row = ticketSeat.seat_row.toString();
            seat = `R-${ticketSeat.seat_row_number}`;
            break;
        case "wheelchair_side":
            row = '';
            seat = ticketSeat.seat_row_number.toString();
            break;
        case "wheelchair_accompaniment":
            row = '';
            seat = ticketSeat.seat_row_number.toString();
            break;
        default:
            row = ticketSeat.seat_row.toString();
            seat = ticketSeat.seat_row_number.toString();
            break;
    }


    return [row, seat];
}


export function getSeatInfoDisplayNameWithSeatGroupName(seat: SeatInfo, seatGroupName: string, language: 'de' | 'en'): string {
    let displayName = '';
    let displayNameEn = '';


    switch (seat.type) {
        case "wheelchair":
            displayName = `Rollstuhlplatz Reihe ${seat.seat_row} / Platz ${seat.seat_row_number}`;
            displayNameEn = `Wheelchair Seat Row ${seat.seat_row} / Seat ${seat.seat_row_number}`;
            break;
        case "wheelchair_side":
            displayName = `Rollstuhlplatz ${seat.seat_row_number}`;
            displayNameEn = `Wheelchair Seat ${seat.seat_row_number}`;
            break;
        case "wheelchair_accompaniment":
            displayName = `Rollstuhlbegleitung Platz ${seat.seat_row_number}`;
            displayNameEn = 'Wheelchair Accompaniment Seat ' + seat.seat_row_number;
            break;
        default:
            displayName = `${seatGroupName} / Reihe ${seat.seat_row} / Platz ${seat.seat_row_number}`;
            displayNameEn = `${seatGroupName} / Row ${seat.seat_row} / Seat ${seat.seat_row_number}`;
    }

    return language === 'de' ? displayName : displayNameEn;
}
