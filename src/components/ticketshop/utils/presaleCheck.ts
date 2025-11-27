import type { EventShowData } from '../types/eventShow';

/**
 * Checks if presale has started for a given show
 * @param show - The show data containing presale_start field
 * @returns true if presale has started, false otherwise
 */
export function isPresaleStarted(show: EventShowData): boolean {
    if (!show.presale_start) {
        // If no presale_start is defined, assume presale is always available
        return true;
    }

    const now = new Date();
    const presaleStart = new Date(show.presale_start);
    
    // Compare UTC times directly - presale_start is now properly stored as UTC
    return now >= presaleStart;
}

/**
 * Gets the formatted presale start date for display
 * @param show - The show data containing presale_start field
 * @param language - The language for formatting ('de' | 'en')
 * @returns Formatted date string or null if no presale_start
 */
export function getPresaleStartDate(show: EventShowData, language: 'de' | 'en' = 'de'): string | null {
    if (!show.presale_start) {
        return null;
    }

    const presaleStart = new Date(show.presale_start);
    
    // Display the presale time in German timezone (since it's now properly stored as UTC)
    const displayDate = presaleStart.toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Europe/Berlin'
    });
    
    const displayTime = presaleStart.toLocaleTimeString(language === 'de' ? 'de-DE' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin'
    });

    return `${displayDate} um ${displayTime} Uhr`;
}

/**
 * Gets the time remaining until presale starts
 * @param show - The show data containing presale_start field
 * @returns Object with days, hours, minutes remaining or null if presale already started
 */
export function getTimeUntilPresale(show: EventShowData): { days: number; hours: number; minutes: number } | null {
    if (!show.presale_start) {
        return null;
    }

    const now = new Date();
    const presaleStart = new Date(show.presale_start);
    
    // Compare UTC times directly - presale_start is now properly stored as UTC
    if (now >= presaleStart) {
        return null; // Presale already started
    }

    const diffMs = presaleStart.getTime() - now.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
}
